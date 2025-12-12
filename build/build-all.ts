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
  const manifest = {
    'manifest_version': 3,
    'name': 'prototype_extension',
    'version': '1.0.0',
    'description': 'responsive_react_browser_extension',
    'permissions': ['activeTab', 'storage'],
    'action': { 'default_popup': 'index.html', 'default_title': 'prototype_extension' },
    'background': { 'service_worker': 'background.js' },
    'content_scripts': [{ 'matches': ['<all_urls>'], 'js': ['content.js'] }]
  };

  await ensureDir('dist');
  await Bun.write('dist/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('✓ Created manifest.json');
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

  // Create manifest
  await createManifest();
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
