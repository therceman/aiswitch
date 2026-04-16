import { parseArgs } from '../src/cli';

describe('parseArgs', () => {
  it('parses simple command', () => {
    const result = parseArgs(['node', 'aiswitch', 'list']);
    expect(result.command).toBe('list');
    expect(result.profile).toBeUndefined();
    expect(result.extraArgs).toEqual([]);
  });

  it('parses profile run with no args', () => {
    const result = parseArgs(['node', 'aiswitch', 'myprofile']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual([]);
  });

  it('parses profile with flags', () => {
    const result = parseArgs(['node', 'aiswitch', 'myprofile', '--help']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual(['--help']);
  });

  it('parses profile with multiple flags', () => {
    const result = parseArgs(['node', 'aiswitch', 'myprofile', '-m', 'fast', '--verbose']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual(['-m', 'fast', '--verbose']);
  });

  it('parses run command with profile', () => {
    const result = parseArgs(['node', 'aiswitch', 'run', 'myprofile']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual([]);
  });

  it('parses run command with profile and args', () => {
    const result = parseArgs(['node', 'aiswitch', 'run', 'myprofile', '--help']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual(['--help']);
  });

  it('parses create command with flags', () => {
    const result = parseArgs(['node', 'aiswitch', 'create', 'myprofile', '-e', 'opencode']);
    expect(result.command).toBe('create');
    expect(result.profile).toBe('myprofile');
    expect(result.flags).toEqual({ e: 'opencode' });
  });

  it('parses create with long flags', () => {
    const result = parseArgs([
      'node',
      'aiswitch',
      'create',
      'myprofile',
      '--executable',
      'codex',
      '--api-key',
      'sk-123',
    ]);
    expect(result.command).toBe('create');
    expect(result.profile).toBe('myprofile');
    expect(result.flags).toEqual({ executable: 'codex', 'api-key': 'sk-123' });
  });

  it('parses init with force flag', () => {
    const result = parseArgs(['node', 'aiswitch', 'init', '--force']);
    expect(result.command).toBe('init');
    expect(result.flags).toEqual({ force: true });
  });

  it('parses which command with profile', () => {
    const result = parseArgs(['node', 'aiswitch', 'which', 'myprofile']);
    expect(result.command).toBe('which');
    expect(result.profile).toBe('myprofile');
  });

  it('parses doctor with optional profile', () => {
    const result1 = parseArgs(['node', 'aiswitch', 'doctor']);
    expect(result1.command).toBe('doctor');
    expect(result1.profile).toBeUndefined();

    const result2 = parseArgs(['node', 'aiswitch', 'doctor', 'myprofile']);
    expect(result2.command).toBe('doctor');
    expect(result2.profile).toBe('myprofile');
  });

  it('parses help command', () => {
    const result = parseArgs(['node', 'aiswitch', 'help']);
    expect(result.command).toBe('help');
  });

  it('defaults to select when no command', () => {
    const result = parseArgs(['node', 'aiswitch']);
    expect(result.command).toBe('select');
  });

  it('handles -- separator', () => {
    const result = parseArgs(['node', 'aiswitch', 'myprofile', '--', '--help', '--verbose']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual(['--help', '--verbose']);
  });

  it('handles -- separator with run command', () => {
    const result = parseArgs(['node', 'aiswitch', 'run', 'myprofile', '--', '--help', '--verbose']);
    expect(result.command).toBe('run');
    expect(result.profile).toBe('myprofile');
    expect(result.extraArgs).toEqual(['--help', '--verbose']);
  });

  it('parses short flags without value', () => {
    const result = parseArgs(['node', 'aiswitch', 'init', '-f']);
    expect(result.flags).toEqual({ f: true });
  });

  it('parses mixed short and long flags', () => {
    const result = parseArgs(['node', 'aiswitch', 'create', 'test', '-e', 'opencode', '--force']);
    expect(result.command).toBe('create');
    expect(result.profile).toBe('test');
    expect(result.flags).toEqual({ e: 'opencode', force: true });
  });

  it('treats values starting with dash as flags', () => {
    const result = parseArgs(['node', 'aiswitch', 'myprofile', '--help']);
    expect(result.extraArgs).toEqual(['--help']);
  });
});
