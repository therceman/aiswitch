import { whichCommand } from '../src/commands/which';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('whichCommand', () => {
  const testDir = path.join(os.tmpdir(), 'aiswitch-which-test-' + Date.now());
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

  it('throws error with helpful message when profile not found', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  existing-profile:
    executable: opencode`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    expect(() => whichCommand('nonexistent')).toThrow('Profile not found: nonexistent');
    expect(() => whichCommand('nonexistent')).toThrow('Available profiles:');
  });

  it('shows profile details', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: echo
    cwd: ~/test
    description: Test profile
    args:
      - --verbose
    env:
      TEST_VAR: test-value`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      whichCommand('test');
    } finally {
      console.log = originalLog;
    }

    expect(logs.join('\n')).toContain('profile: test');
    expect(logs.join('\n')).toContain('executable: echo');
    expect(logs.join('\n')).toContain('executable path:');
    expect(logs.join('\n')).toContain('cwd:');
    expect(logs.join('\n')).toContain('args: --verbose');
  });

  it('masks sensitive values', () => {
    const longApiKey = 'super-secret-key-12345';
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: echo
    env:
      OPENCODE_API_KEY: ${longApiKey}`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      whichCommand('test');
    } finally {
      console.log = originalLog;
    }

    const output = logs.join('\n');
    expect(output).toMatch(/OPENCODE_API_KEY: supe\*\*\*\*2345/);
  });

  it('shows config path', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: echo`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      whichCommand('test');
    } finally {
      console.log = originalLog;
    }

    expect(logs.join('\n')).toContain(`config: ${testConfigPath}`);
  });
});
