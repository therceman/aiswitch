import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export function resolveExecutable(execName: string): string | null {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`where ${execName}`, { encoding: 'utf-8', stdio: 'pipe' });
      const found = result.trim().split('\n')[0];
      return found || null;
    } else {
      const result = execSync(`which ${execName}`, { encoding: 'utf-8', stdio: 'pipe' });
      return result.trim() || null;
    }
  } catch {
    const localPath = path.join(process.cwd(), execName);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  }
}

export function findExecutablePath(execName: string): string {
  const resolved = resolveExecutable(execName);
  if (!resolved) {
    throw new Error(`Executable not found in PATH: ${execName}`);
  }
  return resolved;
}
