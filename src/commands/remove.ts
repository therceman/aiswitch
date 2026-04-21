import fs from 'fs';
import path from 'path';
import { loadConfig, getConfigPath } from '../config/load';
import { profileToYaml } from '../utils/yaml';
import Enquirer from 'enquirer';

export async function removeCommand(profileName?: string): Promise<void> {
  const config = loadConfig();
  const configPath = getConfigPath();

  if (!profileName) {
    // Show all isolated codex profiles
    const isolatedProfiles = Object.entries(config.profiles)
      .filter(([, p]) => {
        const profile = p as { executable: string; env?: { CODEX_HOME?: string } };
        if (profile.executable !== 'codex') return false;
        const codexHome = profile.env?.CODEX_HOME;
        return codexHome && codexHome.includes('.aiswitch/codex-');
      })
      .map(([name, p]) => {
        const profile = p as { env?: { CODEX_HOME?: string } };
        return {
          name,
          codexHome: profile.env?.CODEX_HOME,
        };
      });

    if (isolatedProfiles.length === 0) {
      console.log('No isolated Codex profiles found.');
      console.log('Isolated profiles are those with CODEX_HOME in ~/.aiswitch/codex-<name>');
      return;
    }

    console.log('Isolated Codex profiles (run with profile name to remove):');
    for (const p of isolatedProfiles) {
      console.log(`  ${p.name} → ${p.codexHome}`);
    }
    return;
  }

  // Verify profile exists and is a Codex profile
  const profile = config.profiles[profileName] as {
    executable: string;
    env?: { CODEX_HOME?: string };
  };
  if (!profile) {
    console.error(`Profile '${profileName}' not found.`);
    return;
  }

  if (profile.executable !== 'codex') {
    console.error(
      `Profile '${profileName}' is not a Codex profile (executable: ${profile.executable}).`
    );
    return;
  }

  const codexHome = profile.env?.CODEX_HOME;
  if (!codexHome || !codexHome.includes('.aiswitch/codex-')) {
    console.error(`Profile '${profileName}' is not an isolated Codex profile.`);
    console.error(`CODEX_HOME: ${codexHome || 'not set'}`);
    console.error(
      '\nOnly isolated profiles (with CODEX_HOME in ~/.aiswitch/codex-<name>) can be removed.'
    );
    console.error('The default codex profile cannot be removed.');
    return;
  }

  // Check if directory exists
  const directoryExists = fs.existsSync(codexHome);

  // Count symlinks to verify it's an isolated profile
  let symlinkCount = 0;
  let realFileCount = 0;
  if (directoryExists) {
    try {
      const entries = fs.readdirSync(codexHome);
      for (const entry of entries) {
        const fullPath = path.join(codexHome, entry);
        const stat = fs.lstatSync(fullPath, { throwIfNoEntry: false });
        if (stat?.isSymbolicLink()) {
          symlinkCount++;
        } else if (stat?.isFile() || stat?.isDirectory()) {
          realFileCount++;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  console.log(`Profile to remove:`);
  console.log(`  Name: ${profileName}`);
  console.log(`  Directory: ${codexHome}`);
  if (directoryExists) {
    console.log(`  Symlinks: ${symlinkCount}`);
    console.log(`  Real files/dirs: ${realFileCount}`);
  } else {
    console.log(`  Status: Directory does not exist`);
  }
  console.log();
  console.log('⚠️  This will:');
  if (directoryExists) {
    console.log(`  - Remove all symlinks in ${codexHome}`);
    console.log(`  - Delete real files/dirs in ${codexHome}`);
  } else {
    console.log(`  - Skip directory removal (does not exist)`);
  }
  console.log(`  - Remove profile from config.yaml`);
  console.log();
  console.log('✓  This will NOT:');
  console.log('  - Touch ~/.codex (default Codex home)');
  console.log('  - Affect other isolated profiles');
  console.log('  - Delete symlinks targets (shared data is safe)');
  console.log();

  // Confirm removal
  const confirmPrompt = {
    type: 'confirm',
    name: 'confirm',
    message: `Remove profile '${profileName}'?`,
    initial: false,
  };

  const confirmResult = (await Enquirer.prompt(confirmPrompt)) as { confirm: boolean };

  if (!confirmResult.confirm) {
    console.log('Cancelled.');
    return;
  }

  // Remove the profile directory if it exists
  if (directoryExists) {
    console.log(`\nRemoving ${codexHome}...`);
    try {
      fs.rmSync(codexHome, { recursive: true, force: true });
      console.log(`✓ Deleted: ${codexHome}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error(`✗ Failed to delete directory: ${message}`);
      return;
    }
  } else {
    console.log(`\nSkipping directory removal (does not exist)`);
  }

  // Remove from config
  console.log(`\nUpdating config...`);
  delete config.profiles[profileName];

  // Rewrite config
  const typedProfiles: Record<
    string,
    {
      executable: string;
      cwd?: string;
      env?: Record<string, string>;
      createDirs?: string[];
      args?: string[];
    }
  > = {};
  for (const [n, p] of Object.entries(config.profiles)) {
    const prof = p as Record<string, unknown>;
    typedProfiles[n] = {
      executable: prof.executable as string,
      cwd: prof.cwd as string | undefined,
      env: prof.env as Record<string, string> | undefined,
      createDirs: prof.createDirs as string[] | undefined,
      args: prof.args as string[] | undefined,
    };
  }

  const profileYaml = Object.entries(typedProfiles)
    .map(([n, p]) => profileToYaml(n, p))
    .join('\n\n');

  const yamlContent = `version: 1\n\nprofiles:\n${profileYaml}\n`;
  fs.writeFileSync(configPath, yamlContent, 'utf-8');

  console.log(`✓ Removed '${profileName}' from config`);
  console.log(`\nProfile '${profileName}' has been removed.`);
}
