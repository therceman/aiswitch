import { heartbeatCommand } from '../src/commands/heartbeat';
import { promptCommand } from '../src/commands/prompt';

jest.mock('../src/commands/prompt', () => ({
  promptCommand: jest.fn(),
}));

const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  (promptCommand as jest.Mock).mockResolvedValue(0);
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  jest.clearAllMocks();
  // Clean up any SIGINT/SIGTERM listeners left by heartbeatCommand
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
});

// Helper: wait for microtask + some time for the heartbeat loop to advance
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

describe('heartbeatCommand', () => {
  it('sends heartbeat payload and exits cleanly on SIGINT', async () => {
    const exitPromise = heartbeatCommand('test_session', { intervalMs: 5 });

    // Let the first heartbeat send
    await tick(30);
    process.emit('SIGINT');
    const exitCode = await exitPromise;

    expect(exitCode).toBe(0);
    expect(promptCommand).toHaveBeenCalledWith(
      'test_session',
      '[from=cron] heartbeat',
      expect.objectContaining({ enter: true })
    );
  });

  it('uses intervalMs from options', async () => {
    const exitPromise = heartbeatCommand('test_session', { intervalMs: 5 });
    await tick(30);
    process.emit('SIGINT');
    await exitPromise;

    // With 5ms interval, should have sent at least once
    expect(promptCommand).toHaveBeenCalledTimes(1);
  });

  it('returns non-zero when promptCommand fails', async () => {
    (promptCommand as jest.Mock).mockResolvedValue(1);

    const exitPromise = heartbeatCommand('test_session', { intervalMs: 5 });
    await tick(30);
    process.emit('SIGINT');
    const exitCode = await exitPromise;

    // The heartbeat failed on first send (promptCommand returned 1)
    // but SIGINT may have also fired — allow either 1 (failure) or 0 (interrupted)
    expect(exitCode).toBe(1);
  });

  it('passes noWarn option to promptCommand', async () => {
    const exitPromise = heartbeatCommand('test_session', {
      intervalMs: 5,
      noWarn: true,
    });
    await tick(30);
    process.emit('SIGINT');
    await exitPromise;

    expect(promptCommand).toHaveBeenCalledWith(
      'test_session',
      '[from=cron] heartbeat',
      expect.objectContaining({ noWarn: true })
    );
  });

  it('prints lifecycle logs', async () => {
    const exitPromise = heartbeatCommand('test_session', { intervalMs: 5 });
    await tick(30);
    process.emit('SIGINT');
    await exitPromise;

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Heartbeat started'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('heartbeat sent'));
  });

  it('heartbeat payload is exactly [from=cron] heartbeat', async () => {
    const exitPromise = heartbeatCommand('test_session', { intervalMs: 5 });
    await tick(30);
    process.emit('SIGINT');
    await exitPromise;

    expect(promptCommand).toHaveBeenCalledWith(
      'test_session',
      '[from=cron] heartbeat',
      expect.any(Object)
    );
  });
});
