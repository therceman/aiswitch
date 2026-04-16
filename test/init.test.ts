import { initCommand } from '../src/commands/init';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('initCommand', () => {
  const testDir = path.join(os.tmpdir(), 'aiswitch-init-test-' + Date.now());
  const testConfigPath = path.join(testDir, 'config.yaml');
  const originalConfig = process.env.AIUSE_CONFIG;

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.AIUSE_CONFIG = testConfigPath;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true });
    if (originalConfig) {
      process.env.AIUSE_CONFIG = originalConfig;
    } else {
      delete process.env.AIUSE_CONFIG;
    }
  });

  beforeEach(() => {
    process.env.AIUSE_CONFIG = testConfigPath;
  });

  it('creates config file', () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      initCommand(true);
    } finally {
      console.log = originalLog;
    }

    expect(fs.existsSync(testConfigPath)).toBe(true);
    const content = fs.readFileSync(testConfigPath, 'utf-8');
    expect(content).toContain('version: 1');
    expect(content).toContain('profiles:');
  });

  it('does not overwrite existing config without force', () => {
    fs.writeFileSync(testConfigPath, 'version: 1\nprofiles:\n  existing:\n    executable: test\n');

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      initCommand(false);
    } finally {
      console.log = originalLog;
    }

    expect(logs.join('\n')).toContain('Config already exists');
    expect(logs.join('\n')).toContain('--force');
  });

  it('overwrites existing config with force', () => {
    fs.writeFileSync(testConfigPath, 'version: 1\nprofiles:\n  existing:\n    executable: test\n');

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    try {
      initCommand(true);
    } finally {
      console.log = originalLog;
    }

    expect(logs.join('\n')).not.toContain('Config already exists');
  });

  it('creates config directory if missing', () => {
    const newDir = path.join(testDir, 'new-config-dir-' + Date.now());
    const newConfigPath = path.join(newDir, 'config.yaml');
    const savedConfig = process.env.AIUSE_CONFIG;
    process.env.AIUSE_CONFIG = newConfigPath;

    try {
      initCommand(true);
      expect(fs.existsSync(newDir)).toBe(true);
      expect(fs.existsSync(newConfigPath)).toBe(true);
    } finally {
      process.env.AIUSE_CONFIG = savedConfig;
      if (fs.existsSync(newDir)) {
        fs.rmSync(newDir, { recursive: true });
      }
    }
  });
});
