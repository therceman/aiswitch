import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { getConfigPath } from '../config/load';
import { ProfileSchema } from '../config/schema';
import { profileToYaml } from '../utils/yaml';

function findExecutable(name: string): string | null {
  const paths = [
    path.join(os.homedir(), `.${name}/bin`, name),
    path.join(os.homedir(), `.local/bin`, name),
    path.join('/usr/local/bin', name),
    `/usr/local/bin/${name}`,
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    const result = execSync(`which ${name}`, { encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}

function detectProfiles(): Record<string, unknown> {
  const profiles: Record<string, unknown> = {};

  const ocPath = findExecutable('opencode');
  if (ocPath) {
    profiles['opencode'] = {
      executable: 'opencode',
      description: 'Default opencode profile',
      env: {
        OPENCODE_CONFIG_DIR: path.join(os.homedir(), '.config', 'opencode'),
      },
    };
  }

  const cxPath = findExecutable('codex');
  if (cxPath) {
    profiles['codex'] = {
      executable: 'codex',
      description: 'Default codex profile',
      env: {
        CODEX_CONFIG_DIR: path.join(os.homedir(), '.codex'),
      },
    };
  }

  return profiles;
}

export function initCommand(force: boolean = false): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (fs.existsSync(configPath)) {
    if (!force) {
      console.log(`Config already exists: ${configPath}. Use --force to overwrite.`);
      return;
    }
  }

  const profiles = detectProfiles();
  const typedProfiles: Array<[string, ReturnType<typeof ProfileSchema.parse>]> = Object.entries(
    profiles
  ).map(([name, config]) => {
    const c = config as Record<string, unknown>;
    return [
      name,
      ProfileSchema.parse({
        executable: c.executable as string,
        description: c.description as string | undefined,
        cwd: c.cwd as string | undefined,
        env: c.env as Record<string, string> | undefined,
        createDirs: c.createDirs as string[] | undefined,
      }),
    ];
  });
  const profileYaml = typedProfiles
    .map(([name, profile]) => profileToYaml(name, profile))
    .join('\n');

  const configContent = `version: 1\n\nprofiles:\n${profileYaml}\n`;

  fs.writeFileSync(configPath, configContent, 'utf-8');
  console.log(`Created config: ${configPath}`);

  if (Object.keys(profiles).length === 0) {
    console.log('No opencode/codex found. Edit config manually.');
  } else {
    console.log(`Found: ${Object.keys(profiles).join(', ')}`);
  }
}
