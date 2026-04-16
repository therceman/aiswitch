import { buildEnv } from '../src/runtime/env';
import { ProfileSchema } from '../src/config/schema';

describe('buildEnv', () => {
  it('merges profile env with process env', () => {
    const profile = ProfileSchema.parse({
      executable: 'opencode',
      env: {
        TEST_VAR: 'test-value',
      },
    });

    const env = buildEnv(profile);
    expect(env.TEST_VAR).toBe('test-value');
    expect(env.PATH).toBeDefined();
  });

  it('overrides process env with profile env', () => {
    const originalValue = process.env.TEST_OVERRIDE;
    process.env.TEST_OVERRIDE = 'original';

    const profile = ProfileSchema.parse({
      executable: 'opencode',
      env: {
        TEST_OVERRIDE: 'overridden',
      },
    });

    const env = buildEnv(profile);
    expect(env.TEST_OVERRIDE).toBe('overridden');

    if (originalValue !== undefined) {
      process.env.TEST_OVERRIDE = originalValue;
    }
  });

  it('expands path-like values', () => {
    const profile = ProfileSchema.parse({
      executable: 'opencode',
      env: {
        XDG_CONFIG_HOME: '~/.config/test',
      },
    });

    const env = buildEnv(profile);
    expect(env.XDG_CONFIG_HOME).not.toContain('~');
  });
});
