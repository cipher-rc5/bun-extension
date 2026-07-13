// Pure-ish DOM highlight helpers, extracted from the content script so the
// highlight decision can be unit-tested without chrome and with only a minimal
// fake DOM. The walk is a recursive childNodes traversal (no createTreeWalker)
// so a tiny fake DOM suffices.
import { splitForHighlight } from './text';

// Minimal structural views of the DOM nodes these helpers touch. Real DOM nodes
// satisfy these, and so can a small hand-written fake in tests.
export interface HighlightNode {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<HighlightNode>;
  parentNode: HighlightNode | null;
  replaceChild(newChild: HighlightNode, oldChild: HighlightNode): HighlightNode;
  normalize?: () => void;
}

export interface HighlightDocument {
  createElement(tagName: string): HighlightElement;
  createTextNode(data: string): HighlightNode;
  createDocumentFragment(): HighlightNode & { appendChild(child: HighlightNode): HighlightNode };
}

export interface HighlightElement extends HighlightNode {
  className: string;
  style: { [key: string]: string };
  appendChild(child: HighlightNode): HighlightNode;
}

// DOM nodeType constants (avoids relying on the Node global in tests).
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const HIGHLIGHT_CLASS = 'extension-highlight';

// Collect text nodes under `root` whose text contains `term` (case-insensitive).
function collectMatchingTextNodes(root: HighlightNode, lowerTerm: string): HighlightNode[] {
  const matches: HighlightNode[] = [];

  const visit = (node: HighlightNode) => {
    if (node.nodeType === TEXT_NODE) {
      const text = node.textContent;
      if (text && text.toLowerCase().includes(lowerTerm)) {
        matches.push(node);
      }
      return;
    }

    const children = node.childNodes;
    for (let i = 0;i < children.length;i++) {
      const child = children[i];
      if (child) visit(child);
    }
  };

  visit(root);
  return matches;
}

// Wrap every case-insensitive occurrence of `term` under `root` in a
// <mark class="extension-highlight">. No-op for an empty/whitespace term.
// `doc` defaults to the ambient `document` so callers can omit it in the browser.
export function applyHighlight(root: HighlightNode, term: string, doc: HighlightDocument = document as unknown as HighlightDocument): void {
  if (!term.trim()) return;

  const lowerTerm = term.toLowerCase();
  const textNodes = collectMatchingTextNodes(root, lowerTerm);

  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;

    const text = textNode.textContent || '';
    const parts = splitForHighlight(text, term);

    const fragment = doc.createDocumentFragment();

    parts.forEach(part => {
      if (part.mark) {
        const mark = doc.createElement('mark');
        mark.className = HIGHLIGHT_CLASS;
        mark.style.backgroundColor = '#ffeb3b';
        mark.style.padding = '1px 2px';
        mark.style.borderRadius = '2px';
        mark.textContent = part.text;
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(doc.createTextNode(part.text));
      }
    });

    parent.replaceChild(fragment, textNode);
  });
}

// Restore text wrapped by applyHighlight: replace each highlight mark under
// `root` with a plain text node and merge adjacent text nodes.
export function clearHighlights(root: HighlightNode, doc: HighlightDocument = document as unknown as HighlightDocument): void {
  const highlights: HighlightElement[] = [];

  const visit = (node: HighlightNode) => {
    if (node.nodeType === ELEMENT_NODE) {
      const el = node as HighlightElement;
      if (el.className === HIGHLIGHT_CLASS) {
        highlights.push(el);
        return;
      }
    }

    const children = node.childNodes;
    for (let i = 0;i < children.length;i++) {
      const child = children[i];
      if (child) visit(child);
    }
  };

  visit(root);

  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (!parent) return;
    parent.replaceChild(doc.createTextNode(highlight.textContent || ''), highlight);
    if (parent.normalize) parent.normalize();
  });
}
