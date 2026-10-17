import { chromium, expect, test } from '@playwright/test';
test('installed MV3 extension persists counters, handles content messages and URL-only navigation, and preserves alarms across worker restart', async () => {
  const extension = Bun.fileURLToPath(new URL('../dist', import.meta.url));
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  try {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await worker.evaluate(() => chrome.storage.sync.set({ count: 10 }));
    const content = await context.newPage();
    await content.goto('http://127.0.0.1:4173/fixture');
    await expect.poll(async () =>
      worker.evaluate(async () =>
        ((await chrome.storage.local.get('lastPageAnalysis')).lastPageAnalysis as { data?: { url?: string } } | undefined)?.data?.url
      )
    ).toBe(content.url());
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/index.html`);
    await expect(popup.getByLabel('Click count')).toHaveText('10');
    expect(await popup.evaluate(() => chrome.runtime.sendMessage({ action: 'pageAnalyzed', data: {} }))).toEqual({
      ok: false,
      error: 'Invalid background message'
    });
    await popup.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(popup.getByLabel('Click count')).toHaveText('11');
    await popup.reload();
    await expect(popup.getByLabel('Click count')).toHaveText('11');
    const secondPopup = await context.newPage();
    await secondPopup.goto(`chrome-extension://${id}/index.html`);
    await expect(secondPopup.getByLabel('Click count')).toHaveText('11');
    const replies: unknown[] = await Promise.all([
      popup.evaluate(() => chrome.runtime.sendMessage({ action: 'incrementCounter' })),
      secondPopup.evaluate(() => chrome.runtime.sendMessage({ action: 'incrementCounter' }))
    ]);
    expect(replies).toContainEqual({ ok: true, action: 'incrementCounter', data: { count: 12 } });
    expect(replies).toContainEqual({ ok: true, action: 'incrementCounter', data: { count: 13 } });
    await content.bringToFront();
    const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id);
    if (tabId === undefined) throw new Error('Missing content tab');
    const response: unknown = await worker.evaluate(id => chrome.tabs.sendMessage(id, { action: 'highlightText', text: 'needle' }), tabId);
    expect(response).toEqual({ ok: true, action: 'highlightText', data: null });
    await expect(content.locator('#copy mark')).toHaveText('needle');
    await expect(content.locator('#draft')).toHaveValue('needle');
    await expect(content.locator('#host-input')).toHaveValue('draft');
    await content.evaluate(() => history.pushState({}, '', '/route/without-mutation'));
    await expect.poll(async () =>
      worker.evaluate(async () =>
        ((await chrome.storage.local.get('lastPageAnalysis')).lastPageAnalysis as { data?: { url?: string } } | undefined)?.data?.url
      )
    ).toBe(content.url());
    const alarmBefore = await worker.evaluate(async () => (await chrome.alarms.get('cleanup'))?.scheduledTime);
    expect(alarmBefore).toBeDefined();
    const cdp = await context.newCDPSession(content);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    await popup.reload();
    await expect(popup.getByLabel('Click count')).toHaveText('13');
    const alarmAfter = await worker.evaluate(async () => (await chrome.alarms.get('cleanup'))?.scheduledTime);
    expect(alarmAfter).toBe(alarmBefore);
  } finally {
    await context.close();
  }
});
