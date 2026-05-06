import { sessionStatusCommand } from '../src/commands/session-status';

jest.mock('../src/commands/sessions', () => ({
  findSessionByKey: jest.fn(),
}));

jest.mock('../src/commands/session-output', () => ({
  fetchSessionOutput: jest.fn().mockResolvedValue({ lines: [] }),
}));

jest.mock('../src/commands/session-ipc', () => ({
  preflightVersionCheck: jest.fn().mockResolvedValue({ ok: true, warnings: [] }),
}));

import { findSessionByKey } from '../src/commands/sessions';
import { preflightVersionCheck } from '../src/commands/session-ipc';

const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  (preflightVersionCheck as jest.Mock).mockResolvedValue({ ok: true, warnings: [] });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

function mockSessionFound(): void {
  (findSessionByKey as jest.Mock).mockReturnValue({
    profile: 'testprof',
    session: {
      id: 'ses_status_test',
      sessionKey: 'status_key',
      profile: 'testprof',
      lastUsed: Date.now(),
    },
  });
}

describe('sessionStatusCommand version parity blocking', () => {
  it('major mismatch returns non-zero before action', async () => {
    (preflightVersionCheck as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'Version incompatible',
      warnings: [],
    });
    mockSessionFound();

    const exitCode = await sessionStatusCommand('status_key');
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Version incompatible'));
  });

  it('same-major older warns and proceeds', async () => {
    (preflightVersionCheck as jest.Mock).mockResolvedValue({
      ok: true,
      warnings: ['Controller is older than CLI.'],
    });
    mockSessionFound();

    const exitCode = await sessionStatusCommand('status_key');
    expect(exitCode).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('older'));
  });
});
