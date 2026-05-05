import { sessionsListCommand, sessionsListJson } from '../src/commands/sessions-list';
import { addSession } from '../src/commands/sessions';
import fs from 'fs';
import path from 'path';
import os from 'os';

const testDir = path.join(
  os.tmpdir(),
  'airelay-sessions-list-test-' + process.pid + '-' + Date.now()
);
const testSessionsPath = path.join(testDir, 'sessions.json');
const originalSessions = process.env.AIRELAY_SESSIONS;

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
  process.env.AIRELAY_SESSIONS = testSessionsPath;
});

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
  if (originalSessions) {
    process.env.AIRELAY_SESSIONS = originalSessions;
  } else {
    delete process.env.AIRELAY_SESSIONS;
  }
});

beforeEach(() => {
  if (fs.existsSync(testSessionsPath)) {
    fs.unlinkSync(testSessionsPath);
  }
});

const originalLog = console.log;
beforeEach(() => {
  console.log = jest.fn();
});
afterEach(() => {
  console.log = originalLog;
});

describe('sessionsListCommand', () => {
  it('shows no sessions when empty', async () => {
    await sessionsListCommand();
    expect(console.log).toHaveBeenCalledWith('No sessions found.');
  });

  it('lists all sessions in human-readable format', async () => {
    addSession('testprof', 'ses_abc', 'My Session', '/home/user/proj', 'testprof_key1');
    addSession('otherprof', 'ses_def', undefined, undefined, 'otherprof_key2');

    await sessionsListCommand();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ses_abc'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('testprof'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ses_def'));
  });

  it('outputs JSON when --json flag is set', async () => {
    addSession('testprof', 'ses_json_1', undefined, '/tmp/work', 'json_key1');

    await sessionsListCommand({ json: true });

    expect(console.log).toHaveBeenCalled();
    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].sessionId).toBe('ses_json_1');
    expect(parsed[0].profile).toBe('testprof');
  });
});

describe('sessionsListJson', () => {
  it('returns empty array when no sessions', () => {
    const result = sessionsListJson();
    expect(result).toEqual([]);
  });

  it('returns all sessions as flattened array', () => {
    addSession('prof_a', 'ses_first', undefined, '/tmp/a', 'key_a');
    addSession('prof_b', 'ses_second', undefined, '/tmp/b', 'key_b');

    const result = sessionsListJson();
    expect(result.length).toBe(2);
    expect(result.map((r) => r.sessionId)).toContain('ses_first');
    expect(result.map((r) => r.sessionId)).toContain('ses_second');
  });

  it('includes mandatory fields', () => {
    addSession('myprof', 'ses_fields', undefined, '/home/user/work', 'field_key');

    const result = sessionsListJson();
    expect(result[0]).toMatchObject({
      sessionId: 'ses_fields',
      profile: 'myprof',
      cwd: expect.any(String),
    });
  });

  it('normalizes cwd with ~ for home directory paths', () => {
    const home = os.homedir();
    addSession('myprof', 'ses_home', undefined, `${home}/project/docs`, 'home_key');

    const result = sessionsListJson();
    expect(result[0].cwd).toBe('~/project/docs');
  });

  it('does not modify non-home paths in cwd', () => {
    addSession('myprof', 'ses_tmp', undefined, '/tmp/work', 'tmp_key');

    const result = sessionsListJson();
    expect(result[0].cwd).toBe('/tmp/work');
  });
});
