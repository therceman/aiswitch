import { loadConfig } from '../config/load';
import { Profile } from '../config/schema';

export function listCommand(): void {
  const config = loadConfig();
  const names = Object.keys(config.profiles).sort();

  for (const name of names) {
    const profile = config.profiles[name] as Profile;
    console.log(`${name}`);
    console.log(`  executable: ${profile.executable}`);
    if (profile.cwd) {
      console.log(`  cwd: ${profile.cwd}`);
    }
    if (profile.args?.length) {
      console.log(`  args: ${profile.args.join(' ')}`);
    }
  }
}

export function listCommandJson(): Record<string, Profile> {
  const config = loadConfig();
  return config.profiles;
}
