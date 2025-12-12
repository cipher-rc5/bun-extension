// build-css.ts
import { $ } from 'bun';

interface BuildResult {
  success: boolean;
  message: string;
}

const stdio = { stdin: 'inherit' as const, stdout: 'inherit' as const, stderr: 'inherit' as const };

async function ensureDist(): Promise<void> {
  await $`mkdir -p dist`;
}

async function buildCSS(): Promise<BuildResult> {
  try {
    // Ensure dist directory exists
    await ensureDist();

    // Build CSS using TailwindCSS CLI with proper input/output paths
    console.log('Building CSS with Tailwind...');

    // Use the postcss config and ensure all Tailwind layers are included
    const task = Bun.spawn(
      ['bunx', 'tailwindcss', '-i', './src/styles/globals.css', '-o', './dist/styles.css', '--minify', '--postcss'],
      stdio
    );
    const exitCode = await task.exited;

    if (exitCode !== 0) {
      throw new Error(`Tailwind build failed with exit code ${exitCode}`);
    }

    console.log(' CSS build completed successfully!');
    return { success: true, message: 'CSS build completed successfully!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(' CSS build failed:', errorMessage);
    return { success: false, message: `CSS build failed: ${errorMessage}` };
  }
}

// Execute the build
const result = await buildCSS();
console.log(result.message);

if (!result.success) {
  process.exit(1);
}

export { buildCSS };
