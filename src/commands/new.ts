import { createCommandInteractive } from './create-interactive';

export async function newCommand(): Promise<void> {
  await createCommandInteractive();
}
