import fs from 'fs';
import path from 'path';
import os from 'os';
import { getHarnessIsolationConfig } from './harness-isolation';

/**
 * Sets up a shared-base overlay directory for a harness profile.
 * Shared items are symlinked from the base directory; isolated items (e.g., auth.json)
 * are kept local per-profile.
 *
 * @param harnessName - e.g., 'codex', 'opencode'
 * @param profileName - Name of the profile (used in directory name)
 * @param baseDir - Optional base directory (defaults to harness default)
 * @returns Path to the overlay profile directory
 */
export function setupIsolatedHarnessHome(
  harnessName: string,
  profileName: string,
  baseDir?: string
): string {
  const config = getHarnessIsolationConfig(harnessName);

  if (!config) {
    throw new Error(`No isolation config found for harness: ${harnessName}`);
  }

  // Determine profile directory
  // Respect AIRELAY_CONFIG env var for test isolation
  const airelayDir = process.env.AIRELAY_CONFIG
    ? path.dirname(process.env.AIRELAY_CONFIG)
    : path.join(os.homedir(), '.airelay');

  // When using AIRELAY_CONFIG, the dirname IS the airelay folder
  // When using default, we need to use .airelay subfolder
  const profileDir = process.env.AIRELAY_CONFIG
    ? path.join(airelayDir, `${harnessName}-${profileName}`)
    : path.join(airelayDir, `${harnessName}-${profileName}`);

  // Determine base directory (shared data source)
  if (!baseDir) {
    baseDir = expandTilde(config.defaultBaseDir);
  }

  // Create profile directory
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Create isolated items (directories only)
  // Files are NOT created here - they're created by the harness when needed
  for (const item of config.isolatedItems) {
    const profileItem = path.join(profileDir, item);

    // Skip if already exists
    if (fs.existsSync(profileItem)) {
      continue;
    }

    // Only create directories (items ending with /)
    if (item.endsWith('/')) {
      fs.mkdirSync(profileItem, { recursive: true });
    }
    // Skip files - don't create empty files, let harness create them
  }

  // Create symlinks for shared items
  // IMPORTANT: isolatedItems take precedence - they are NEVER symlinked
  for (const item of config.sharedItems) {
    const baseItem = path.join(baseDir!, item);
    const profileItem = path.join(profileDir, item);

    // Handle wildcard patterns (e.g., *.json)
    if (item.includes('*')) {
      const pattern = item.replace(/\*/g, '');
      const baseDirPath = baseDir!;

      if (!fs.existsSync(baseDirPath)) {
        continue;
      }

      const baseEntries = fs.readdirSync(baseDirPath);
      for (const entry of baseEntries) {
        if (entry.includes(pattern)) {
          // CRITICAL: Skip if this specific file is in isolatedItems
          // Isolated items take precedence - they should NEVER be symlinked
          if (config.isolatedItems.includes(entry)) {
            continue;
          }

          const entryBase = path.join(baseDirPath, entry);
          const entryProfile = path.join(profileDir, entry);

          // Skip if base doesn't exist or profile already has it
          if (!fs.existsSync(entryBase) || fs.existsSync(entryProfile)) {
            continue;
          }

          try {
            const isDir = fs.statSync(entryBase).isDirectory();
            fs.symlinkSync(entryBase, entryProfile, isDir ? 'dir' : 'file');
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.warn(`Warning: Could not create symlink for ${entry}: ${message}`);
          }
        }
      }
      continue;
    }

    // CRITICAL: Skip if this item is in isolatedItems
    // Isolated items take precedence - they should NEVER be symlinked
    if (config.isolatedItems.includes(item)) {
      continue;
    }

    // Skip if base doesn't exist yet
    if (!fs.existsSync(baseItem)) {
      continue;
    }

    // Skip if profile already has this item
    if (fs.existsSync(profileItem)) {
      continue;
    }

    // Create symlink
    try {
      const isDir = fs.statSync(baseItem).isDirectory();
      fs.symlinkSync(baseItem, profileItem, isDir ? 'dir' : 'file');
    } catch (e) {
      // If symlink fails, skip silently
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.warn(`Warning: Could not create symlink for ${item}: ${message}`);
    }
  }

  return profileDir;
}

/**
 * Repairs a shared-base overlay directory for a harness profile.
 * Preserves local items (e.g., auth.json), removes stale entries, rebuilds symlinks.
 *
 * The repair follows the intended overlay model:
 * - isolatedItems (e.g., auth.json) are PRESERVED — never deleted
 * - sharedItems are re-symlinked from ~/.codex if missing
 * - stale entries (files or dirs not in either list) are removed
 *
 * @param harnessName - e.g., 'codex', 'opencode'
 * @param profileName - Name of the profile
 * @param profileDir - Path to the overlay profile directory
 * @param baseDir - Optional base directory (defaults to harness default)
 */
export function repairIsolatedHarnessHome(
  harnessName: string,
  profileName: string,
  profileDir: string,
  baseDir?: string
): void {
  const config = getHarnessIsolationConfig(harnessName);
  if (!config) {
    throw new Error(`No isolation config found for harness: ${harnessName}`);
  }

  if (!baseDir) {
    baseDir = expandTilde(config.defaultBaseDir);
  }

  if (!fs.existsSync(profileDir)) {
    // Nothing to repair
    return;
  }

  const entries = fs.readdirSync(profileDir);

  for (const entry of entries) {
    const fullPath = path.join(profileDir, entry);

    // Always preserve isolated items (e.g., auth.json)
    if (config.isolatedItems.includes(entry)) {
      continue;
    }

    // Check if this is a valid shared symlink pointing to the base dir
    try {
      const stat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
      if (!stat) {
        continue;
      }

      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(fullPath);
        const expectedTarget = path.join(baseDir!, entry);
        if (target === expectedTarget) {
          // Symlink is correct — keep it
          continue;
        }
        // Symlink points elsewhere — remove and re-create
        fs.unlinkSync(fullPath);
      } else {
        // Real file/dir that is not isolated — remove stale entry
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    } catch {
      // If we can't stat it, try to remove it
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // Rebuild shared symlinks from base directory
  for (const item of config.sharedItems) {
    const baseItem = path.join(baseDir!, item);
    const profileItem = path.join(profileDir, item);

    if (item.includes('*')) {
      const pattern = item.replace(/\*/g, '');
      if (!fs.existsSync(baseDir!)) {
        continue;
      }
      const baseEntries = fs.readdirSync(baseDir!);
      for (const entry of baseEntries) {
        if (!entry.includes(pattern)) {
          continue;
        }
        if (config.isolatedItems.includes(entry)) {
          continue;
        }
        const entryBase = path.join(baseDir!, entry);
        const entryProfile = path.join(profileDir, entry);
        if (!fs.existsSync(entryBase) || fs.existsSync(entryProfile)) {
          continue;
        }
        try {
          const isDir = fs.statSync(entryBase).isDirectory();
          fs.symlinkSync(entryBase, entryProfile, isDir ? 'dir' : 'file');
        } catch {
          // Silently skip failed symlinks
        }
      }
      continue;
    }

    if (config.isolatedItems.includes(item)) {
      continue;
    }
    if (!fs.existsSync(baseItem) || fs.existsSync(profileItem)) {
      continue;
    }
    try {
      const isDir = fs.statSync(baseItem).isDirectory();
      fs.symlinkSync(baseItem, profileItem, isDir ? 'dir' : 'file');
    } catch {
      // Silently skip failed symlinks
    }
  }
}

/**
 * Removes an overlay profile directory.
 * Only removes the profile directory, never the base/shared directory.
 *
 * @param harnessName - e.g., 'codex', 'opencode'
 * @param profileDir - Path to the overlay profile directory
 * @returns true if successful, false if directory is invalid (safety check)
 */
export function removeIsolatedHarnessHome(harnessName: string, profileDir: string): boolean {
  const config = getHarnessIsolationConfig(harnessName);

  if (!config) {
    return false;
  }

  // Safety check: ensure this is actually an overlay profile
  // (not the base directory itself)
  const baseDir = expandTilde(config.defaultBaseDir);

  // Don't allow removing the base directory!
  if (profileDir === baseDir || profileDir.startsWith(baseDir + '/')) {
    console.error(`Error: Cannot remove base directory: ${baseDir}`);
    return false;
  }

  // Ensure it's in .airelay directory (or test directory with AIRELAY_CONFIG)
  const airelayDir = process.env.AIRELAY_CONFIG
    ? path.dirname(process.env.AIRELAY_CONFIG)
    : path.join(os.homedir(), '.airelay');
  if (!profileDir.startsWith(airelayDir)) {
    console.error(`Error: Profile directory must be in ${airelayDir}: ${profileDir}`);
    return false;
  }

  // Remove the profile directory
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`Failed to remove profile directory: ${message}`);
    return false;
  }
}

/**
 * Lists items in an overlay profile directory with their types.
 * @param profileDir - Path to the profile directory
 * @returns Array of {name, type, target} where type is 'symlink', 'file', or 'dir'
 */
export function listProfileItems(profileDir: string): Array<{
  name: string;
  type: 'symlink' | 'file' | 'dir';
  target?: string;
}> {
  const items: Array<{
    name: string;
    type: 'symlink' | 'file' | 'dir';
    target?: string;
  }> = [];

  if (!fs.existsSync(profileDir)) {
    return items;
  }

  const entries = fs.readdirSync(profileDir);

  for (const entry of entries) {
    const fullPath = path.join(profileDir, entry);
    const stat = fs.lstatSync(fullPath, { throwIfNoEntry: false });

    if (!stat) {
      continue;
    }

    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      items.push({ name: entry, type: 'symlink', target });
    } else if (stat.isDirectory()) {
      items.push({ name: entry, type: 'dir' });
    } else if (stat.isFile()) {
      items.push({ name: entry, type: 'file' });
    }
  }

  return items;
}

/**
 * Expands tilde in path to home directory
 */
function expandTilde(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

// Re-export isolation config utilities for convenience
export {
  getHarnessIsolationConfig,
  supportsIsolation,
  HARNESS_ISOLATION_CONFIGS,
  type HarnessIsolationConfig,
} from './harness-isolation';
