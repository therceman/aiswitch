import { cleanupOrphanedPIDs, listPIDs } from '../utils/pid';

export function cleanupCommand(): void {
  const count = cleanupOrphanedPIDs();
  if (count === 0) {
    console.log('No orphaned processes found.');
  } else {
    console.log(`Cleaned up ${count} orphaned process${count === 1 ? '' : 'es'}.`);
  }
}

export function psCommand(): void {
  const pids = listPIDs();

  if (pids.length === 0) {
    console.log('No tracked processes.');
    return;
  }

  console.log('Tracked processes:');
  console.log('PID\tPPID\tCommand\tProfile\tCWD');
  console.log('---\t----\t-------\t-------\t---');

  for (const entry of pids) {
    const shortCwd = entry.cwd.length > 40 ? '...' + entry.cwd.slice(-37) : entry.cwd;
    console.log(
      `${entry.pid}\t${entry.ppid}\t${entry.command}\t${entry.profile || '-'}\t${shortCwd}`
    );
  }
}
