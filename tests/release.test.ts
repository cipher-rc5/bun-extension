import { expect, test } from 'bun:test';
import { checkRelease } from '../build/check-release';
test('accepts matching stable release versions', () => {
  expect(() => checkRelease('v0.2.0', '0.2.0', '0.2.0')).not.toThrow();
});
test.each(['v1.0.0', 'v0.2', 'vgarbage', '0.2.0', 'v00.2.0', 'v0.2.0-rc.1', 'v0.2.0+build'])(
  'rejects invalid or mismatched tag %s',
  tag => {
    expect(() => checkRelease(tag, '0.2.0', '0.2.0')).toThrow();
  }
);
test('rejects manifest drift', () => {
  expect(() => checkRelease('v0.2.0', '0.2.0', '0.1.0')).toThrow('match');
});
