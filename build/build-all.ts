// build-all.ts
import { $ } from 'bun';

interface BuildStep {
  name: string;
  command: string[];
  required: boolean;
}

const stdio = { stdin: 'inherit' as const, stdout: 'inherit' as const, stderr: 'inherit' as const };

async function ensureDir(path: string): Promise<void> {
  await $`mkdir -p ${path}`;
}

async function createManifest(): Promise<void> {
  // Single source of truth: copy src/manifest.json verbatim so icons, version
  // and permissions never diverge from the checked-in manifest.
  const manifest = Bun.file('src/manifest.json');
  if (!(await manifest.exists())) {
    console.error(' src/manifest.json not found');
    process.exit(1);
  }

  await ensureDir('dist');
  await Bun.write('dist/manifest.json', manifest);
  console.log('✓ Copied manifest.json');
}

async function copyAssets(): Promise<void> {
  await ensureDir('dist');

  // Copy HTML file
  const popupHtml = Bun.file('src/popup/index.html');
  if (!(await popupHtml.exists())) {
    console.error(' src/popup/index.html not found');
    process.exit(1);
  }

  await Bun.write('dist/index.html', popupHtml);
  console.log('✓ Copied index.html');

  // Copy PNG icons referenced by the manifest into dist/assets.
  await copyIcons();

  // Create manifest
  await createManifest();
}

async function copyIcons(): Promise<void> {
  await ensureDir('dist/assets');

  const iconSizes = ['16', '32', '48', '128'];
  for (const size of iconSizes) {
    const icon = Bun.file(`src/assets/icon${size}.png`);
    if (!(await icon.exists())) {
      console.warn(`⚠ src/assets/icon${size}.png not found`);
      continue;
    }
    await Bun.write(`dist/assets/icon${size}.png`, icon);
    console.log(`✓ Copied icon${size}.png`);
  }
}

async function runBuildStep(step: BuildStep): Promise<boolean> {
  console.log(`\n ${step.name}...`);

  const task = Bun.spawn(step.command, stdio);
  const exitCode = await task.exited;

  if (exitCode === 0) {
    console.log(` ${step.name} completed`);
    return true;
  }

  console.error(` ${step.name} failed with exit code ${exitCode}`);
  if (step.required) {
    process.exit(exitCode ?? 1);
  }
  return false;
}

async function buildAll(): Promise<void> {
  console.log(' Starting extension build...\n');

  const buildSteps: BuildStep[] = [{
    name: 'Building CSS',
    command: ['bunx', '@tailwindcss/cli', '-i', './src/styles/globals.css', '-o', './dist/styles.css', '--minify'],
    required: true
  }, {
    name: 'Building popup (React)',
    command: [
      'bun',
      'build',
      './src/popup/index.tsx',
      '--outdir',
      './dist',
      '--target',
      'browser',
      '--minify',
      '--entry-naming',
      'index.js'
    ],
    required: true
  }, {
    name: 'Building content script',
    command: [
      'bun',
      'build',
      './src/content/index.ts',
      '--outdir',
      './dist',
      '--target',
      'browser',
      '--minify',
      '--entry-naming',
      'content.js'
    ],
    required: true
  }, {
    name: 'Building background script',
    command: [
      'bun',
      'build',
      './src/background/index.ts',
      '--outdir',
      './dist',
      '--target',
      'browser',
      '--minify',
      '--entry-naming',
      'background.js'
    ],
    required: true
  }];

  // Copy assets first
  await copyAssets();

  // Run all build steps
  let allSuccessful = true;
  for (const step of buildSteps) {
    if (!(await runBuildStep(step))) {
      allSuccessful = false;
    }
  }

  if (allSuccessful) {
    console.log('\n Extension build completed successfully!');
    console.log('\n Your extension is ready in the ./dist folder');
    console.log('\n To load the extension:');
    console.log('   1. Open Chrome/Edge and go to chrome://extensions/');
    console.log('   2. Enable "Developer mode"');
    console.log('   3. Click "Load unpacked" and select the ./dist folder');
  } else {
    console.log('\n  Build completed with some warnings');
  }
}

// Execute the build
await buildAll();
