// Metadata polling catches atomic saves and new files.
async function fingerprint(): Promise<string> {
  const files = ['tailwind.config.ts'];
  for await (const file of new Bun.Glob('src/**/*').scan({ onlyFiles: true })) files.push(file);
  files.sort();
  return files.map(path => {
    const file = Bun.file(path);
    return `${path}:${file.size}:${file.lastModified}`;
  }).join('\n');
}
let previous = await fingerprint();
async function rebuild() {
  try {
    // A fresh process invalidates cached Tailwind configuration.
    const child = Bun.spawn([Bun.argv[0]!, 'build/build-all.ts', '--development'], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit'
    });
    if (await child.exited !== 0) console.error('Build failed; waiting for the next edit.');
  } catch (error) {
    console.error('Build failed:', error);
  }
}
await rebuild();
let checking = false;
setInterval(async () => {
  if (checking) return;
  checking = true;
  try {
    const current = await fingerprint();
    if (current !== previous) {
      previous = current;
      await rebuild();
    }
  } catch (error) {
    console.error('Watch failed:', error);
  } finally {
    checking = false;
  }
}, 250);
console.log('Watching src/ and tailwind.config.ts; reload the extension after each build.');
