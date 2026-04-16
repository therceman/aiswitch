import { doctorCommand } from '../src/commands/doctor';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('doctor', () => {
  const testDir = path.join(os.tmpdir(), 'aiswitch-doctor-test-' + Date.now());
  const testConfigPath = path.join(testDir, 'config.yaml');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  it('returns error when config missing', () => {
    const nonExistentPath = path.join(
      os.tmpdir(),
      'nonexistent-aiswitch-config-' + Date.now(),
      'config.yaml'
    );
    process.env.AIUSE_CONFIG = nonExistentPath;
    const result = doctorCommand();
    delete process.env.AIUSE_CONFIG;
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Config file not found');
  });

  it('returns ok for valid config', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: nonexistent`
    );
    process.env.AIUSE_CONFIG = testConfigPath;
    const result = doctorCommand();
    delete process.env.AIUSE_CONFIG;
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('not found in PATH');
  });

  it('checks specific profile', () => {
    fs.writeFileSync(
      testConfigPath,
      `version: 1
profiles:
  test:
    executable: nonexistent`
    );
    process.env.AIUSE_CONFIG = testConfigPath;
    const result = doctorCommand('test');
    delete process.env.AIUSE_CONFIG;
    expect(result.ok).toBe(false);
  });
});
