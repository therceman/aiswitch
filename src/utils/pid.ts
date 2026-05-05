import fs from 'fs';
import path from 'path';
import os from 'os';
import { migrateLegacyHomeDirIfNeeded } from '../config/migrate';

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

function getPIDPath(): string {
  if (!process.env.AIRELAY_PIDS) {
    migrateLegacyHomeDirIfNeeded();
  }
  return process.env.AIRELAY_PIDS || path.join(os.homedir(), '.airelay', 'pids.json');
}

function loadPIDs(): PIDData {
  try {
    const pidPath = getPIDPath();
    if (!fs.existsSync(pidPath)) {
      return {};
    }
    const content = fs.readFileSync(pidPath, 'utf-8');
    return JSON.parse(content) as PIDData;
  } catch {
    return {};
  }
}

function savePIDs(pids: PIDData): void {
  try {
    const pidPath = getPIDPath();
    const dir = path.dirname(pidPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(pidPath, JSON.stringify(pids, null, 2), 'utf-8');
  } catch {
    // Ignore errors when saving PIDs
  }
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
    // Check if parent process (airelay) is still running
    try {
      process.kill(entry.ppid, 0);
      // Parent is still alive, not orphaned
    } catch {
      // Parent is dead, this is an orphan
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
    } catch (e) {
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

// Clean up PIDs on module load (remove dead processes)
export function cleanupDeadPIDs(): void {
  const pids = loadPIDs();
  let changed = false;

  for (const [pidStr, entry] of Object.entries(pids)) {
    try {
      process.kill(entry.pid, 0);
      // Process is still alive
    } catch {
      // Process is dead, remove from tracking
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
