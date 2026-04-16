import fs from 'fs';
import path from 'path';
import os from 'os';
import Enquirer from 'enquirer';
import { loadConfig } from '../config/load';
import { Profile } from '../config/schema';
import { runCommand } from './run';
import {
  getSessions,
  getSessionDisplayName,
  addSession,
  renameSession,
  deleteSession,
} from './sessions';
import { detectHarness, getArgsHelpMessage } from '../utils/harness';
import { createCommandInteractive } from './create-interactive';

function getLastUsedFilePath(): string {
  return process.env.AIUSE_LAST_USED || path.join(os.homedir(), '.aiswitch', 'last-used.json');
}

interface LastUsedData {
  profile: string;
  timestamp: number;
}

export function getLastUsedProfile(): string | null {
  try {
    const lastUsedFile = getLastUsedFilePath();
    if (!fs.existsSync(lastUsedFile)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(lastUsedFile, 'utf-8')) as LastUsedData;
    return data.profile || null;
  } catch {
    return null;
  }
}

export function setLastUsedProfile(profileName: string): void {
  try {
    const lastUsedFile = getLastUsedFilePath();
    const dir = path.dirname(lastUsedFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data: LastUsedData = {
      profile: profileName,
      timestamp: Date.now(),
    };
    fs.writeFileSync(lastUsedFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore errors when saving last-used
  }
}

export async function selectCommand(): Promise<void> {
  const config = loadConfig();
  const profiles = Object.keys(config.profiles).sort();

  const mainChoices = [
    { name: 'Load', message: 'Load an existing profile' },
    { name: 'Create', message: 'Create a new profile' },
  ];

  const mainPrompt = {
    type: 'select',
    name: 'action',
    message: 'Select an option',
    choices: mainChoices,
    initial: 0,
  };

  const mainResult = (await Enquirer.prompt(mainPrompt)) as { action: string };
  const action = mainResult.action;

  if (action === 'Create') {
    await createCommandInteractive();
    return;
  }

  if (profiles.length === 0) {
    console.log('No profiles configured.');
    await createCommandInteractive();
    return;
  }

  const DEFAULT_PROFILES = ['opencode', 'codex'];
  const customProfiles = profiles.filter((p) => !DEFAULT_PROFILES.includes(p));
  const defaultProfiles = profiles.filter((p) => DEFAULT_PROFILES.includes(p));
  const sortedProfiles = [...customProfiles, ...defaultProfiles];

  const lastUsed = getLastUsedProfile();
  const initialIndex =
    lastUsed && sortedProfiles.includes(lastUsed) ? sortedProfiles.indexOf(lastUsed) : 0;

  const profilePrompt = {
    type: 'autocomplete',
    name: 'profile',
    message: 'Select a profile',
    limit: 10,
    initial: initialIndex,
    choices: sortedProfiles.map((name) => {
      const profile = config.profiles[name] as Profile;
      const sessions = getSessions(name);
      const sessionsCount = sessions.length > 0 ? ` (${sessions.length} sessions)` : '';
      const isDefault = DEFAULT_PROFILES.includes(name);
      const defaultMarker = isDefault ? ' (Default)' : '';
      const lastUsedMarker = name === lastUsed ? ' (last used)' : '';
      const desc =
        profile.description &&
        profile.description !== `${name} profile` &&
        profile.description !== `${name}profile`
          ? ` - ${profile.description}`
          : '';
      return {
        name,
        message: `${name}${defaultMarker}${lastUsedMarker}${desc}${sessionsCount}`,
      };
    }),
  };

  const profileResult = (await Enquirer.prompt(profilePrompt)) as { profile: string };
  const profileName = profileResult.profile;
  const profile = config.profiles[profileName] as Profile;
  const harness = detectHarness(profile.executable);

  const sessions = getSessions(profileName);
  let selectedSessionId: string | undefined;

  if (sessions.length > 0) {
    const sessionChoices = [
      { name: '', message: '<skip session selection>' },
      ...sessions.map((s) => {
        const cwdInfo = s.cwd ? ` ${s.cwd}` : '';
        const nameInfo = s.name ? ` (${s.name})` : '';
        return {
          name: s.id,
          message: `${s.id}${cwdInfo}${nameInfo}`,
        };
      }),
      { name: '__rename__', message: '[R] Rename a session' },
      { name: '__delete__', message: '[D] Delete a session' },
    ];

    const sessionPrompt = {
      type: 'select',
      name: 'session',
      message: 'Select a session',
      choices: sessionChoices,
      initial: 0,
    };

    const enquirer = new Enquirer();
    let sessionResult: { session: string };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      sessionResult = (await enquirer.prompt(sessionPrompt)) as { session: string };

      if (sessionResult.session === '') {
        break;
      }

      if (sessionResult.session === '__rename__') {
        const renamePrompt = {
          type: 'select',
          name: 'rename',
          message: 'Select session to rename',
          choices: sessions.map((s) => ({
            name: s.id,
            message: getSessionDisplayName(s),
          })),
        };
        const renameResult = (await enquirer.prompt(renamePrompt)) as { rename: string };

        const namePrompt = {
          type: 'input',
          name: 'name',
          message: 'New name for session',
          initial: sessions.find((s) => s.id === renameResult.rename)?.name || '',
        };
        const nameResult = (await enquirer.prompt(namePrompt)) as { name: string };

        if (nameResult.name.trim()) {
          renameSession(profileName, renameResult.rename, nameResult.name.trim());
          console.log(`Renamed session to: ${nameResult.name.trim()}`);
        }
        continue;
      }

      if (sessionResult.session === '__delete__') {
        const deletePrompt = {
          type: 'select',
          name: 'delete',
          message: 'Select session to delete',
          choices: sessions.map((s) => ({
            name: s.id,
            message: getSessionDisplayName(s),
          })),
        };
        const deleteResult = (await enquirer.prompt(deletePrompt)) as { delete: string };

        const confirmPrompt = {
          type: 'confirm',
          name: 'confirm',
          message: `Delete session "${getSessionDisplayName(sessions.find((s) => s.id === deleteResult.delete)!)}"?`,
          initial: false,
        };
        const confirmResult = (await enquirer.prompt(confirmPrompt)) as { confirm: boolean };

        if (confirmResult.confirm) {
          deleteSession(profileName, deleteResult.delete);
          console.log('Session deleted');
          sessions.splice(
            sessions.findIndex((s) => s.id === deleteResult.delete),
            1
          );
        }
        continue;
      }

      const selectedSession = sessions.find((s) => s.id === sessionResult.session);
      if (selectedSession) {
        selectedSessionId = selectedSession.id;
        break;
      }
    }
  }

  let extraArgs: string[] = [];
  if (selectedSessionId) {
    const argsPrompt = {
      type: 'input',
      name: 'args',
      message: getArgsHelpMessage(harness, true),
      initial: `-s ${selectedSessionId}`,
    };
    const argsResult = (await Enquirer.prompt(argsPrompt)) as { args: string };
    extraArgs = argsResult.args.trim() ? argsResult.args.split(' ') : [];
  } else {
    const sessionExample = getArgsHelpMessage(harness, false);
    const argsPrompt = {
      type: 'input',
      name: 'args',
      message: sessionExample,
      initial: '',
    };
    const argsResult = (await Enquirer.prompt(argsPrompt)) as { args: string };
    extraArgs = argsResult.args.trim() ? argsResult.args.split(' ') : [];
  }

  const confirmPrompt = {
    type: 'confirm',
    name: 'confirm',
    message: `Run aiswitch ${profileName}${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}?`,
    initial: true,
  };

  const confirmResult = (await Enquirer.prompt(confirmPrompt)) as { confirm: boolean };

  if (!confirmResult.confirm) {
    console.log('Cancelled');
    return;
  }

  setLastUsedProfile(profileName);
  const currentCwd = process.cwd();
  if (selectedSessionId) {
    addSession(profileName, selectedSessionId, undefined, currentCwd);
  }

  const exitCode = await runCommand(profileName, extraArgs);

  console.log('\n');
  const sessionPrompt = {
    type: 'input',
    name: 'sessionId',
    message: 'Session ID to save (or press enter to skip)',
  };
  const sessionResult = (await Enquirer.prompt(sessionPrompt)) as { sessionId: string };
  if (sessionResult.sessionId.trim()) {
    const namePrompt = {
      type: 'input',
      name: 'name',
      message: 'Session name (optional)',
    };
    const nameResult = (await Enquirer.prompt(namePrompt)) as { name: string };
    addSession(
      profileName,
      sessionResult.sessionId.trim(),
      nameResult.name.trim() || undefined,
      currentCwd
    );
    console.log(`Session saved: ${nameResult.name.trim() || sessionResult.sessionId.trim()}`);
  }

  process.exit(exitCode);
}
