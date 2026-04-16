import { listCommand, listCommandJson } from '../src/commands/list';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('listCommand', () => {
  const testDir = path.join(os.tmpdir(), 'aiswitch-list-test-' + Date.now());
  const testConfigPath = path.join(testDir, 'config.yaml');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  beforeEach(() => {
    delete process.env.AIUSE_CONFIG;
  });

  afterEach(() => {
    delete process.env.AIUSE_CONFIG;
  });

  it('lists profiles sorted alphabetically', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  zebra:
    executable: opencode
  alpha:
    executable: codex`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      listCommand();
    } finally {
      console.log = originalLog;
    }

    expect(logs.join('\n')).toContain('alpha');
    expect(logs.join('\n')).toContain('zebra');
    const alphaIndex = logs.indexOf('alpha');
    const zebraIndex = logs.indexOf('zebra');
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  it('shows profile details', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: opencode
    cwd: ~/test
    description: Test profile
    args:
      - --verbose`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      listCommand();
    } finally {
      console.log = originalLog;
    }

    expect(logs).toContain('test');
    expect(logs).toContain('  executable: opencode');
    expect(logs).toContain('  cwd: ~/test');
    expect(logs).toContain('  description: Test profile');
    expect(logs).toContain('  args: --verbose');
  });

  it('listCommandJson returns profiles object', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: opencode
    description: Test`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const profiles = listCommandJson();
    expect(profiles.test).toBeDefined();
    expect(profiles.test.executable).toBe('opencode');
    expect(profiles.test.description).toBe('Test');
  });
});
