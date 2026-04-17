import spawn from 'cross-spawn';
import { findExecutablePath } from './resolveExecutable';
import { registerPID, unregisterPID } from '../utils/pid';

export interface SpawnOptions {
  executable: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  profile?: string;
  trackPID?: boolean;
}

export interface SpawnResult {
  exitCode: number;
  output: string;
}

export function spawnProcess(options: SpawnOptions): number {
  const execPath = findExecutablePath(options.executable);

  const child = spawn(execPath, options.args || [], {
    cwd: options.cwd,
    env: options.env as Record<string, string> & NodeJS.ProcessEnv,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
    detached: false,
  });

  // Track PID if requested
  if (options.trackPID && child.pid) {
    registerPID(child.pid, options.executable, options.args || [], options.profile);
  }

  return new Promise<number>((resolve) => {
    child.on('close', (code) => {
      if (options.trackPID && child.pid) {
        unregisterPID(child.pid);
      }
      resolve(code ?? 0);
    });
    child.on('error', (err) => {
      if (options.trackPID && child.pid) {
        unregisterPID(child.pid);
      }
      console.error(`Failed to spawn ${options.executable}: ${err.message}`);
      process.exit(1);
    });
  }) as unknown as number;
}

export function spawnAndWait(options: SpawnOptions): Promise<number> {
  const execPath = findExecutablePath(options.executable);

  return new Promise<number>((resolve, reject) => {
    const child = spawn(execPath, options.args || [], {
      cwd: options.cwd,
      env: options.env as Record<string, string> & NodeJS.ProcessEnv,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      detached: false,
    });

    // Track PID if requested
    if (options.trackPID && child.pid) {
      registerPID(child.pid, options.executable, options.args || [], options.profile);
    }

    let exitCode = 0;

    child.on('close', (code) => {
      exitCode = code ?? 0;
      if (options.trackPID && child.pid) {
        unregisterPID(child.pid);
      }
      resolve(exitCode);
    });

    child.on('error', (err) => {
      if (options.trackPID && child.pid) {
        unregisterPID(child.pid);
      }
      reject(new Error(`Failed to spawn ${options.executable}: ${err.message}`));
    });

    child.on('exit', (code, signal) => {
      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        // Normal termination from user interrupt
        return;
      }
      if (code !== 0 && code !== null) {
        // Non-zero exit - might be terminal issue
        console.log('\n');
      }
    });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  });
}
