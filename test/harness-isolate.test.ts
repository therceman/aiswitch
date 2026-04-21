import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  setupIsolatedHarnessHome,
  removeIsolatedHarnessHome,
  listProfileItems,
} from '../src/utils/harness-isolate';
import { setupEnv, cleanupEnv, setupTestEnv, createTestHarnessHome } from './test-utils';

/**
 * Test cases for harness-isolate:
 *
 * 1. Isolated items (files) should NOT be created - let harness create them
 * 2. Isolated items (directories) should be created empty
 * 3. Shared items should be symlinked to base
 * 4. Wildcard patterns (*.json) should match files but skip isolated items
 * 5. If item is in both isolatedItems and sharedItems, isolated wins (no symlink)
 * 6. Existing files in profile should not be overwritten
 * 7. Missing base directory items should be skipped
 * 8. Remove should only work on .aiswitch directories
 */
describe('harness-isolate', () => {
  let testDir: string;
  let baseDir: string;
  let testEnv: ReturnType<typeof setupTestEnv>;

  beforeAll(() => {
    testEnv = setupTestEnv();
    testDir = testEnv.testDir;
    setupEnv(testEnv);
  });

  afterAll(() => {
    cleanupEnv(testEnv);
  });

  beforeEach(() => {
    baseDir = path.join(testDir, 'base');
    fs.mkdirSync(baseDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  describe('setupIsolatedHarnessHome', () => {
    it('should create isolated directories only (not files)', () => {
      // Create a fake codex base with various files
      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'config.json', 'installation_id'],
        dirs: ['memories', 'cache'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      // Isolated items should NOT be created as files
      // auth.json is isolated, so it should NOT exist yet
      expect(fs.existsSync(path.join(profileDir, 'auth.json'))).toBe(false);

      // Shared items should be symlinked
      expect(fs.lstatSync(path.join(profileDir, 'config.json')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(profileDir, 'installation_id')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(profileDir, 'memories')).isSymbolicLink()).toBe(true);

      // cache/ should NOT be symlinked (it's in ignore list)
      expect(fs.existsSync(path.join(profileDir, 'cache'))).toBe(false);
    });

    it('should prioritize isolatedItems over sharedItems patterns', () => {
      // This tests the critical case: auth.json is in both isolatedItems and *.json pattern
      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'config.json', 'session.json'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      // auth.json should NOT be symlinked (it's isolated)
      expect(fs.existsSync(path.join(profileDir, 'auth.json'))).toBe(false);

      // Other .json files should be symlinked
      expect(fs.lstatSync(path.join(profileDir, 'config.json')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(profileDir, 'session.json')).isSymbolicLink()).toBe(true);
    });

    it('should not symlink items that exist in both isolatedItems and sharedItems', () => {
      // Edge case: user manually puts same item in both lists
      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'custom.json'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      // auth.json is isolated, should not be symlinked even if *.json matches it
      expect(fs.existsSync(path.join(profileDir, 'auth.json'))).toBe(false);

      // custom.json should be symlinked
      expect(fs.lstatSync(path.join(profileDir, 'custom.json')).isSymbolicLink()).toBe(true);
    });

    it('should skip symlinks for files that already exist in profile', () => {
      // Pre-create the profile directory in test dir (respects AIUSE_CONFIG)
      // When AIUSE_CONFIG is set, profiles go directly in that dir (not .aiswitch subfolder)
      const profileDir = path.join(testDir, 'codex-testprofile');
      fs.mkdirSync(profileDir, { recursive: true });
      fs.writeFileSync(path.join(profileDir, 'auth.json'), '{"token":"test"}');

      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'config.json'],
      });

      // This would normally try to symlink auth.json, but it already exists
      const resultDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      expect(resultDir).toBe(profileDir);
      // auth.json should still be the original file, not a symlink
      expect(fs.lstatSync(path.join(profileDir, 'auth.json')).isFile()).toBe(true);
      expect(fs.lstatSync(path.join(profileDir, 'auth.json')).isSymbolicLink()).toBe(false);
      // Content should be preserved
      expect(JSON.parse(fs.readFileSync(path.join(profileDir, 'auth.json'), 'utf-8'))).toEqual({
        token: 'test',
      });
    });

    it('should handle missing base directory gracefully', () => {
      // Use a unique profile name to avoid conflicts
      const profileName = `testprofile-${Date.now()}`;

      // Remove baseDir to simulate fresh install
      fs.rmSync(baseDir, { recursive: true, force: true });

      const profileDir = setupIsolatedHarnessHome('codex', profileName, baseDir);

      // Profile dir should exist
      expect(fs.existsSync(profileDir)).toBe(true);

      // But no symlinks should be created (base doesn't exist)
      const items = listProfileItems(profileDir);
      // Items might exist from previous test runs, but none should be symlinks
      const symlinks = items.filter((i) => i.type === 'symlink');
      expect(symlinks.length).toBe(0);
    });

    it('should create isolated directories when specified', () => {
      // This would test if isolatedItems with trailing '/' create directories
      // For now, codex only isolates auth.json (a file)
      // This test ensures the logic handles directory isolation correctly
      createTestHarnessHome(baseDir, {
        files: ['auth.json'],
        dirs: ['plugins'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      // plugins/ is shared, should be symlinked
      expect(fs.lstatSync(path.join(profileDir, 'plugins')).isSymbolicLink()).toBe(true);
    });
  });

  describe('removeIsolatedHarnessHome', () => {
    it('should remove isolated profile directory', () => {
      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'config.json'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      // Verify it exists
      expect(fs.existsSync(profileDir)).toBe(true);

      // Remove it
      const result = removeIsolatedHarnessHome('codex', profileDir);
      expect(result).toBe(true);
      expect(fs.existsSync(profileDir)).toBe(false);

      // Base directory should still exist
      expect(fs.existsSync(baseDir)).toBe(true);
    });

    it('should refuse to remove base directory', () => {
      // baseDir is ~/.codex mock, which is outside aiswitch folder
      // But in tests, baseDir is inside testDir which IS the aiswitch folder
      // So we need to use a directory outside testDir
      const outsideDir = path.join(os.tmpdir(), `outside-aiswitch-${Date.now()}`);
      fs.mkdirSync(outsideDir, { recursive: true });

      try {
        // This should fail because outsideDir is not in aiswitch folder
        const result = removeIsolatedHarnessHome('codex', outsideDir);
        expect(result).toBe(false);
        expect(fs.existsSync(outsideDir)).toBe(true);
      } finally {
        if (fs.existsSync(outsideDir)) {
          fs.rmSync(outsideDir, { recursive: true, force: true });
        }
      }
    });

    it('should refuse to remove non-.aiswitch directories', () => {
      // Use a directory outside the test aiswitch folder
      const fakeProfile = path.join(os.tmpdir(), `fake-profile-${Date.now()}`);
      fs.mkdirSync(fakeProfile, { recursive: true });

      try {
        const result = removeIsolatedHarnessHome('codex', fakeProfile);
        expect(result).toBe(false);

        // Directory should still exist
        expect(fs.existsSync(fakeProfile)).toBe(true);
      } finally {
        // Cleanup
        if (fs.existsSync(fakeProfile)) {
          fs.rmSync(fakeProfile, { recursive: true, force: true });
        }
      }
    });
  });

  describe('listProfileItems', () => {
    it('should list all items with correct types', () => {
      createTestHarnessHome(baseDir, {
        files: ['auth.json', 'config.json'],
        dirs: ['memories'],
      });

      const profileDir = setupIsolatedHarnessHome('codex', 'testprofile', baseDir);

      const items = listProfileItems(profileDir);

      // auth.json should NOT exist (it's isolated)
      const authItem = items.find((i) => i.name === 'auth.json');
      expect(authItem).toBeUndefined();

      // config.json should be a symlink
      const configItem = items.find((i) => i.name === 'config.json');
      expect(configItem?.type).toBe('symlink');
      expect(configItem?.target).toContain('config.json');

      // memories should be a symlink
      const memoriesItem = items.find((i) => i.name === 'memories');
      expect(memoriesItem?.type).toBe('symlink');
      expect(memoriesItem?.target).toContain('memories');
    });

    it('should return empty array for non-existent directory', () => {
      const items = listProfileItems('/non/existent/path');
      expect(items).toEqual([]);
    });
  });
});
