import fs from 'fs';
import os from 'os';
import path from 'path';

export function getAirelayHomeDir(): string {
  return path.join(os.homedir(), '.airelay');
}

export function getLegacyAiswitchHomeDir(): string {
  return path.join(os.homedir(), '.aiswitch');
}

export function migrateLegacyHomeDirIfNeeded(): void {
  const legacyDir = getLegacyAiswitchHomeDir();
  const airelayDir = getAirelayHomeDir();

  if (!fs.existsSync(legacyDir) || fs.existsSync(airelayDir)) {
    return;
  }

  try {
    fs.renameSync(legacyDir, airelayDir);
  } catch {
    // Keep runtime resilient: if migration fails, normal command flow continues.
  }
}
