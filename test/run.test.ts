import { runCommand } from '../src/commands/run';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('runCommand', () => {
  const testDir = path.join(os.tmpdir(), 'aiswitch-run-test-' + Date.now());
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

  it('throws error with helpful message when profile not found', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  existing-profile:
    executable: opencode`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

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
    process.env.AIUSE_CONFIG = testConfigPath;

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
    executable: echo`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const exitCode = await runCommand('test', ['hello', 'world']);
    expect(exitCode).toBe(0);
  });

  it('merges profile args with extra args', async () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: echo
    args:
      - --prefix
      - test`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    const exitCode = await runCommand('test', ['hello']);
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
    executable: echo
    createDirs:
      - ${dirPath}`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    expect(fs.existsSync(dirPath)).toBe(false);
    await runCommand('test', ['test']);
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
    executable: echo
    env:
      XDG_CONFIG_HOME: ${envPath}`
    );
    process.env.AIUSE_CONFIG = testConfigPath;

    expect(fs.existsSync(envPath)).toBe(false);
    await runCommand('test', ['test']);
    expect(fs.existsSync(envPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });
});
