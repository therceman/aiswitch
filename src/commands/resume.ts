import { runCommand } from './run';
import { loadConfig } from '../config/load';
import { findSessionByKey, getSessions, SessionEntry, pruneStaleSessions } from './sessions';
import Enquirer from 'enquirer';

/**
 * Shared helper to resume a session entry with prompt-capable launch.
 * Builds resumeArgs, warns about missing metadata, and calls runCommand with PTY.
 */
async function resumeSession(profile: string, session: SessionEntry): Promise<number> {
  const resumeArgs =
    session.profileArgs && session.profileArgs.length > 0
      ? session.profileArgs
      : ['-s', session.id];

  if (!session.profileSessionId) {
    console.warn(
      'Warning: This session has no profile session metadata. Restoring with internal id.'
    );
    console.warn('Restart the session and save again for better restore support.');
  }

  return runCommand(profile, resumeArgs, {
    sessionKey: session.sessionKey,
    profileSessionId: session.profileSessionId,
    profileArgs: session.profileArgs,
    usePty: true,
  });
}

export async function resumeCommand(profileOrSessionKey: string): Promise<void> {
  await pruneStaleSessions();

  const found = findSessionByKey(profileOrSessionKey);

  if (found) {
    const exitCode = await resumeSession(found.profile, found.session);
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
    const keyInfo = s.sessionKey ? ` [${s.sessionKey}]` : '';
    const pidInfo = s.profileSessionId ? ` (profile: ${s.profileSessionId})` : '';
    return {
      name: s.id,
      message: `${s.id}${keyInfo}${cwdInfo}${pidInfo}`,
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
  const selectedSession = sessions.find((s) => s.id === sessionResult.session);

  if (!selectedSession) {
    console.error('Error: Selected session not found.');
    process.exit(1);
  }

  const exitCode = await resumeSession(profileOrSessionKey, selectedSession);
  process.exit(exitCode);
}
