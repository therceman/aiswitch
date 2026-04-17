import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TestEnv {
  testDir: string;
  configPath: string;
  sessionsPath: string;
  lastUsedPath: string;
  pidsPath: string;
  originalEnv: {
    AIUSE_CONFIG?: string;
    AIUSE_SESSIONS?: string;
    AIUSE_LAST_USED?: string;
    AIUSE_PIDS?: string;
  };
}

/**
 * Creates an isolated test environment with temp config files.
 * Automatically sets AIUSE_* environment variables to prevent tests
 * from touching the real ~/.aiswitch directory.
 *
 * Usage:
 * ```ts
 * const testEnv = setupTestEnv();
 *
 * beforeAll(() => {
 *   testEnv.setup();
 * });
 *
 * afterAll(() => {
 *   testEnv.cleanup();
 * });
 * ```
 */
export function setupTestEnv(): TestEnv {
  const testDir = path.join(os.tmpdir(), `aiswitch-test-${process.pid}-${Date.now()}`);
  const configPath = path.join(testDir, 'config.yaml');
  const sessionsPath = path.join(testDir, 'sessions.json');
  const lastUsedPath = path.join(testDir, 'last-used');
  const pidsPath = path.join(testDir, 'pids.json');

  const originalEnv = {
    AIUSE_CONFIG: process.env.AIUSE_CONFIG,
    AIUSE_SESSIONS: process.env.AIUSE_SESSIONS,
    AIUSE_LAST_USED: process.env.AIUSE_LAST_USED,
    AIUSE_PIDS: process.env.AIUSE_PIDS,
  };

  return {
    testDir,
    configPath,
    sessionsPath,
    lastUsedPath,
    pidsPath,
    originalEnv,
  };
}

/**
 * Sets up the test environment:
 * - Creates temp directory
 * - Sets all AIUSE_* environment variables
 */
export function setupEnv(env: TestEnv): void {
  fs.mkdirSync(env.testDir, { recursive: true });

  process.env.AIUSE_CONFIG = env.configPath;
  process.env.AIUSE_SESSIONS = env.sessionsPath;
  process.env.AIUSE_LAST_USED = env.lastUsedPath;
  process.env.AIUSE_PIDS = env.pidsPath;
}

/**
 * Cleans up the test environment:
 * - Removes temp directory
 * - Restores original AIUSE_* environment variables
 */
export function cleanupEnv(env: TestEnv): void {
  try {
    if (fs.existsSync(env.testDir)) {
      fs.rmSync(env.testDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }

  // Restore original environment
  if (env.originalEnv.AIUSE_CONFIG) {
    process.env.AIUSE_CONFIG = env.originalEnv.AIUSE_CONFIG;
  } else {
    delete process.env.AIUSE_CONFIG;
  }

  if (env.originalEnv.AIUSE_SESSIONS) {
    process.env.AIUSE_SESSIONS = env.originalEnv.AIUSE_SESSIONS;
  } else {
    delete process.env.AIUSE_SESSIONS;
  }

  if (env.originalEnv.AIUSE_LAST_USED) {
    process.env.AIUSE_LAST_USED = env.originalEnv.AIUSE_LAST_USED;
  } else {
    delete process.env.AIUSE_LAST_USED;
  }

  if (env.originalEnv.AIUSE_PIDS) {
    process.env.AIUSE_PIDS = env.originalEnv.AIUSE_PIDS;
  } else {
    delete process.env.AIUSE_PIDS;
  }
}

/**
 * Creates a minimal config file for testing.
 * Use this instead of running `aiswitch init` in tests.
 */
export function createTestConfig(configPath: string, profiles: Record<string, unknown> = {}): void {
  const config = {
    version: 1,
    profiles: {
      opencode: {
        executable: 'opencode',
        description: 'opencode profile',
        env: {
          OPENCODE_CONFIG_DIR: '/tmp/opencode-test',
        },
      },
      codex: {
        executable: 'codex',
        description: 'codex profile',
        env: {
          CODEX_CONFIG_DIR: '/tmp/codex-test',
        },
      },
      ...profiles,
    },
  };

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Jest hooks wrapper for test environment setup.
 * Automatically handles beforeAll/afterAll setup and cleanup.
 *
 * Usage:
 * ```ts
 * const testEnv = useTestEnv();
 *
 * // Now you can use testEnv.configPath in your tests
 * it('should work', () => {
 *   fs.writeFileSync(testEnv.configPath, '...');
 * });
 * ```
 */
export function useTestEnv(): TestEnv {
  const testEnv = setupTestEnv();

  beforeAll(() => {
    setupEnv(testEnv);
  });

  afterAll(() => {
    cleanupEnv(testEnv);
  });

  return testEnv;
}
