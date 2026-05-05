import { loadConfig, getConfigPath } from '../config/load';
import { Profile } from '../config/schema';
import { resolvePath, isPathLike } from '../config/paths';
import { buildEnv } from '../runtime/env';
import { spawnAndWait, SpawnOptions } from '../runtime/spawn';
import { SessionController } from '../controller';
import { IpcError, IpcErrorCodes } from '../types/controller';
import { addSession, deleteSession } from './sessions';
import fs from 'fs';

function generateSessionKey(profileName: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${profileName}_${suffix}`;
}

export interface RunStartInfo {
  sessionKey: string;
  controllerEndpoint: string;
}

function buildProfileEnv(
  profileName: string,
  extraArgs: string[]
): {
  profile: Profile;
  cwd: string;
  env: Record<string, string>;
  args: string[];
} {
  const config = loadConfig();
  const configPath = getConfigPath();

  const profile = config.profiles[profileName] as Profile | undefined;
  if (!profile) {
    const availableProfiles = Object.keys(config.profiles).join(', ');
    throw new Error(
      `Profile not found: ${profileName}\nAvailable profiles: ${availableProfiles || 'none'}\nRun 'airelay create <name>' to create a new profile.`
    );
  }

  const cwd = profile.cwd ? resolvePath(profile.cwd) : process.cwd();
  ensureDirectories(profile, cwd);

  return {
    profile,
    cwd,
    env: buildEnv(profile, configPath),
    args: [...(profile.args || []), ...extraArgs],
  };
}

function setupController(
  sessionKey: string,
  childStdin: { current: NodeJS.WritableStream | null },
  ptyWrite: { current: ((data: string) => void) | null }
) {
  const controller = new SessionController(sessionKey);

  controller.onRequest(async (request) => {
    if (request.method === 'session.input') {
      const params = request.params as { text?: string; enter?: boolean };
      const text = params.text || '';
      const appendNewline = params.enter !== false;

      if (ptyWrite.current) {
        ptyWrite.current(text);
        if (appendNewline) {
          // PTY raw mode: Enter key sends carriage return (\r), not line feed (\n)
          ptyWrite.current('\r');
        }
        return { delivered: true, sessionKey };
      }

      if (childStdin.current) {
        childStdin.current.write(text);
        if (appendNewline) {
          childStdin.current.write('\n');
        }
        return { delivered: true, sessionKey };
      }

      throw new IpcError(
        IpcErrorCodes.INTERNAL_ERROR,
        'Prompt injection unavailable: this session is not in a promptable mode. Use "airelay start <profile>" for prompt-capable sessions.'
      );
    }
    if (request.method === 'session.info') {
      return { sessionKey, active: !!(ptyWrite.current || childStdin.current) };
    }
    return { handled: false };
  });

  return controller;
}

export async function runCommand(
  profileName: string,
  extraArgs: string[],
  options?: {
    usePty?: boolean;
    sessionKey?: string;
    onSessionStart?: (info: RunStartInfo) => void;
  }
): Promise<number> {
  const { profile, cwd, env, args } = buildProfileEnv(profileName, extraArgs);

  const sessionKey = options?.sessionKey || generateSessionKey(profileName);
  const childStdinRef: { current: NodeJS.WritableStream | null } = { current: null };
  const ptyWriteRef: { current: ((data: string) => void) | null } = { current: null };
  const controller = setupController(sessionKey, childStdinRef, ptyWriteRef);

  let controllerStarted = false;
  try {
    await controller.start();
    controllerStarted = true;
  } catch {
    // Controller start failure is non-fatal; session runs without IPC
  }

  if (controllerStarted && options?.onSessionStart) {
    options.onSessionStart({ sessionKey, controllerEndpoint: controller.endpointPath });
  }

  addSession(profileName, sessionKey, undefined, cwd, sessionKey, controller.endpointPath);

  const usePty = options?.usePty === true;

  const spawnOpts: SpawnOptions = {
    executable: profile.executable,
    args,
    cwd,
    env,
    profile: profileName,
    trackPID: true,
    usePty,
  };

  if (usePty) {
    spawnOpts.onPtyReady = (pty) => {
      ptyWriteRef.current = pty.write;
    };
  }

  try {
    const exitCode = await spawnAndWait(spawnOpts);

    return exitCode;
  } catch (e: unknown) {
    if ((e as Error).message?.includes('Failed to spawn')) {
      console.error('\nError: Failed to start harness.');
      console.error('If your terminal appears corrupted or unresponsive:');
      console.error('  1. Try resizing the terminal window');
      console.error('  2. Run `reset` command');
      console.error('  3. Restart the terminal');
      console.error('\nThis can happen when TUI apps leave the terminal in an inconsistent state.');
    }
    throw e;
  } finally {
    await controller.stop();
    deleteSession(profileName, sessionKey);
  }
}

function ensureDirectories(profile: Profile, cwd?: string): void {
  const dirs: string[] = [];

  if (cwd && fs.existsSync(cwd)) {
    dirs.push(cwd);
  }

  if (profile.createDirs) {
    for (const d of profile.createDirs) {
      dirs.push(resolvePath(d));
    }
  }

  if (profile.env) {
    for (const [key, value] of Object.entries(profile.env)) {
      if (isPathLike(key)) {
        dirs.push(resolvePath(value));
      }
    }
  }

  for (const dir of dirs) {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
