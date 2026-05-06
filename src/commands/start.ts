import { runCommand } from './run';

export interface StartOptions {
  key?: string;
}

export async function startCommand(
  profile: string,
  extraArgs: string[],
  options?: StartOptions
): Promise<void> {
  const exitCode = await runCommand(profile, extraArgs, {
    usePty: true,
    sessionKey: options?.key,
  });
  process.exit(exitCode);
}
