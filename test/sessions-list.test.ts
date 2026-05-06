import {
  sessionsListCommand,
  sessionsListJson,
  setCurrentCwd,
} from '../src/commands/sessions-list';
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
    addSession('testprof', 'ses_abc', '/home/user/proj', 'testprof_key1');
    addSession('otherprof', 'ses_def', undefined, 'otherprof_key2');

    await sessionsListCommand();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ses_abc'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('testprof'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ses_def'));
  });

  it('outputs JSON when --json flag is set', async () => {
    addSession('testprof', 'ses_json_1', '/tmp/work', 'json_key1');

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
  it('returns empty array when no sessions', async () => {
    const result = await sessionsListJson();
    expect(result).toEqual([]);
  });

  it('returns all sessions as flattened array', async () => {
    addSession('prof_a', 'ses_first', '/tmp/a', 'key_a');
    addSession('prof_b', 'ses_second', '/tmp/b', 'key_b');

    const result = await sessionsListJson();
    expect(result.length).toBe(2);
    expect(result.map((r) => r.sessionId)).toContain('ses_first');
    expect(result.map((r) => r.sessionId)).toContain('ses_second');
  });

  it('includes mandatory fields', async () => {
    addSession('myprof', 'ses_fields', '/home/user/work', 'field_key');

    const result = await sessionsListJson();
    expect(result[0]).toMatchObject({
      sessionId: 'ses_fields',
      profile: 'myprof',
      cwd: expect.any(String),
    });
  });

  it('normalizes cwd with ~ for home directory paths', async () => {
    const home = os.homedir();
    addSession('myprof', 'ses_home', `${home}/project/docs`, 'home_key');

    const result = await sessionsListJson();
    expect(result[0].cwd).toBe('~/project/docs');
  });

  it('does not modify non-home paths in cwd', async () => {
    addSession('myprof', 'ses_tmp', '/tmp/work', 'tmp_key');

    const result = await sessionsListJson();
    expect(result[0].cwd).toBe('/tmp/work');
  });

  it('includes pid when present', async () => {
    addSession('myprof', 'ses_pid', undefined, 'pid_key', undefined, process.pid);

    const result = await sessionsListJson();
    expect(result.find((r) => r.sessionId === 'ses_pid')?.pid).toBe(process.pid);
  });

  it('pid is undefined when not set', async () => {
    addSession('myprof', 'ses_nopid', undefined, 'nopid_key');

    const result = await sessionsListJson();
    expect(result.find((r) => r.sessionId === 'ses_nopid')?.pid).toBeUndefined();
  });

  describe('--cwd filter', () => {
    const origDir = process.cwd();

    beforeEach(() => {
      setCurrentCwd('/home/user/project');
    });

    afterAll(() => {
      setCurrentCwd(origDir);
    });

    it('filters sessions to matching cwd', async () => {
      addSession('prof_a', 'ses_match', '/home/user/project', 'key_match');
      addSession('prof_b', 'ses_other', '/other/path', 'key_other');

      await sessionsListCommand({ cwd: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ses_match'));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('ses_other'));
    });

    it('shows no sessions when nothing matches cwd', async () => {
      addSession('prof_a', 'ses_only', '/somewhere/else', 'key_only');

      await sessionsListCommand({ cwd: true });

      expect(console.log).toHaveBeenCalledWith('No sessions found.');
    });

    it('works with --json flag', async () => {
      addSession('prof_a', 'ses_json', '/home/user/project', 'key_json');

      await sessionsListCommand({ cwd: true, json: true });

      const output = (console.log as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.length).toBe(1);
      expect(parsed[0].sessionId).toBe('ses_json');
    });
  });
});
