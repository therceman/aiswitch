import { getLastUsedProfile, setLastUsedProfile } from '../src/commands/select';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('last-used tracking', () => {
  const testDir = path.join(
    os.tmpdir(),
    'aiswitch-lastused-test-' + process.pid + '-' + Date.now()
  );
  const testLastUsedPath = path.join(testDir, 'last-used.json');
  const originalEnv = process.env.AIUSE_LAST_USED;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.AIUSE_LAST_USED = testLastUsedPath;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
    if (originalEnv) {
      process.env.AIUSE_LAST_USED = originalEnv;
    } else {
      delete process.env.AIUSE_LAST_USED;
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testLastUsedPath)) {
      fs.unlinkSync(testLastUsedPath);
    }
  });

  it('returns null when no last-used file exists', () => {
    expect(getLastUsedProfile()).toBeNull();
  });

  it('saves and retrieves last-used profile', () => {
    setLastUsedProfile('my-profile');
    const profile = getLastUsedProfile();
    expect(profile).toBe('my-profile');
  });

  it('returns null for corrupted file', () => {
    fs.writeFileSync(testLastUsedPath, 'invalid json', 'utf-8');
    expect(getLastUsedProfile()).toBeNull();
  });

  it('creates directory if missing', () => {
    const nestedDir = path.join(testDir, 'nested-dir-' + Date.now());
    const nestedPath = path.join(nestedDir, 'last-used.json');
    const savedEnv = process.env.AIUSE_LAST_USED;
    process.env.AIUSE_LAST_USED = nestedPath;

    setLastUsedProfile('test-profile');

    expect(fs.existsSync(nestedPath)).toBe(true);

    process.env.AIUSE_LAST_USED = savedEnv;
    fs.rmSync(nestedDir, { recursive: true });
  });
});
