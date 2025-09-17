// build-all.ts
import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';

interface BuildStep {
  name: string;
  command: string;
  required: boolean;
}

function createManifest(): void {
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

  writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('✓ Created manifest.json');
}

function copyAssets(): void {
  // Ensure dist directory exists
  mkdirSync('dist', { recursive: true });

  // Copy HTML file
  if (existsSync('src/popup/index.html')) {
    copyFileSync('src/popup/index.html', 'dist/index.html');
    console.log('✓ Copied index.html');
  } else {
    console.error(' src/popup/index.html not found');
    process.exit(1);
  }

  // Create manifest
  createManifest();
}

function runBuildStep(step: BuildStep): boolean {
  try {
    console.log(`\n ${step.name}...`);
    execSync(step.command, { stdio: 'inherit' });
    console.log(` ${step.name} completed`);
    return true;
  } catch (error) {
    console.error(` ${step.name} failed:`, error);
    if (step.required) {
      process.exit(1);
    }
    return false;
  }
}

function buildAll(): void {
  console.log(' Starting extension build...\n');

  const buildSteps: BuildStep[] = [{
    name: 'Building CSS',
    command: 'bunx @tailwindcss/cli -i ./src/styles/globals.css -o ./dist/styles.css --minify',
    required: true
  }, {
    name: 'Building popup (React)',
    command: 'bun build ./src/popup/index.tsx --outdir ./dist --target browser --minify --entry-naming index.js',
    required: true
  }, {
    name: 'Building content script',
    command: 'bun build ./src/content/index.ts --outdir ./dist --target browser --minify --entry-naming content.js',
    required: true
  }, {
    name: 'Building background script',
    command: 'bun build ./src/background/index.ts --outdir ./dist --target browser --minify --entry-naming background.js',
    required: true
  }];

  // Copy assets first
  copyAssets();

  // Run all build steps
  let allSuccessful = true;
  for (const step of buildSteps) {
    if (!runBuildStep(step)) {
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
buildAll();
