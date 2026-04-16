import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { getConfigPath, loadConfig } from '../config/load';
import { Profile, ProfileSchema } from '../config/schema';
import { profileToYaml } from '../utils/yaml';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function createCommand(
  name: string,
  executable?: string,
  apiKey?: string,
  customDir?: string
): Promise<void> {
  let execName = executable;
  let configDir = customDir;
  let apiKeyVal = apiKey;

  if (!execName) {
    execName = await ask('Executable (opencode/codex) [opencode]: ');
    if (!execName) {
      execName = 'opencode';
    }
  }

  let useDefault = true;
  if (execName === 'opencode') {
    const useOrig = await ask('Use default shared config? (y/n) [y], n = copy default: ');
    useDefault = !useOrig || useOrig.toLowerCase().startsWith('y');
    if (useDefault) {
      configDir = path.join(os.homedir(), '.config', 'opencode');
    } else {
      configDir = path.join(os.homedir(), '.aiswitch', 'profiles', name, 'config');
    }
  } else {
    configDir = path.join(os.homedir(), '.aiswitch', 'profiles', name, 'config');
  }

  if (!apiKeyVal) {
    if (execName === 'codex') {
      console.log('Note: codex has built-in login (run: codex login)');
    } else {
      apiKeyVal = await ask('OPENCODE_API_KEY (optional, press enter to skip): ');
    }
  }

  const configPath = getConfigPath();
  let configProfiles: Record<string, unknown>;

  try {
    configProfiles = loadConfig().profiles;
  } catch {
    configProfiles = {};
  }

  if (configProfiles[name]) {
    console.log(`Profile '${name}' already exists. Use --force to overwrite.`);
    return;
  }

  const profile: Record<string, unknown> = {
    executable: execName,
    description: `${name} profile`,
    env: {},
  };

  if (!useDefault && configDir) {
    (profile.env as Record<string, string>)[`${execName.toUpperCase()}_CONFIG_DIR`] = configDir;
  }

  if (apiKeyVal) {
    (profile.env as Record<string, string>)['OPENCODE_API_KEY'] = apiKeyVal;
  }

  configProfiles[name] = profile;

  if (!useDefault && execName === 'opencode') {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const defaultConfig = path.join(os.homedir(), '.config', 'opencode', 'opencode.json');
    const newConfig = path.join(configDir, 'opencode.json');
    if (fs.existsSync(defaultConfig)) {
      fs.copyFileSync(defaultConfig, newConfig);
      console.log(`Copied config to profile directory`);
    }
  }

  const typedProfiles: Record<string, Profile> = {};
  for (const [n, p] of Object.entries(configProfiles)) {
    const prof = p as Record<string, unknown>;
    typedProfiles[n] = ProfileSchema.parse({
      executable: prof.executable,
      description: prof.description,
      cwd: prof.cwd,
      env: prof.env,
      createDirs: prof.createDirs,
      args: prof.args,
    });
  }
  const profileYaml = Object.entries(typedProfiles)
    .map(([n, p]) => profileToYaml(n, p))
    .join('\n\n');
  const yamlContent = `version: 1\n\nprofiles:\n${profileYaml}\n`;

  fs.writeFileSync(configPath, yamlContent, 'utf-8');

  console.log(`\nCreated profile '${name}' in ${configPath}`);
  console.log(`Config directory: ${configDir}`);
  console.log(`\nUsage: aiswitch ${name}`);
}
