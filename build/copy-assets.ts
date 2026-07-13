// copy-assets.ts
import { $ } from 'bun';

async function ensureDir(path: string): Promise<void> {
  await $`mkdir -p ${path}`;
}

async function copyIfExists(src: string, dest: string, label: string): Promise<void> {
  const sourceFile = Bun.file(src);
  if (!(await sourceFile.exists())) return;

  const directory = dest.split('/').slice(0, -1).join('/');
  if (directory) await ensureDir(directory);

  await Bun.write(dest, sourceFile);
  console.log(`✓ Copied ${label}`);
}

// Copy the manifest, popup HTML, and PNG icons into dist/. Throws on failure so
// the caller (build-all.ts, or the standalone runner below) aborts the build.
export async function copyAssets(): Promise<void> {
  await ensureDir('dist/assets');

  await copyIfExists('src/manifest.json', 'dist/manifest.json', 'manifest.json');
  await copyIfExists('src/popup/index.html', 'dist/index.html', 'index.html');

  const iconSizes = ['16', '32', '48', '128'];
  const anyIcon = (await Promise.all(iconSizes.map(size => Bun.file(`src/assets/icon${size}.png`).exists()))).some(Boolean);
  if (!anyIcon) {
    console.warn('⚠ No icon files found in src/assets/. You may want to add icons later.');
    return;
  }

  await Promise.all(iconSizes.map(size => copyIfExists(`src/assets/icon${size}.png`, `dist/assets/icon${size}.png`, `icon${size}.png`)));
}

// Run standalone only when invoked directly (e.g. `bun run build/copy-assets.ts`).
if (import.meta.main) {
  try {
    await copyAssets();
    console.log('Assets copied successfully!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Asset copy failed: ${message}`);
    process.exit(1);
  }
}
