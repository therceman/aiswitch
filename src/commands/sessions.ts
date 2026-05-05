import fs from 'fs';
import path from 'path';
import os from 'os';
import { migrateLegacyHomeDirIfNeeded } from '../config/migrate';

interface SessionEntry {
  id: string;
  name?: string;
  profile: string;
  lastUsed: number;
  cwd?: string;
  sessionKey?: string;
  description?: string;
}

interface SessionsData {
  [profile: string]: SessionEntry[];
}

function getSessionsPath(): string {
  if (!process.env.AIRELAY_SESSIONS) {
    migrateLegacyHomeDirIfNeeded();
  }
  return process.env.AIRELAY_SESSIONS || path.join(os.homedir(), '.airelay', 'sessions.json');
}

function loadSessions(): SessionsData {
  try {
    const sessionsPath = getSessionsPath();
    if (!fs.existsSync(sessionsPath)) {
      return {};
    }
    const content = fs.readFileSync(sessionsPath, 'utf-8');
    return JSON.parse(content) as SessionsData;
  } catch {
    return {};
  }
}

function saveSessions(sessions: SessionsData): void {
  try {
    const sessionsPath = getSessionsPath();
    const dir = path.dirname(sessionsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch {
    // Ignore errors when saving sessions
  }
}

export function addSession(
  profile: string,
  sessionId: string,
  name?: string,
  cwd?: string,
  sessionKey?: string,
  description?: string
): void {
  const sessions = loadSessions();
  if (!sessions[profile]) {
    sessions[profile] = [];
  }

  const existingIndex = sessions[profile].findIndex((s) => s.id === sessionId);
  if (existingIndex !== -1) {
    sessions[profile][existingIndex].lastUsed = Date.now();
    if (name) {
      sessions[profile][existingIndex].name = name;
    }
    if (cwd) {
      sessions[profile][existingIndex].cwd = cwd;
    }
    if (sessionKey) {
      sessions[profile][existingIndex].sessionKey = sessionKey;
    }
    if (description) {
      sessions[profile][existingIndex].description = description;
    }
  } else {
    sessions[profile].push({
      id: sessionId,
      name,
      profile,
      lastUsed: Date.now(),
      cwd,
      sessionKey,
      description,
    });
  }

  sessions[profile].sort((a, b) => b.lastUsed - a.lastUsed);
  sessions[profile] = sessions[profile].slice(0, 50);
  saveSessions(sessions);
}

export function getSessions(profile: string): SessionEntry[] {
  const sessions = loadSessions();
  return sessions[profile] || [];
}

export function renameSession(profile: string, sessionId: string, newName: string): boolean {
  const sessions = loadSessions();
  if (!sessions[profile]) {
    return false;
  }

  const entry = sessions[profile].find((s) => s.id === sessionId);
  if (!entry) {
    return false;
  }

  entry.name = newName;
  saveSessions(sessions);
  return true;
}

export function deleteSession(profile: string, sessionId: string): boolean {
  const sessions = loadSessions();
  if (!sessions[profile]) {
    return false;
  }

  const initialLength = sessions[profile].length;
  sessions[profile] = sessions[profile].filter((s) => s.id !== sessionId);

  if (sessions[profile].length !== initialLength) {
    saveSessions(sessions);
    return true;
  }
  return false;
}

export function getSessionDisplayName(session: SessionEntry): string {
  if (session.name) {
    return session.name;
  }
  const shortId = session.id.length > 8 ? session.id.slice(0, 8) + '...' : session.id;
  return shortId;
}

export function findSessionByKey(
  keyOrId: string
): { profile: string; session: SessionEntry } | null {
  const sessions = loadSessions();

  for (const [profile, profileSessions] of Object.entries(sessions)) {
    for (const session of profileSessions) {
      // Match by session key
      if (session.sessionKey && session.sessionKey === keyOrId) {
        return { profile, session };
      }
      // Match by session ID
      if (session.id === keyOrId) {
        return { profile, session };
      }
    }
  }

  return null;
}
