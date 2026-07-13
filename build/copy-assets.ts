// copy-assets.ts
import { $ } from 'bun';

interface CopyResult {
  success: boolean;
  message: string;
}

async function ensureDir(path: string): Promise<void> {
  await $`mkdir -p ${path}`;
}

async function copyIfExists(src: string, dest: string, label: string): Promise<boolean> {
  const sourceFile = Bun.file(src);
  if (!(await sourceFile.exists())) {
    return false;
  }

  // Make sure the destination directory exists before writing
  const directory = dest.split('/').slice(0, -1).join('/');
  if (directory) {
    await ensureDir(directory);
  }

  await Bun.write(dest, sourceFile);
  console.log(`✓ Copied ${label}`);
  return true;
}

async function copyAssets(): Promise<CopyResult> {
  try {
    // Ensure dist and assets directories exist
    await ensureDir('dist');
    await ensureDir('dist/assets');

    // Copy manifest.json
    await copyIfExists('src/manifest.json', 'dist/manifest.json', 'manifest.json');

    // Copy popup HTML
    await copyIfExists('src/popup/index.html', 'dist/index.html', 'index.html');

    // Copy icons if they exist
    const iconSizes = ['16', '32', '48', '128'];
    const iconsExist = await Promise.all(iconSizes.map(size => Bun.file(`src/assets/icon${size}.png`).exists()));

    if (iconsExist.some(Boolean)) {
      await Promise.all(iconSizes.map(async size => {
        const srcPath = `src/assets/icon${size}.png`;
        const destPath = `dist/assets/icon${size}.png`;
        await copyIfExists(srcPath, destPath, `icon${size}.png`);
      }));
    } else {
      console.warn('⚠ No icon files found in src/assets/. You may want to add icons later.');
    }

    return { success: true, message: 'Assets copied successfully!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, message: `Asset copy failed: ${errorMessage}` };
  }
}

export { copyAssets };

// Run standalone only when invoked directly (e.g. `bun run build/copy-assets.ts`).
// When imported by build-all.ts, the caller decides how to run it.
if (import.meta.main) {
  const result = await copyAssets();
  console.log(result.message);

  if (!result.success) {
    process.exit(1);
  }
}
