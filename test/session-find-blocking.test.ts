import { sessionFindCommand } from '../src/commands/session-find';

jest.mock('../src/commands/sessions', () => ({
  findSessionByKey: jest.fn(),
  pruneStaleSessions: jest.fn().mockResolvedValue(0),
}));

jest.mock('../src/commands/session-viewport', () => ({
  fetchSessionViewport: jest.fn().mockResolvedValue({ lines: ['visible line'] }),
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
      id: 'ses_test_123',
      sessionKey: 'testprof_key',
      profile: 'testprof',
      lastUsed: Date.now(),
    },
  });
}

describe('sessionFindCommand version parity blocking', () => {
  it('major mismatch returns non-zero before viewport fetch', async () => {
    (preflightVersionCheck as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'Version incompatible',
      warnings: [],
    });
    mockSessionFound();

    const exitCode = await sessionFindCommand('testprof_key', 'pattern');
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Version incompatible'));
  });

  it('same-major older warns and proceeds', async () => {
    (preflightVersionCheck as jest.Mock).mockResolvedValue({
      ok: true,
      warnings: ['Controller is older than CLI.'],
    });
    mockSessionFound();

    const exitCode = await sessionFindCommand('testprof_key', 'visible');
    expect(exitCode).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('older'));
  });
});
