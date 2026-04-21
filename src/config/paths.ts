import os from 'os';
import path from 'path';

const PATH_LIKE_KEYS = new Set([
  'OPENCODE_CONFIG_DIR',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'CODEX_HOME',
  'HOME',
]);

export function isPathLike(key: string): boolean {
  return PATH_LIKE_KEYS.has(key);
}

export function expandTilde(p: string): string {
  if (p.startsWith('~/') || (process.platform === 'win32' && /^[A-Za-z]:?[/\\]~/.test(p))) {
    return path.join(os.homedir(), p.slice(1).replace(/^[/\\]+/, ''));
  }
  return p;
}

export function resolvePath(p: string, baseDir?: string): string {
  const expanded = expandTilde(p);
  if (path.isAbsolute(expanded)) {
    return path.normalize(expanded);
  }
  const base = baseDir || process.cwd();
  return path.normalize(path.resolve(base, expanded));
}

export function expandEnvValue(key: string, value: string, baseDir?: string): string {
  if (isPathLike(key)) {
    return resolvePath(value, baseDir);
  }
  return value;
}
