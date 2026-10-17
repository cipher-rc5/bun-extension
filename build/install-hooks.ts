/** Optional setup tolerates CI, missing Git, and source archives. */
async function installHooks(optional: boolean): Promise<void> {
  if (optional && Bun.env.CI) return;
  const git = Bun.which('git');
  if (!git) {
    if (optional) return;
    throw new Error('Git is required to install hooks');
  }
  const child = Bun.spawn([git, 'config', 'core.hooksPath', '.githooks'], {
    stdout: optional ? 'ignore' : 'inherit',
    stderr: optional ? 'ignore' : 'inherit'
  });
  if (await child.exited !== 0 && !optional) throw new Error('Could not install Git hooks');
}

await installHooks(Bun.argv.includes('--optional'));
