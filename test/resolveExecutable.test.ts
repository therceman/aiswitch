import { resolveExecutable, findExecutablePath } from '../src/runtime/resolveExecutable';

describe('resolveExecutable', () => {
  it('finds executable in PATH', () => {
    const result = resolveExecutable(process.platform === 'win32' ? 'cmd.exe' : 'echo');
    expect(result).toBeTruthy();
    expect(result).not.toBeNull();
  });

  it('returns null for non-existent executable', () => {
    const result = resolveExecutable('nonexistent-executable-xyz123');
    expect(result).toBeNull();
  });

  it('findExecutablePath throws when executable not found', () => {
    expect(() => findExecutablePath('nonexistent-executable-xyz123')).toThrow(
      'Executable not found in PATH: nonexistent-executable-xyz123'
    );
  });

  it('findExecutablePath returns path for existing executable', () => {
    const result = findExecutablePath(process.platform === 'win32' ? 'cmd.exe' : 'echo');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
