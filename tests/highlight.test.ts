import { describe, expect, test } from 'bun:test';
import type { HighlightDocument, HighlightElement, HighlightNode } from '../src/lib/highlight';
import { applyHighlight, clearHighlights } from '../src/lib/highlight';

// Minimal DOM model for traversal and mutation tests; e2e tests cover native behavior.

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const FRAGMENT_NODE = 11;

class FakeText implements HighlightNode {
  nodeType = TEXT_NODE;
  textContent: string;
  parentNode: HighlightNode | null = null;
  constructor (data: string) {
    this.textContent = data;
  }
  get childNodes(): FakeNode[] {
    return [];
  }
  replaceChild(): HighlightNode {
    throw new Error('text node has no children');
  }
}

class FakeElement implements HighlightElement {
  nodeType = ELEMENT_NODE;
  tagName: string;
  className = '';
  style: { [key: string]: string } = {};
  parentNode: HighlightNode | null = null;
  children: FakeNode[] = [];
  constructor (tagName: string) {
    this.tagName = tagName;
  }
  get childNodes(): FakeNode[] {
    return this.children;
  }
  get textContent(): string {
    return this.children.map(c => c.textContent || '').join('');
  }
  set textContent(value: string) {
    this.children = [];
    this.appendChild(new FakeText(value));
  }
  appendChild(child: FakeNode): FakeNode {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChild(newChild: FakeNode, oldChild: FakeNode): FakeNode {
    const index = this.children.indexOf(oldChild);
    if (index === -1) throw new Error('oldChild not found');
    // A fragment splices its own children in place of oldChild.
    if (newChild.nodeType === FRAGMENT_NODE) {
      const frag = newChild as FakeFragment;
      const moved = frag.children.slice();
      moved.forEach(c => (c.parentNode = this));
      this.children.splice(index, 1, ...moved);
      frag.children = [];
    } else {
      newChild.parentNode = this;
      this.children.splice(index, 1, newChild);
    }
    oldChild.parentNode = null;
    return oldChild;
  }
  // Merge adjacent text nodes, mirroring Node.normalize().
  normalize(): void {
    const merged: FakeNode[] = [];
    for (const child of this.children) {
      const last = merged[merged.length - 1];
      if (child.nodeType === TEXT_NODE && last && last.nodeType === TEXT_NODE) {
        (last as FakeText).textContent += child.textContent || '';
      } else {
        merged.push(child);
      }
    }
    this.children = merged;
  }
}

class FakeFragment implements HighlightNode {
  nodeType = FRAGMENT_NODE;
  textContent: string | null = null;
  parentNode: HighlightNode | null = null;
  children: FakeNode[] = [];
  get childNodes(): FakeNode[] {
    return this.children;
  }
  appendChild(child: FakeNode): FakeNode {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChild(): HighlightNode {
    throw new Error('fragment replaceChild unused');
  }
}

type FakeNode = FakeText | FakeElement | FakeFragment;

const fakeDoc: HighlightDocument = {
  createElement: (tagName: string) => new FakeElement(tagName),
  createTextNode: (data: string) => new FakeText(data),
  createDocumentFragment: () => new FakeFragment()
};

function buildTree(text: string): { root: FakeElement } {
  const root = new FakeElement('div');
  const p = new FakeElement('p');
  p.appendChild(new FakeText(text));
  root.appendChild(p);
  return { root };
}

function findByClass(node: FakeNode, className: string): FakeElement | null {
  if (node.nodeType === ELEMENT_NODE && (node as FakeElement).className === className) {
    return node as FakeElement;
  }
  for (const child of node.childNodes) {
    const found = findByClass(child as FakeNode, className);
    if (found) return found;
  }
  return null;
}

describe('applyHighlight / clearHighlights DOM round-trip', () => {
  test('wraps a matching term in a mark.extension-highlight', () => {
    const { root } = buildTree('the quick brown fox');
    applyHighlight(root, 'quick', fakeDoc);

    const mark = findByClass(root, 'extension-highlight');
    expect(mark).not.toBeNull();
    expect(mark!.tagName).toBe('mark');
    expect(mark!.textContent).toBe('quick');
    expect(root.textContent).toBe('the quick brown fox');
  });

  test('clearHighlights restores the original text', () => {
    const { root } = buildTree('the quick brown fox');
    applyHighlight(root, 'quick', fakeDoc);
    clearHighlights(root, fakeDoc);

    expect(findByClass(root, 'extension-highlight')).toBeNull();
    expect(root.textContent).toBe('the quick brown fox');
    // After normalize, the paragraph holds a single merged text node.
    const p = root.children[0] as FakeElement;
    expect(p.children.length).toBe(1);
    expect(p.children[0]?.nodeType).toBe(TEXT_NODE);
  });

  test('a term with regex metacharacters highlights literally', () => {
    const { root } = buildTree('call a(b) now');
    applyHighlight(root, 'a(b)', fakeDoc);

    const mark = findByClass(root, 'extension-highlight');
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe('a(b)');
    expect(root.textContent).toBe('call a(b) now');
  });

  test('no match leaves the DOM unchanged', () => {
    const { root } = buildTree('nothing to see');
    const p = root.children[0] as FakeElement;
    const originalTextNode = p.children[0];

    applyHighlight(root, 'zzz', fakeDoc);

    expect(findByClass(root, 'extension-highlight')).toBeNull();
    expect(p.children.length).toBe(1);
    expect(p.children[0]).toBe(originalTextNode);
    expect(root.textContent).toBe('nothing to see');
  });

  test('empty term is a no-op', () => {
    const { root } = buildTree('leave me alone');
    applyHighlight(root, '   ', fakeDoc);
    expect(findByClass(root, 'extension-highlight')).toBeNull();
    expect(root.textContent).toBe('leave me alone');
  });

  test('case-insensitive match preserves original casing', () => {
    const { root } = buildTree('Hello WORLD');
    applyHighlight(root, 'world', fakeDoc);
    const mark = findByClass(root, 'extension-highlight');
    expect(mark!.textContent).toBe('WORLD');
  });
});

test('iterative highlighting handles deep documents without overflowing the call stack', () => {
  const root = new FakeElement('div');
  let leaf = root;
  for (let i = 0;i < 20000;i++) {
    const child = new FakeElement('div');
    leaf.appendChild(child);
    leaf = child;
  }
  leaf.appendChild(new FakeText('deep needle'));
  applyHighlight(root, 'needle', fakeDoc);
  expect(leaf.children.some(node => node instanceof FakeElement && node.tagName === 'mark')).toBe(true);
  clearHighlights(root, fakeDoc);
  expect(leaf.textContent).toBe('deep needle');
});

test('highlight planning reads each matching text node once', () => {
  const { root } = buildTree('needle needle');
  const paragraph = root.children[0] as FakeElement;
  const text = paragraph.children[0]!;
  let reads = 0;
  Object.defineProperty(text, 'textContent', {
    get: () => {
      reads++;
      return 'needle needle';
    }
  });
  applyHighlight(root, 'needle', fakeDoc);
  expect(reads).toBe(1);
  expect(paragraph.children.filter(node => node instanceof FakeElement && node.tagName === 'mark')).toHaveLength(2);
});

test('wide trees reject before queuing children or mutating the document', () => {
  const root = new FakeElement('div');
  let indexed = false;
  Object.defineProperty(root, 'childNodes', {
    value: new Proxy({ length: 200001 }, {
      get(target, property) {
        if (property === 'length') return target.length;
        indexed = true;
        throw new Error('Child was queued');
      }
    })
  });
  expect(() => applyHighlight(root, 'needle', fakeDoc)).toThrow('Page is too large');
  expect(indexed).toBe(false);
});

test('match budgets apply across nodes before any marks are inserted', () => {
  const root = new FakeElement('div');
  const first = new FakeText('x '.repeat(5000));
  const second = new FakeText('x '.repeat(5001));
  root.appendChild(first);
  root.appendChild(second);
  expect(() => applyHighlight(root, 'x', fakeDoc)).toThrow('Too many matches');
  expect(root.children).toEqual([first, second]);
});

test('cleanup without owned marks traverses once and does not normalize', () => {
  const root = new FakeElement('div');
  let reads = 0;
  Object.defineProperty(root, 'childNodes', {
    get: () => {
      reads++;
      return [];
    }
  });
  root.normalize = () => {
    throw new Error('Unexpected normalization');
  };
  clearHighlights(root, fakeDoc);
  expect(reads).toBe(1);
});
