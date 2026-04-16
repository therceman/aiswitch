import spawn from 'cross-spawn';
import { findExecutablePath } from './resolveExecutable';

export interface SpawnOptions {
  executable: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
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
  });

  return new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
    child.on('error', (err) => {
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
    });

    let exitCode = 0;

    child.on('close', (code) => {
      exitCode = code ?? 0;
      resolve(exitCode);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${options.executable}: ${err.message}`));
    });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
    });
  });
}
