import { createCommandInteractive } from './create-interactive';

export async function createCommand(
  name?: string,
  executable?: string,
  apiKey?: string,
  customDir?: string,
  force?: boolean
): Promise<void> {
  await createCommandInteractive({ name, executable, apiKey, customDir, force });
}

export { createCommandInteractive };
