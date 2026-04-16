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

  if (profiles.length === 0) {
    console.log('No profiles configured. Run `aiswitch init` to create one.');
    return;
  }

  const lastUsed = getLastUsedProfile();
  const initialIndex = lastUsed && profiles.includes(lastUsed) ? profiles.indexOf(lastUsed) : 0;

  const profilePrompt = {
    type: 'select',
    name: 'profile',
    message: 'Select a profile',
    choices: profiles.map((name) => {
      const profile = config.profiles[name] as Profile;
      const sessions = getSessions(name);
      const sessionsCount = sessions.length > 0 ? ` (${sessions.length} sessions)` : '';
      const desc = profile.description ? ` - ${profile.description}` : '';
      const marker = name === lastUsed ? ' (last used)' : '';
      return {
        name,
        message: `${name}${marker}${desc}${sessionsCount}`,
      };
    }),
    initial: initialIndex,
  };

  const profileResult = (await Enquirer.prompt(profilePrompt)) as { profile: string };
  const profileName = profileResult.profile;

  const sessions = getSessions(profileName);
  let selectedSessionId: string | undefined;

  if (sessions.length > 0) {
    const sessionChoices = [
      { name: '', message: '<skip session selection>' },
      ...sessions.map((s) => ({
        name: s.id,
        message: `${getSessionDisplayName(s)} (${s.id.slice(0, 8)}...)`,
      })),
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
      message: 'Additional args (or press enter to use session)',
      initial: `-s ${selectedSessionId}`,
    };
    const argsResult = (await Enquirer.prompt(argsPrompt)) as { args: string };
    extraArgs = argsResult.args.trim() ? argsResult.args.split(' ') : [];
  } else {
    const argsPrompt = {
      type: 'input',
      name: 'args',
      message: 'Additional args (e.g., -s session-id)',
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
  if (selectedSessionId) {
    addSession(profileName, selectedSessionId);
  }
  const exitCode = await runCommand(profileName, extraArgs);
  process.exit(exitCode);
}
