import os from 'os';
import fs from 'fs';
import net from 'net';
import { loadSessions } from './sessions';

function normalizeCwd(cwd?: string): string {
  if (!cwd) return '';
  const home = os.homedir();
  if (cwd.startsWith(home)) {
    return '~' + cwd.slice(home.length);
  }
  return cwd;
}

function isEndpointReachable(endpoint: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Named pipes: attempt brief connection
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(endpoint);
    } else {
      // Unix socket: check file existence
      resolve(fs.existsSync(endpoint));
    }
  });
}

export interface SessionRow {
  sessionId: string;
  profile: string;
  cwd: string;
  sessionKey?: string;
  controllerEndpoint?: string;
  lastUsed: number;
  active?: boolean;
}

function flattenSessions(): SessionRow[] {
  const data = loadSessions();
  const rows: SessionRow[] = [];

  for (const [profile, entries] of Object.entries(data)) {
    for (const entry of entries) {
      rows.push({
        sessionId: entry.id,
        profile,
        cwd: normalizeCwd(entry.cwd),
        sessionKey: entry.sessionKey,
        controllerEndpoint: entry.controllerEndpoint,
        lastUsed: entry.lastUsed,
      });
    }
  }

  rows.sort((a, b) => b.lastUsed - a.lastUsed);
  return rows;
}

export async function sessionsListCommand(flags?: {
  json?: boolean;
  active?: boolean;
}): Promise<void> {
  let rows = flattenSessions();

  if (flags?.active) {
    const results = await Promise.all(
      rows.map(async (row) => {
        if (row.controllerEndpoint) {
          const reachable = await isEndpointReachable(row.controllerEndpoint);
          return { ...row, active: reachable };
        }
        return { ...row, active: false };
      })
    );
    rows = results.filter((r) => r.active);
  }

  if (flags?.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log('No sessions found.');
    return;
  }

  for (const row of rows) {
    const activeTag = row.active ? ' [active]' : '';
    const keyInfo = row.sessionKey ? ` (key: ${row.sessionKey})` : '';
    const cwdInfo = row.cwd ? ` @ ${row.cwd}` : '';
    console.log(`${row.sessionId}${keyInfo}${cwdInfo}${activeTag}`);
    console.log(`  profile: ${row.profile}`);
    if (row.lastUsed) {
      console.log(`  last used: ${new Date(row.lastUsed).toISOString()}`);
    }
  }
}

export function sessionsListJson(): SessionRow[] {
  return flattenSessions();
}
