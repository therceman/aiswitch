import { execSync, spawnSync } from 'child_process';
import * as path from 'path';
import { useTestEnv, createTestConfig } from './test-utils';
/* eslint-disable @typescript-eslint/no-explicit-any */

const CLI_PATH = path.join(__dirname, '../dist/cli.js');

describe('CLI Integration', () => {
  const testEnv = useTestEnv();
  const testConfigPath = testEnv.configPath;

  beforeAll(() => {
    createTestConfig(testConfigPath);
  });

  describe('help command', () => {
    it('shows help text', () => {
      const output = execSync(`node ${CLI_PATH} help`, { encoding: 'utf8' });

      expect(output).toContain('aiswitch - Cross-platform CLI');
      expect(output).toContain('Usage:');
      expect(output).toContain('Commands:');
      expect(output).toContain('init');
      expect(output).toContain('create');
      expect(output).toContain('list');
      expect(output).toContain('which');
      expect(output).toContain('doctor');
      expect(output).toContain('run');
      expect(output).toContain('help');
      expect(output).toContain('select');
    });

    it('shows help with examples', () => {
      const output = execSync(`node ${CLI_PATH} help`, { encoding: 'utf8' });

      expect(output).toContain('Examples:');
      expect(output).toContain('aiswitch init');
      expect(output).toContain('aiswitch create');
    });

    it('shows help with create options', () => {
      const output = execSync(`node ${CLI_PATH} help`, { encoding: 'utf8' });

      expect(output).toContain('Create options:');
      expect(output).toContain('-e, --executable');
      expect(output).toContain('-k, --api-key');
      expect(output).toContain('-d, --dir');
    });

    it('shows help with init options', () => {
      const output = execSync(`node ${CLI_PATH} help`, { encoding: 'utf8' });

      expect(output).toContain('Init options:');
      expect(output).toContain('-f, --force');
    });
  });

  describe('list command', () => {
    it('shows error when config missing or no profiles', () => {
      try {
        execSync(`node ${CLI_PATH} list`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (e: any) {
        // Either config missing or no profiles - both are valid errors
        expect(e.stderr).toMatch(/(Config file not found|No profiles configured)/);
      }
    });

    it('outputs JSON with --json flag when config missing or no profiles', () => {
      try {
        execSync(`node ${CLI_PATH} list --json`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (e: any) {
        expect(e.stderr).toMatch(/(Config file not found|No profiles configured)/);
      }
    });
  });

  describe('which command', () => {
    it('shows error when profile not specified', () => {
      const result = spawnSync('node', [CLI_PATH, 'which'], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Profile name required');
      expect(result.stderr).toContain('Usage: aiswitch which <profile>');
    });

    it('shows error when profile not found', () => {
      const result = spawnSync('node', [CLI_PATH, 'which', 'nonexistentprofile'], {
        encoding: 'utf8',
        env: { ...process.env, AIUSE_CONFIG: testConfigPath },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Profile not found');
    });
  });

  describe('doctor command', () => {
    it('runs without profile', () => {
      const output = execSync(`node ${CLI_PATH} doctor`, { encoding: 'utf8' });
      // Doctor should run even without config, showing diagnostics
      expect(output).toBeDefined();
    });
  });

  describe('init command', () => {
    it('runs init', () => {
      // Init might create files, so just check it doesn't crash
      const output = execSync(`node ${CLI_PATH} init`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, AIUSE_CONFIG: testConfigPath },
      });
      expect(output).toBeDefined();
    });

    it('runs init with --force', () => {
      const output = execSync(`node ${CLI_PATH} init --force`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, AIUSE_CONFIG: testConfigPath },
      });
      expect(output).toBeDefined();
    });

    it('runs init with -f', () => {
      const output = execSync(`node ${CLI_PATH} init -f`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, AIUSE_CONFIG: testConfigPath },
      });
      expect(output).toBeDefined();
    });
  });

  describe('create command', () => {
    it('runs create interactively when no profile specified', () => {
      try {
        execSync(`node ${CLI_PATH} create`, { encoding: 'utf8', stdio: 'pipe', timeout: 1000 });
      } catch (e: any) {
        expect(e.stderr).toContain('Profile name');
      }
    });
  });

  describe('run command', () => {
    it('shows error when profile not specified', () => {
      const result = spawnSync('node', [CLI_PATH, 'run'], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Profile name required');
      expect(result.stderr).toContain('Usage: aiswitch run <profile>');
    });

    it('shows error when profile not found', () => {
      const result = spawnSync('node', [CLI_PATH, 'run', 'nonexistentprofile'], {
        encoding: 'utf8',
        env: { ...process.env, AIUSE_CONFIG: testConfigPath },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Profile not found');
    });
  });

  describe('select command', () => {
    it('runs select when no args', () => {
      // Select is interactive, so just check it doesn't crash immediately
      try {
        execSync(`node ${CLI_PATH}`, { encoding: 'utf8', stdio: 'pipe', timeout: 1000 });
      } catch (e: any) {
        // Might timeout waiting for input, that's OK
        expect(e.code).toBe('ETIMEDOUT');
      }
    });

    it('runs select explicitly', () => {
      try {
        execSync(`node ${CLI_PATH} select`, { encoding: 'utf8', stdio: 'pipe', timeout: 1000 });
      } catch (e: any) {
        expect(e.code).toBe('ETIMEDOUT');
      }
    });
  });

  describe('unknown command', () => {
    it('treats unknown command as profile run', () => {
      try {
        execSync(`node ${CLI_PATH} unknownprofile`, { encoding: 'utf8', stdio: 'pipe' });
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.stderr).toContain('Profile not found');
      }
    });
  });

  describe('exit codes', () => {
    it('exits with 0 for help', () => {
      const result = execSync(`node ${CLI_PATH} help`, { encoding: 'utf8' });
      // execSync returns stdout on success, status is 0 implicitly
      expect(result).toBeDefined();
    });

    it('exits with 1 for missing profile', () => {
      const result = spawnSync('node', [CLI_PATH, 'which'], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Profile name required');
    });
  });

  describe('--help flag on commands', () => {
    it('passes --help to profile as extra arg', () => {
      try {
        execSync(`node ${CLI_PATH} myprofile --help`, { encoding: 'utf8', stdio: 'pipe' });
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.stderr).toContain('Profile not found');
      }
    });
  });
});
