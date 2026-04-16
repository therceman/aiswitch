import { ChildProcess } from 'child_process';

export function forwardSignal(child: ChildProcess, signal: string): void {
  if (child.pid) {
    try {
      process.kill(child.pid, signal);
    } catch {
      // Ignore errors when killing process
    }
  }
}

export function setupSignalHandlers(child: ChildProcess): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  for (const sig of signals) {
    process.on(sig, () => {
      forwardSignal(child, sig);
    });
  }
}
