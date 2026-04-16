import { spawnAndWait } from '../src/runtime/spawn';

describe('spawnAndWait', () => {
  it('returns exit code from child process', async () => {
    const exitCode = await spawnAndWait({
      executable: process.platform === 'win32' ? 'cmd.exe' : 'true',
      args: process.platform === 'win32' ? ['/c', 'exit 0'] : [],
    });
    expect(exitCode).toBe(0);
  });

  it('returns non-zero exit code on failure', async () => {
    const exitCode = await spawnAndWait({
      executable: process.platform === 'win32' ? 'cmd.exe' : 'false',
      args: process.platform === 'win32' ? ['/c', 'exit 1'] : [],
    });
    expect(exitCode).not.toBe(0);
  });
});
