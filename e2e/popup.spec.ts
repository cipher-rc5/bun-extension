import { expect, type Page, test } from '@playwright/test';
import type {} from './browser-entry';

async function mockPopup(page: Page, options = { hold: false, failRead: false }) {
  await page.addInitScript(({ hold, failRead }) => {
    let release!: () => void;
    const read = new Promise<void>(resolve => {
      release = resolve;
    });
    window.reviewPopup = { count: 10, writes: [], failWrite: false, failRead, release };
    if (typeof chrome === 'undefined') Object.defineProperty(window, 'chrome', { value: {}, configurable: true });
    Object.assign(chrome, {
      tabs: { query: async () => [{ title: 'Example', url: 'https://example.test' }] },
      runtime: {
        async sendMessage(request: { action: string }) {
          if (request.action === 'getCounter') {
            if (hold) await read;
            if (window.reviewPopup.failRead) return { ok: false, error: 'Storage unavailable' };
          } else {
            if (window.reviewPopup.failWrite) {
              return { ok: false, error: 'Storage quota exceeded' };
            }
            window.reviewPopup.count = request.action === 'resetCounter' ? 0 : window.reviewPopup.count + 1;
            window.reviewPopup.writes.push(window.reviewPopup.count);
          }
          return { ok: true, action: request.action, data: { count: window.reviewPopup.count } };
        }
      }
    });
  }, options);
  await page.goto('/popup');
}
test('counter stays disabled until hydration; stored count is never overwritten by zero', async ({ page }) => {
  await mockPopup(page, { hold: true, failRead: false });
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled();
  await page.evaluate(() => window.reviewPopup.release());
  await expect(page.getByLabel('Click count')).toHaveText('10');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Click count')).toHaveText('11');
  expect(await page.evaluate(() => window.reviewPopup.writes)).toEqual([11]);
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCSS('background-color', 'rgb(37, 99, 235)');
});
test('failed writes leave the saved count visible and expose an actionable error', async ({ page }) => {
  await mockPopup(page);
  await expect(page.getByLabel('Click count')).toHaveText('10');
  await page.evaluate(() => {
    window.reviewPopup.failWrite = true;
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Storage quota exceeded');
  await expect(page.getByLabel('Click count')).toHaveText('10');
  await page.evaluate(() => {
    window.reviewPopup.failWrite = false;
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Click count')).toHaveText('11');
});
test('failed hydration supports retry and explicit reset repairs corrupt state', async ({ page }) => {
  await mockPopup(page, { hold: false, failRead: true });
  await expect(page.getByRole('alert')).toHaveText('Storage unavailable');
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await page.evaluate(() => {
    window.reviewPopup.failRead = false;
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Click count')).toHaveText('10');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByLabel('Click count')).toHaveText('0');
});
