import { loadConfig, getConfigPath } from '../config/load';
import { Profile } from '../config/schema';
import { resolveExecutable } from '../runtime/resolveExecutable';
import { buildEnv } from '../runtime/env';
import { resolvePath } from '../config/paths';

function maskSensitive(value: string): string {
  if (value.length > 8) {
    return value.slice(0, 4) + '****' + value.slice(-4);
  }
  return '****';
}

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    upper.includes('API_KEY') ||
    upper.includes('TOKEN') ||
    upper.includes('SECRET') ||
    upper.includes('PASSWORD')
  );
}

export function whichCommand(profileName: string): void {
  const config = loadConfig();
  const configPath = getConfigPath();

  const profile = config.profiles[profileName] as Profile | undefined;
  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(
      `Profile not found: ${profileName}\nAvailable profiles: ${availableProfiles || 'none'}\nRun 'aiswitch init' to create a profile.`
    );
  }

  const execPath = resolveExecutable(profile.executable);
  const cwd = profile.cwd ? resolvePath(profile.cwd) : undefined;
  const fullEnv = buildEnv(profile, configPath);

  const filterEnvKey = (k: string): boolean => {
    if (profileName.startsWith('opencode')) {
      return k.startsWith('OPENCODE_') || k.startsWith('XDG_');
    }
    if (profileName.startsWith('codex')) {
      return k.startsWith('CODEX');
    }
    return k.startsWith('OPENCODE_') || k.startsWith('XDG_') || k.startsWith('CODEX');
  };

  console.log(`profile: ${profileName}`);
  console.log(`executable: ${profile.executable}`);
  console.log(`executable path: ${execPath || 'not found in PATH'}`);
  if (cwd) {
    console.log(`cwd: ${cwd}`);
  }
  if (profile.args?.length) {
    console.log(`args: ${profile.args.join(' ')}`);
  }

  const envKeys = Object.keys(fullEnv).filter(filterEnvKey);
  if (envKeys.length > 0) {
    console.log('env:');
    for (const key of envKeys) {
      const value = isSensitiveKey(key) ? maskSensitive(fullEnv[key]) : fullEnv[key];
      console.log(`  ${key}: ${value}`);
    }
  }

  console.log(`config: ${configPath}`);
}
