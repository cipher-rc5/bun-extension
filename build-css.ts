// build-css.ts
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

interface BuildResult {
  success: boolean;
  message: string;
}

function buildCSS(): BuildResult {
  try {
    // Ensure dist directory exists
    mkdirSync('dist', { recursive: true });

    // Build CSS using TailwindCSS CLI with proper input/output paths
    console.log('Building CSS with Tailwind...');

    // Use the postcss config and ensure all Tailwind layers are included
    execSync('bunx tailwindcss -i ./src/styles/globals.css -o ./dist/styles.css --minify --postcss', { stdio: 'inherit' });

    console.log(' CSS build completed successfully!');
    return { success: true, message: 'CSS build completed successfully!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(' CSS build failed:', errorMessage);
    return { success: false, message: `CSS build failed: ${errorMessage}` };
  }
}

// Execute the build
const result = buildCSS();
console.log(result.message);

if (!result.success) {
  process.exit(1);
}

export { buildCSS };
