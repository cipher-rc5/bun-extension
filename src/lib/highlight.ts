import { createHighlightSplitter, type HighlightPart } from './text';
// Structural DOM types keep helper tests independent of browser globals.
export interface HighlightNode {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<HighlightNode>;
  parentNode: HighlightNode | null;
  replaceChild(newChild: HighlightNode, oldChild: HighlightNode): HighlightNode;
  normalize?: () => void;
}
export interface HighlightElement extends HighlightNode {
  className: string;
  tagName?: string;
  namespaceURI?: string | null;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
  style: { [key: string]: string };
  appendChild(child: HighlightNode): HighlightNode;
}
export interface HighlightDocument {
  createElement(tagName: string): HighlightElement;
  createTextNode(data: string): HighlightNode;
  createDocumentFragment(): HighlightNode & { appendChild(child: HighlightNode): HighlightNode };
}
const ownedMarks = new WeakSet<HighlightNode>();
const excludedTags = new Set([
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'OBJECT',
  'EMBED'
]);
function excluded(node: HighlightNode): boolean {
  if (node.nodeType !== 1) return false;
  const el = node as HighlightElement;
  const editable = el.getAttribute?.('contenteditable');
  return excludedTags.has(el.tagName?.toUpperCase() ?? '') || el.isContentEditable === true ||
    (editable !== null && editable !== undefined && editable.toLowerCase() !== 'false') ||
    (!!el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml');
}
/** Iterative traversal avoids stack overflow on deeply nested host documents. */
function walk(root: HighlightNode, visit: (node: HighlightNode) => boolean, limit = Infinity): void {
  const stack = [root];
  let visited = 0;
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (++visited > limit) throw new Error('Page is too large to highlight safely');
    if (!visit(node)) continue;
    const children = node.childNodes;
    // Account for queued siblings before allocating a wider traversal stack.
    if (visited + stack.length + children.length > limit) throw new Error('Page is too large to highlight safely');
    for (let i = children.length - 1;i >= 0;i--) {
      const child = children[i];
      if (child) stack.push(child);
    }
  }
}
/** Highlight safe text only; never rewrite raw-text, form, or editable subtrees. */
export function applyHighlight(root: HighlightNode, term: string, doc: HighlightDocument = document as unknown as HighlightDocument): void {
  if (!term.trim()) return;
  if (term.length > 1000) throw new Error('Search text is too long');
  for (let node: HighlightNode | null = root;node;node = node.parentNode) if (excluded(node)) return;
  const matches: { node: HighlightNode, parts: HighlightPart[] }[] = [];
  const split = createHighlightSplitter(term);
  let count = 0;
  let textSize = 0;
  walk(root, node => {
    if (excluded(node) || ownedMarks.has(node)) return false;
    if (node.nodeType === 3) {
      const text = node.textContent ?? '';
      if ((textSize += text.length) > 2000000) throw new Error('Page is too large to highlight safely');
      const parts = split(text, 10000 - count);
      if (parts) {
        for (const part of parts) if (part.mark) count++;
        matches.push({ node, parts });
      }
    }
    return node.nodeType !== 3;
  }, 200000);
  // Validate and plan all matches before mutating the host document.
  for (const { node, parts } of matches) {
    if (!node.parentNode) continue;
    const fragment = doc.createDocumentFragment();
    for (const part of parts) {
      if (part.mark) {
        const mark = doc.createElement('mark');
        mark.className = 'extension-highlight';
        mark.style.backgroundColor = '#ffeb3b';
        mark.style.color = '#111827';
        mark.textContent = part.text;
        ownedMarks.add(mark);
        fragment.appendChild(mark);
      } else fragment.appendChild(doc.createTextNode(part.text));
    }
    node.parentNode.replaceChild(fragment, node);
  }
}
/** Unwrap our own marks, preserving any children the page inserted meanwhile. */
export function clearHighlights(root: HighlightNode, doc: HighlightDocument = document as unknown as HighlightDocument): void {
  const normalizationRoot = ownedMarks.has(root) ? root.parentNode ?? root : root;
  const marks: HighlightNode[] = [];
  walk(root, node => {
    if (ownedMarks.has(node)) marks.push(node);
    return true;
  });
  if (!marks.length) return;
  const parents = new Set<HighlightNode>();
  for (const mark of marks.reverse()) {
    const parent = mark.parentNode;
    if (!parent) continue;
    const fragment = doc.createDocumentFragment();
    for (const child of Array.from(mark.childNodes)) fragment.appendChild(child);
    parent.replaceChild(fragment, mark);
    ownedMarks.delete(mark);
    parents.add(parent);
  }
  // normalize() visits descendants; skip subtrees already covered by a parent.
  walk(normalizationRoot, node => {
    if (!parents.has(node)) return true;
    node.normalize?.();
    return false;
  });
}
