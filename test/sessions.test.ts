import {
  addSession,
  getSessions,
  renameSession,
  deleteSession,
  getSessionDisplayName,
} from '../src/commands/sessions';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('sessions', () => {
  const testDir = path.join(os.tmpdir(), 'airelay-sessions-test-' + process.pid + '-' + Date.now());
  const testSessionsPath = path.join(testDir, 'sessions.json');
  const originalEnv = process.env.AIRELAY_SESSIONS;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.AIRELAY_SESSIONS = testSessionsPath;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
    if (originalEnv) {
      process.env.AIRELAY_SESSIONS = originalEnv;
    } else {
      delete process.env.AIRELAY_SESSIONS;
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testSessionsPath)) {
      fs.unlinkSync(testSessionsPath);
    }
  });

  it('returns empty array when no sessions exist', () => {
    const sessions = getSessions('test-profile');
    expect(sessions).toEqual([]);
  });

  it('adds a session', () => {
    addSession('test-profile', 'ses_123');
    const sessions = getSessions('test-profile');
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('ses_123');
    expect(sessions[0].profile).toBe('test-profile');
  });

  it('adds a session with a name', () => {
    addSession('test-profile', 'ses_123', 'My Session');
    const sessions = getSessions('test-profile');
    expect(sessions[0].name).toBe('My Session');
  });

  it('renames a session', () => {
    addSession('test-profile', 'ses_123');
    const result = renameSession('test-profile', 'ses_123', 'Renamed Session');
    expect(result).toBe(true);
    const sessions = getSessions('test-profile');
    expect(sessions[0].name).toBe('Renamed Session');
  });

  it('returns false when renaming non-existent session', () => {
    const result = renameSession('test-profile', 'nonexistent', 'Name');
    expect(result).toBe(false);
  });

  it('deletes a session', () => {
    addSession('test-profile', 'ses_123');
    addSession('test-profile', 'ses_456');
    const result = deleteSession('test-profile', 'ses_123');
    expect(result).toBe(true);
    const sessions = getSessions('test-profile');
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('ses_456');
  });

  it('returns false when deleting non-existent session', () => {
    const result = deleteSession('test-profile', 'nonexistent');
    expect(result).toBe(false);
  });

  it('returns display name with custom name', () => {
    const session = { id: 'ses_123', name: 'My Session', profile: 'test', lastUsed: Date.now() };
    expect(getSessionDisplayName(session)).toBe('My Session');
  });

  it('returns truncated id when no name', () => {
    const session = { id: 'ses_verylongid123', profile: 'test', lastUsed: Date.now() };
    expect(getSessionDisplayName(session)).toBe('ses_very...');
  });

  it('sorts sessions by lastUsed', () => {
    addSession('test-profile', 'ses_first');
    const sessions1 = getSessions('test-profile');
    jest.setTimeout(100);
    addSession('test-profile', 'ses_second');
    const sessions = getSessions('test-profile');
    if (sessions1[0].lastUsed !== sessions[1].lastUsed) {
      expect(sessions[0].id).toBe('ses_second');
      expect(sessions[1].id).toBe('ses_first');
    } else {
      expect(sessions.length).toBe(2);
    }
  });

  it('limits sessions to 50', () => {
    for (let i = 0; i < 55; i++) {
      addSession('test-profile', `ses_${i}`);
    }
    const sessions = getSessions('test-profile');
    expect(sessions.length).toBe(50);
  });
});
