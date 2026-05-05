import * as pty from 'node-pty';

export interface PtyOptions {
  file: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface PtyInstance {
  write(data: string): void;
  pid: number;
  exitCode: Promise<number>;
  kill(signal?: string): void;
  resize(cols: number, rows: number): void;
}

export function createPty(options: PtyOptions): PtyInstance {
  const cols = process.stdout.isTTY ? process.stdout.columns : 80;
  const rows = process.stdout.isTTY ? process.stdout.rows : 24;

  const term = pty.spawn(options.file, options.args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: options.cwd,
    env: { ...process.env, ...options.env } as { [key: string]: string },
  });

  // Forward PTY output to parent's stdout
  term.onData((data: string) => {
    process.stdout.write(data);
  });

  // Forward parent's stdin to PTY (raw mode for proper TTY handling)
  const cleanups: (() => void)[] = [];

  if (process.stdin.isTTY) {
    process.stdin.setRawMode?.(true);
    const onStdinData = (chunk: Buffer) => {
      term.write(chunk.toString());
    };
    process.stdin.on('data', onStdinData);
    cleanups.push(() => {
      try {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener('data', onStdinData);
      } catch {
        // Ignore cleanup errors
      }
    });
  }

  // Forward terminal resize events to PTY
  if (process.stdout.isTTY) {
    const onResize = (): void => {
      const c = process.stdout.columns;
      const r = process.stdout.rows;
      if (c && r) {
        term.resize(c, r);
      }
    };
    process.stdout.on('resize', onResize);
    cleanups.push(() => {
      try {
        process.stdout.removeListener('resize', onResize);
      } catch {
        // Ignore cleanup errors
      }
    });
  }

  const runCleanups = (): void => {
    for (const fn of cleanups) {
      fn();
    }
  };

  const exitPromise = new Promise<number>((resolve) => {
    term.onExit((ev: { exitCode: number; signal?: number }) => {
      runCleanups();
      resolve(ev.exitCode);
    });
  });

  return {
    write: (data: string) => term.write(data),
    pid: term.pid,
    exitCode: exitPromise,
    kill: (signal?: string) => term.kill(signal),
    resize: (cols: number, rows: number) => term.resize(cols, rows),
  };
}
