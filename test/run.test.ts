import { runCommand } from '../src/commands/run';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('runCommand', () => {
  const testDir = path.join(os.tmpdir(), 'airelay-run-test-' + Date.now());
  const testConfigPath = path.join(testDir, 'config.yaml');

  const originalLog = console.log;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    console.log = () => {};
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
    console.log = originalLog;
  });

  beforeEach(() => {
    delete process.env.AIRELAY_CONFIG;
  });

  afterEach(() => {
    delete process.env.AIRELAY_CONFIG;
  });

  it('throws error with helpful message when profile not found', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  existing-profile:
    executable: opencode`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    await expect(runCommand('nonexistent', [])).rejects.toThrow('Profile not found: nonexistent');
    await expect(runCommand('nonexistent', [])).rejects.toThrow('Available profiles:');
    await expect(runCommand('nonexistent', [])).rejects.toThrow('existing-profile');
  });

  it('throws error when executable not found', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: nonexistent-executable`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    await expect(runCommand('test', [])).rejects.toThrow(
      'Executable not found in PATH: nonexistent-executable'
    );
  });

  it('passes extra args to child process', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: node
    args:
      - -e
      - process.exit(0)`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    const exitCode = await runCommand('test', []);
    expect(exitCode).toBe(0);
  });

  it('merges profile args with extra args', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: node
    args:
      - -e
      - process.exit(0)`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    const exitCode = await runCommand('test', []);
    expect(exitCode).toBe(0);
  });

  it('creates directories from createDirs', async () => {
    const tempDir = path.join(testDir, 'created-dir-' + Date.now());
    const dirPath = path.join(tempDir, 'subdir');

    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: node
    args:
      - -e
      - process.exit(0)
    createDirs:
      - ${dirPath}`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    expect(fs.existsSync(dirPath)).toBe(false);
    await runCommand('test', []);
    expect(fs.existsSync(dirPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });

  it('creates directories from env paths', async () => {
    const tempDir = path.join(testDir, 'env-dir-' + Date.now());
    const envPath = path.join(tempDir, 'config');

    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: node
    args:
      - -e
      - process.exit(0)
    env:
      XDG_CONFIG_HOME: ${envPath}`
    );
    process.env.AIRELAY_CONFIG = testConfigPath;

    expect(fs.existsSync(envPath)).toBe(false);
    await runCommand('test', []);
    expect(fs.existsSync(envPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });
});
