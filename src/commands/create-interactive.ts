import fs from 'fs';
import os from 'os';
import path from 'path';
import Enquirer from 'enquirer';
import { getConfigPath, loadConfig } from '../config/load';
import { Profile, ProfileSchema } from '../config/schema';
import { profileToYaml } from '../utils/yaml';
import { detectHarness } from '../utils/harness';
import { detectAvailableHarnesses } from '../utils/detect-harnesses';

interface CreateOptions {
  name?: string;
  executable?: string;
  apiKey?: string;
  customDir?: string;
  force?: boolean;
}

export async function createCommandInteractive(opts: CreateOptions = {}): Promise<void> {
  let name = opts.name;
  let execName = opts.executable;
  let configDir = opts.customDir;
  let apiKeyVal = opts.apiKey;

  if (!name) {
    const namePrompt = {
      type: 'input',
      name: 'name',
      message: 'Profile name',
      validate: (value: string) => {
        if (!value.trim()) return 'Profile name is required';
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
          return 'Profile name must start with a letter and contain only letters, numbers, -, and _';
        }
        return true;
      },
    };
    const nameResult = (await Enquirer.prompt(namePrompt)) as { name: string };
    name = nameResult.name.trim();
  }

  const configPath = getConfigPath();
  let configProfiles: Record<string, unknown>;

  try {
    configProfiles = loadConfig().profiles;
  } catch {
    configProfiles = {};
  }

  if (configProfiles[name] && opts.force !== true) {
    const confirmPrompt = {
      type: 'confirm',
      name: 'overwrite',
      message: `Profile '${name}' already exists. Overwrite?`,
      initial: false,
    };
    const confirmResult = (await Enquirer.prompt(confirmPrompt)) as { overwrite: boolean };
    if (!confirmResult.overwrite) {
      console.log('Cancelled');
      return;
    }
  }

  if (!execName) {
    const available = detectAvailableHarnesses();
    const choices = available.map((h) => ({
      name: h.executable,
      message: `${h.executable} - ${h.description}${h.available ? '' : ' (not found in PATH)'}`,
    }));
    choices.push({ name: 'custom', message: 'custom - Specify manually' });

    const execPrompt = {
      type: 'autocomplete',
      name: 'executable',
      message: 'Select executable',
      limit: 10,
      choices,
      initial: available.findIndex((h) => h.available) >= 0 ? 0 : choices.length - 1,
    };
    const execResult = (await Enquirer.prompt(execPrompt)) as { executable: string };
    if (execResult.executable === 'custom') {
      const customPrompt = {
        type: 'input',
        name: 'custom',
        message: 'Enter executable name',
      };
      const customResult = (await Enquirer.prompt(customPrompt)) as { custom: string };
      execName = customResult.custom;
    } else {
      execName = execResult.executable;
    }
  }

  const harness = detectHarness(execName);
  let useDefault = true;

  if (harness === 'opencode') {
    const useOrigPrompt = {
      type: 'confirm',
      name: 'useDefault',
      message: 'Use default shared config (~/.config/opencode)?',
      initial: true,
    };
    const useOrigResult = (await Enquirer.prompt(useOrigPrompt)) as { useDefault: boolean };
    useDefault = useOrigResult.useDefault;
    if (!useDefault) {
      configDir = path.join(os.homedir(), '.aiswitch', 'profiles', name, 'config');
    } else {
      configDir = path.join(os.homedir(), '.config', 'opencode');
    }
  } else {
    configDir = path.join(os.homedir(), '.aiswitch', 'profiles', name, 'config');
  }

  if (!apiKeyVal) {
    if (harness === 'codex') {
      console.log('Note: codex has built-in login (run: codex login)');
    } else if (harness === 'opencode') {
      const apiKeyPrompt = {
        type: 'input',
        name: 'apiKey',
        message: 'OPENCODE_API_KEY (optional, press enter to skip)',
      };
      const apiKeyResult = (await Enquirer.prompt(apiKeyPrompt)) as { apiKey: string };
      apiKeyVal = apiKeyResult.apiKey;
    }
  }

  const profile: Record<string, unknown> = {
    executable: execName,
    description: `${name} profile`,
    env: {},
  };

  if (!useDefault && configDir) {
    const envKey = `${execName.toUpperCase()}_CONFIG_DIR`;
    (profile.env as Record<string, string>)[envKey] = configDir;
  }

  if (apiKeyVal && harness === 'opencode') {
    (profile.env as Record<string, string>)['OPENCODE_API_KEY'] = apiKeyVal;
  }

  configProfiles[name] = profile;

  if (!useDefault && harness === 'opencode') {
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
