import { $ } from 'bun';
import { appendCIEnv } from './ci-env';

// Playwright 1.31.2 pins Chromium 111.0.5563.19 to revision 1048.
const platforms: Record<string, { archive: string, executable: string }> = {
  linux: { archive: 'chromium-linux.zip', executable: 'chrome-linux/chrome' },
  mac: { archive: 'chromium-mac.zip', executable: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium' },
  'mac-arm64': { archive: 'chromium-mac-arm64.zip', executable: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium' }
};
const platform = platforms[Bun.argv[2] ?? 'linux'];
if (!platform) throw new Error('Choose a Chromium 111 archive: linux, mac, or mac-arm64');
const root = Bun.env.RUNNER_TEMP ?? Bun.fileURLToPath(new URL('../.cache', import.meta.url));
const destination = `${root}/chromium-111`;
const archive = `${destination}.zip`;
for (let attempt = 1;attempt <= 3;attempt++) {
  try {
    const response = await fetch(`https://playwright-akamai.azureedge.net/builds/chromium/1048/${platform.archive}`, {
      signal: AbortSignal.timeout(120_000)
    });
    if (!response.ok) throw new Error(`Browser download failed: HTTP ${response.status}`);
    await Bun.write(archive, response, { createPath: true });
    break;
  } catch (error) {
    if (attempt === 3) throw error;
    await Bun.sleep(attempt * 1000);
  }
}
await $`unzip -q -o ${archive} -d ${destination}`;
const executable = `${destination}/${platform.executable}`;
if (!await Bun.file(executable).exists()) throw new Error('The browser archive did not contain the expected executable');
await appendCIEnv('COMPAT_CHROMIUM_EXECUTABLE', executable);
console.log(`COMPAT_CHROMIUM_EXECUTABLE=${executable}`);
