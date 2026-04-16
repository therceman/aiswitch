import { loadConfig, getConfigPath } from '../config/load';
import { Profile } from '../config/schema';
import { resolvePath, isPathLike } from '../config/paths';
import { buildEnv } from '../runtime/env';
import { spawnAndWait } from '../runtime/spawn';
import fs from 'fs';

export async function runCommand(profileName: string, extraArgs: string[]): Promise<number> {
  const config = loadConfig();
  const configPath = getConfigPath();

  const profile = config.profiles[profileName] as Profile | undefined;
  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(
      `Profile not found: ${profileName}\nAvailable profiles: ${availableProfiles || 'none'}\nRun 'aiswitch init' to create a profile.`
    );
  }

  const cwd = profile.cwd ? resolvePath(profile.cwd) : process.cwd();

  ensureDirectories(profile, cwd);

  const env = buildEnv(profile, configPath);

  const args = [...(profile.args || []), ...extraArgs];

  const exitCode = await spawnAndWait({
    executable: profile.executable,
    args,
    cwd,
    env,
  });

  return exitCode;
}

function ensureDirectories(profile: Profile, cwd?: string): void {
  const dirs: string[] = [];

  if (cwd && fs.existsSync(cwd)) {
    dirs.push(cwd);
  }

  if (profile.createDirs) {
    for (const d of profile.createDirs) {
      dirs.push(resolvePath(d));
    }
  }

  if (profile.env) {
    for (const [key, value] of Object.entries(profile.env)) {
      if (isPathLike(key)) {
        dirs.push(resolvePath(value));
      }
    }
  }

  for (const dir of dirs) {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
