// copy-assets.ts
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CopyResult {
  success: boolean;
  message: string;
}

function copyAssets(): CopyResult {
  try {
    // Ensure dist and assets directories exist
    mkdirSync('dist', { recursive: true });
    mkdirSync('dist/assets', { recursive: true });

    // Copy manifest.json
    if (existsSync('src/manifest.json')) {
      copyFileSync('src/manifest.json', 'dist/manifest.json');
      console.log('✓ Copied manifest.json');
    }

    // Copy popup HTML
    if (existsSync('src/popup/index.html')) {
      copyFileSync('src/popup/index.html', 'dist/index.html');
      console.log('✓ Copied index.html');
    }

    // Copy icons if they exist
    const iconSizes = ['16', '32', '48', '128'];
    const iconsExist = iconSizes.some(size => existsSync(`src/assets/icon${size}.png`));

    if (iconsExist) {
      iconSizes.forEach(size => {
        const srcPath = `src/assets/icon${size}.png`;
        const destPath = `dist/assets/icon${size}.png`;
        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath);
          console.log(`✓ Copied icon${size}.png`);
        }
      });
    } else {
      console.warn('⚠ No icon files found in src/assets/. You may want to add icons later.');
    }

    return { success: true, message: 'Assets copied successfully!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, message: `Asset copy failed: ${errorMessage}` };
  }
}

// Execute the copy
const result = copyAssets();
console.log(result.message);

if (!result.success) {
  process.exit(1);
}

export { copyAssets };
