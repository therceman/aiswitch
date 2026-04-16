import { setupSignalHandlers, forwardSignal } from '../src/runtime/signals';
import { ChildProcess } from 'child_process';
import { spawn } from 'child_process';

describe('signals', () => {
  describe('forwardSignal', () => {
    it('does not throw when child process is undefined', () => {
      expect(() => {
        forwardSignal({ pid: undefined } as ChildProcess, 'SIGINT');
      }).not.toThrow();
    });

    it('forwards signal to child process', () => {
      const child = spawn('sleep', ['10']);
      expect(() => {
        forwardSignal(child, 'SIGTERM');
      }).not.toThrow();
      child.kill('SIGKILL');
    });
  });

  describe('setupSignalHandlers', () => {
    it('sets up handlers for common signals', () => {
      const child = spawn('sleep', ['10']);

      expect(() => {
        setupSignalHandlers(child);
      }).not.toThrow();

      child.kill('SIGKILL');
    });
  });
});
