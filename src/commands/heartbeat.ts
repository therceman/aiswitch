import { promptCommand } from './prompt';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export interface HeartbeatOptions {
  noWarn?: boolean;
  intervalMs?: number;
}

/**
 * Send a periodic heartbeat to a session.
 * Continues until stopped by the returned stop function or SIGINT/SIGTERM.
 * Returns [exitCode, stopFn].
 */
export async function heartbeatCommand(
  sessionKeyOrId: string,
  options?: HeartbeatOptions
): Promise<number> {
  const intervalMs = options?.intervalMs || DEFAULT_INTERVAL_MS;

  console.log(`Heartbeat started for session: ${sessionKeyOrId}`);
  console.log(`Interval: ${intervalMs}ms`);
  console.log('Press Ctrl+C to stop.\n');

  let running = true;

  const shutdown = () => {
    if (running) {
      running = false;
      console.log('\nHeartbeat stopped.');
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    const text = '[from=cron] heartbeat';
    const exitCode = await promptCommand(sessionKeyOrId, text, {
      enter: true,
      noWarn: options?.noWarn,
    });

    if (!running) break;

    if (exitCode !== 0) {
      console.error(`Heartbeat failed for session: ${sessionKeyOrId}`);
      process.removeListener('SIGINT', shutdown);
      process.removeListener('SIGTERM', shutdown);
      return exitCode;
    }

    console.log(`  [${new Date().toISOString()}] heartbeat sent`);

    // Wait for the interval, checking running flag periodically
    const checkInterval = 200;
    for (let waited = 0; waited < intervalMs && running; waited += checkInterval) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }

  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  return 0;
}
