import os from 'os';
import path from 'path';
import { createJsonStore } from './json-store';

interface PIDEntry {
  pid: number;
  ppid: number;
  command: string;
  args: string[];
  cwd: string;
  started: number;
  profile?: string;
}

interface PIDData {
  [pid: string]: PIDEntry;
}

const store = createJsonStore<PIDData>({
  envVar: 'AIRELAY_PIDS',
  defaultPath: path.join(os.homedir(), '.airelay', 'pids.json'),
});

function loadPIDs(): PIDData {
  return store.load();
}

function savePIDs(pids: PIDData): void {
  store.save(pids);
}

export function registerPID(pid: number, command: string, args: string[], profile?: string): void {
  const pids = loadPIDs();
  const ppid = process.pid;

  pids[pid.toString()] = {
    pid,
    ppid,
    command,
    args,
    cwd: process.cwd(),
    started: Date.now(),
    profile,
  };

  savePIDs(pids);
}

export function unregisterPID(pid: number): void {
  const pids = loadPIDs();
  delete pids[pid.toString()];
  savePIDs(pids);
}

export function getOrphanedPIDs(): PIDEntry[] {
  const pids = loadPIDs();
  const orphaned: PIDEntry[] = [];

  for (const entry of Object.values(pids)) {
    try {
      process.kill(entry.ppid, 0);
    } catch {
      orphaned.push(entry);
    }
  }

  return orphaned;
}

export function cleanupOrphanedPIDs(): number {
  const orphaned = getOrphanedPIDs();
  const pids = loadPIDs();

  for (const entry of orphaned) {
    try {
      process.kill(entry.pid, 'SIGTERM');
      console.log(`Killed orphaned process ${entry.pid} (${entry.command})`);
    } catch {
      // Process already dead
    }
    delete pids[entry.pid.toString()];
  }

  savePIDs(pids);
  return orphaned.length;
}

export function listPIDs(): PIDEntry[] {
  const pids = loadPIDs();
  return Object.values(pids);
}

export function cleanupDeadPIDs(): void {
  const pids = loadPIDs();
  let changed = false;

  for (const [pidStr, entry] of Object.entries(pids)) {
    try {
      process.kill(entry.pid, 0);
    } catch {
      delete pids[pidStr];
      changed = true;
    }
  }

  if (changed) {
    savePIDs(pids);
  }
}

// Auto-cleanup on module load
cleanupDeadPIDs();
