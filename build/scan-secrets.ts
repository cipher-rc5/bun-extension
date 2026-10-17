export async function scanSecrets(staged = false): Promise<void> {
  const scanner = Bun.which('betterleaks');
  if (!scanner) {
    if (!staged) throw new Error('Install betterleaks to run the secret scan (see readme.md)');
    console.log('betterleaks is not installed; skipping the optional staged secret scan. See readme.md for installation.');
    return;
  }
  const child = Bun.spawn([scanner, 'git', '--redact', '--no-banner', ...(staged ? ['--staged'] : ['--verbose'])], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  });
  if (await child.exited !== 0) throw new Error('Secret scan failed; remove any reported secret before committing');
}

if (import.meta.main) await scanSecrets(Bun.argv.includes('--staged'));
