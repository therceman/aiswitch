import { runCommand } from './run';

export async function startCommand(profile: string, extraArgs: string[]): Promise<void> {
  const exitCode = await runCommand(profile, extraArgs, { usePty: true });
  process.exit(exitCode);
}
