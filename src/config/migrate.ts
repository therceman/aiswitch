import fs from 'fs';
import os from 'os';
import path from 'path';
import { repairIsolatedHarnessHome } from '../utils/harness-isolate';

export function getAirelayHomeDir(): string {
  return path.join(os.homedir(), '.airelay');
}

export function getLegacyAiswitchHomeDir(): string {
  return path.join(os.homedir(), '.aiswitch');
}

function repairLegacyCodexProfiles(airelayDir: string): void {
  if (!fs.existsSync(airelayDir)) {
    return;
  }
  try {
    const entries = fs.readdirSync(airelayDir);
    for (const entry of entries) {
      // Match codex-<profile> directories
      const codexMatch = entry.match(/^codex-(.+)$/);
      if (codexMatch) {
        const profileName = codexMatch[1];
        const profileDir = path.join(airelayDir, entry);
        if (fs.lstatSync(profileDir, { throwIfNoEntry: false })?.isDirectory()) {
          repairIsolatedHarnessHome('codex', profileName, profileDir);
        }
      }
    }
  } catch {
    // Ignore repair errors during migration
  }
}

export function migrateLegacyHomeDirIfNeeded(): void {
  const legacyDir = getLegacyAiswitchHomeDir();
  const airelayDir = getAirelayHomeDir();

  if (!fs.existsSync(legacyDir)) {
    return;
  }

  if (!fs.existsSync(airelayDir)) {
    // First run: rename legacy .aiswitch to .airelay
    try {
      fs.renameSync(legacyDir, airelayDir);
      // Repair any legacy codex profiles after rename
      repairLegacyCodexProfiles(airelayDir);
    } catch {
      // Keep runtime resilient: if migration fails, normal command flow continues.
    }
    return;
  }

  // Both .airelay and .aiswitch exist. .aiswitch is stale — the rename already
  // happened in a previous run, or the user created .airelay independently.
  // The stale legacy directory may contain residual profile directories
  // (e.g., codex-codex2) with symlinks and auth.json that are no longer used.
  // Warn once and offer cleanup via the --clean-legacy flag or manual removal.
  try {
    const entries = fs.readdirSync(legacyDir);
    const hasContent = entries.length > 0;
    if (hasContent) {
      const legacyFiles = entries
        .filter((e) => !e.startsWith('.'))
        .slice(0, 5)
        .join(', ');
      console.warn(
        `Legacy ${legacyDir} directory still exists with content (${legacyFiles}...).\n` +
          `  This directory was from the old .aiswitch naming. Your data is now in ${airelayDir}.\n` +
          `  You can safely remove ${legacyDir} to free up space.`
      );
    }
  } catch {
    // Ignore read errors
  }

  // Repair any legacy codex profiles that were previously migrated
  repairLegacyCodexProfiles(airelayDir);
}
