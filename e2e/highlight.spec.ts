import { expect, test } from '@playwright/test';
import type {} from './browser-entry';
test.beforeEach(async ({ page }) => {
  await page.goto('/fixture');
});
test('highlight and clear preserve native forms, editors, styles, scripts, SVG and host-owned class collisions', async ({ page }) => {
  await page.locator('#draft').fill('unsaved needle draft');
  const before = await page.locator('#host').innerHTML();
  await page.evaluate(() => {
    window.review.clearHighlights(document.body);
    window.review.applyHighlight(document.body, 'needle');
  });
  await expect(page.locator('#copy mark')).toHaveText('needle');
  await expect(page.locator('#copy')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(page.locator('#draft')).toHaveValue('unsaved needle draft');
  for (const selector of ['#host-style', '#draft', '#editor', '#select', '#host-script', 'svg']) {
    expect(await page.locator(selector + ' mark').count()).toBe(0);
  }
  await page.evaluate(() => window.review.clearHighlights(document.body));
  expect(await page.locator('#host').innerHTML()).toBe(before);
  await expect(page.locator('#copy')).toHaveText('needle a(b) plain');
});
test('cleanup preserves controls inserted into owned marks by the page', async ({ page }) => {
  await page.evaluate(() => {
    window.review.applyHighlight(document.body, 'a(b)');
    const mark = document.querySelector('#copy mark');
    const input = document.createElement('input');
    input.id = 'new-input';
    input.value = 'unsaved';
    mark?.append(input);
    window.review.clearHighlights(document.body);
  });
  await expect(page.locator('#new-input')).toHaveValue('unsaved');
});
test('dense cleanup normalizes each parent once', async ({ page }) => {
  const result = await page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'x '.repeat(1000);
    document.body.append(p);
    window.review.applyHighlight(p, 'x');
    let calls = 0;
    let work = 0;
    p.normalize = () => {
      calls++;
      work += p.childNodes.length;
      Node.prototype.normalize.call(p);
    };
    window.review.clearHighlights(p);
    return { calls, work, children: p.childNodes.length, text: p.textContent };
  });
  expect(result.calls).toBe(1);
  expect(result.work).toBeLessThanOrEqual(2000);
  expect(result.children).toBe(1);
  expect(result.text).toBe('x '.repeat(1000));
});
test('URL-only history navigation is detected; disposal removes timers and listeners', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => {
    let calls = 0;
    const dispose = window.review.observeNavigation(window, () => {
      calls++;
      document.body.dataset.calls = String(calls);
    });
    Object.assign(window, { stopReviewNavigation: dispose });
    history.pushState({}, '', '/route/one');
  });
  await page.clock.fastForward(1000);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
  await page.evaluate(() => {
    (window as unknown as { stopReviewNavigation(): void }).stopReviewNavigation();
    history.pushState({}, '', '/route/two');
  });
  await page.clock.fastForward(2000);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
});

test('oversized highlights fail before changing the document', async ({ page }) => {
  const result = await page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'x '.repeat(10001);
    document.body.append(p);
    let error = '';
    try {
      window.review.applyHighlight(p, 'x');
    } catch (cause) {
      error = cause instanceof Error ? cause.message : '';
    }
    return { error, marks: p.querySelectorAll('mark').length, text: p.textContent };
  });
  expect(result.error).toContain('Too many matches');
  expect(result.marks).toBe(0);
  expect(result.text).toBe('x '.repeat(10001));
});

test('nested affected parents normalize disjoint subtrees once', async ({ page }) => {
  const calls = await page.evaluate(() => {
    const root = document.createElement('div');
    let leaf: HTMLElement = root;
    for (let i = 0;i < 1000;i++) {
      leaf.append(document.createTextNode('needle'));
      const child = document.createElement('span');
      leaf.append(child);
      leaf = child;
    }
    leaf.textContent = 'needle';
    document.body.append(root);
    window.review.applyHighlight(root, 'needle');
    const original = Node.prototype.normalize;
    let calls = 0;
    Node.prototype.normalize = function() {
      calls++;
      original.call(this);
    };
    try {
      window.review.clearHighlights(root);
    } finally {
      Node.prototype.normalize = original;
    }
    return calls;
  });
  expect(calls).toBe(1);
});

test('hidden navigation pauses polling and coalesces changes when visible again', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => {
    const intervals = new Set<number>();
    const set = window.setInterval.bind(window);
    const clear = window.clearInterval.bind(window);
    window.setInterval = ((...args: Parameters<typeof window.setInterval>) => {
      const id = set(...args);
      intervals.add(id);
      return id;
    }) as typeof window.setInterval;
    window.clearInterval = ((id?: number) => {
      if (id !== undefined) intervals.delete(id);
      clear(id);
    }) as typeof window.clearInterval;
    let calls = 0;
    const dispose = window.review.observeNavigation(window, () => {
      document.body.dataset.calls = String(++calls);
      document.body.dataset.url = location.pathname;
    });
    Object.assign(window, { navigationTest: { dispose, intervals } });
    history.pushState({}, '', '/route/pending');
  });
  await page.clock.fastForward(500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    history.pushState({}, '', '/route/hidden');
  });
  const intervalCount = () =>
    page.evaluate(() => (window as unknown as { navigationTest: { intervals: Set<number> } }).navigationTest.intervals.size);
  expect(await intervalCount()).toBe(0);
  await page.clock.fastForward(5000);
  await expect(page.locator('body')).not.toHaveAttribute('data-calls');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await intervalCount()).toBe(1);
  await page.clock.fastForward(250);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
  await expect(page.locator('body')).toHaveAttribute('data-url', '/route/hidden');
  await page.evaluate(() => (window as unknown as { navigationTest: { dispose(): void } }).navigationTest.dispose());
  expect(await intervalCount()).toBe(0);
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
    history.pushState({}, '', '/route/disposed');
  });
  await page.clock.fastForward(1000);
  expect(await intervalCount()).toBe(0);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
});

test('pagehide cancels pending analysis and pageshow catches up once', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => {
    let calls = 0;
    window.review.observeNavigation(window, () => {
      document.body.dataset.calls = String(++calls);
    });
    history.pushState({}, '', '/route/pending');
  });
  await page.clock.fastForward(500);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.clock.fastForward(1000);
  await expect(page.locator('body')).not.toHaveAttribute('data-calls');
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    history.pushState({}, '', '/route/paused');
  });
  await page.clock.fastForward(1000);
  await expect(page.locator('body')).not.toHaveAttribute('data-calls');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.clock.fastForward(250);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
  await page.clock.fastForward(1000);
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
});
