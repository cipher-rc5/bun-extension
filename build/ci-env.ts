/** Persist a value for subsequent GitHub Actions steps when running in CI. */
export async function appendCIEnv(name: string, value: string, path = Bun.env.GITHUB_ENV): Promise<void> {
  if (!/^[A-Z_][A-Z_0-9]*$/.test(name) || /[\r\n]/.test(value)) throw new Error('Invalid CI environment entry');
  if (!path) return;
  const file = Bun.file(path);
  const previous = await file.exists() ? await file.text() : '';
  await Bun.write(file, `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${name}=${value}\n`);
}
