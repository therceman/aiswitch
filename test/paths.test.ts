import os from 'os';
import path from 'path';
import { expandTilde, resolvePath, isPathLike } from '../src/config/paths';

describe('expandTilde', () => {
  it('expands tilde on unix', () => {
    const home = os.homedir();
    expect(expandTilde('~/foo')).toBe(path.join(home, 'foo'));
  });

  it('returns unchanged if no tilde', () => {
    expect(expandTilde('/absolute/path')).toBe('/absolute/path');
  });

  it('handles relative paths', () => {
    expect(expandTilde('./relative')).toBe('./relative');
  });
});

describe('isPathLike', () => {
  it('returns true for path-like keys', () => {
    expect(isPathLike('OPENCODE_CONFIG_DIR')).toBe(true);
    expect(isPathLike('XDG_CONFIG_HOME')).toBe(true);
    expect(isPathLike('XDG_DATA_HOME')).toBe(true);
    expect(isPathLike('CODEX_HOME')).toBe(true);
  });

  it('returns false for non-path keys', () => {
    expect(isPathLike('PATH')).toBe(false);
    expect(isPathLike('HOME')).toBe(true);
  });
});

describe('resolvePath', () => {
  it('resolves relative paths', () => {
    const resolved = resolvePath('foo/bar', '/tmp');
    expect(resolved).toBe(path.resolve('/tmp', 'foo/bar'));
  });

  it('normalizes paths', () => {
    const resolved = resolvePath('foo//bar/../baz');
    expect(resolved).toBe(path.resolve('foo/baz'));
  });
});
