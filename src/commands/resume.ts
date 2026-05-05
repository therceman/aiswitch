import { runCommand } from './run';
import { loadConfig } from '../config/load';
import { findSessionByKey, getSessions } from './sessions';
import Enquirer from 'enquirer';

export async function resumeCommand(profileOrSessionKey: string): Promise<void> {
  // First, try to find by session key or ID
  const found = findSessionByKey(profileOrSessionKey);

  if (found) {
    // Resume the found session directly; reuse its sessionKey for stable controller binding
    const args = [`-s`, found.session.id];
    const exitCode = await runCommand(found.profile, args, {
      sessionKey: found.session.sessionKey,
    });
    process.exit(exitCode);
    return;
  }

  // Not found as session key/ID, check if it's a profile name
  const config = loadConfig();
  if (!config.profiles[profileOrSessionKey]) {
    console.error(`Error: Profile or session not found: ${profileOrSessionKey}`);
    console.error('Usage: airelay resume <profile|session-key>');
    process.exit(1);
  }

  // It's a profile name - show session selector
  const sessions = getSessions(profileOrSessionKey);
  if (sessions.length === 0) {
    console.error(`No existing sessions for profile: ${profileOrSessionKey}`);
    process.exit(1);
  }

  const sessionChoices = sessions.map((s) => {
    const cwdInfo = s.cwd ? ` ${s.cwd}` : '';
    const nameInfo = s.name ? ` (${s.name})` : '';
    const keyInfo = s.sessionKey ? ` [${s.sessionKey}]` : '';
    return {
      name: s.id,
      message: `${s.id}${keyInfo}${cwdInfo}${nameInfo}`,
    };
  });

  const sessionPrompt = {
    type: 'select',
    name: 'session',
    message: 'Select a session to resume',
    choices: sessionChoices,
    initial: 0,
  };

  const sessionResult = (await Enquirer.prompt(sessionPrompt)) as { session: string };
  const args = [`-s`, sessionResult.session];
  const selectedSession = sessions.find((s) => s.id === sessionResult.session);
  const exitCode = await runCommand(profileOrSessionKey, args, {
    sessionKey: selectedSession?.sessionKey,
  });
  process.exit(exitCode);
}
