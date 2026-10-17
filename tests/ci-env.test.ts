import { expect, test } from 'bun:test';
import { appendCIEnv } from '../build/ci-env';

test('CI environment entries preserve prior values and reject injected lines', async () => {
  const path = `${Bun.env.TMPDIR ?? '/tmp'}/bun-extension-env-${crypto.randomUUID()}`;
  try {
    await Bun.write(path, 'EXISTING=kept');
    await appendCIEnv('ZIP', 'extension-v0.2.0.zip', path);
    const expected = 'EXISTING=kept\nZIP=extension-v0.2.0.zip\n';
    expect(await Bun.file(path).text()).toBe(expected);
    await expect(appendCIEnv('ZIP', 'archive.zip\nINJECTED=value', path)).rejects.toThrow('Invalid CI environment entry');
    await expect(appendCIEnv('ZIP\rINJECTED', 'archive.zip', path)).rejects.toThrow('Invalid CI environment entry');
    expect(await Bun.file(path).text()).toBe(expected);
  } finally {
    await Bun.file(path).delete();
  }
});
