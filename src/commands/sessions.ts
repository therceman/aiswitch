import os from 'os';
import path from 'path';
import { createJsonStore } from '../utils/json-store';

export interface SessionEntry {
  id: string;
  name?: string;
  profile: string;
  lastUsed: number;
  cwd?: string;
  sessionKey?: string;
  controllerEndpoint?: string;
}

export interface SessionsData {
  [profile: string]: SessionEntry[];
}

const store = createJsonStore<SessionsData>({
  envVar: 'AIRELAY_SESSIONS',
  defaultPath: path.join(os.homedir(), '.airelay', 'sessions.json'),
});

export function loadSessions(): SessionsData {
  return store.load();
}

function saveSessions(sessions: SessionsData): void {
  store.save(sessions);
}

export function getSessionsPath(): string {
  return store.getPath();
}

export function addSession(
  profile: string,
  sessionId: string,
  name?: string,
  cwd?: string,
  sessionKey?: string,
  controllerEndpoint?: string
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
    if (controllerEndpoint) {
      sessions[profile][existingIndex].controllerEndpoint = controllerEndpoint;
    }
  } else {
    sessions[profile].push({
      id: sessionId,
      name,
      profile,
      lastUsed: Date.now(),
      cwd,
      sessionKey,
      controllerEndpoint,
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
  const truncatedId = session.id.length > 8 ? session.id.slice(0, 8) + '...' : session.id;
  return truncatedId;
}

export function findSessionByKey(
  keyOrId: string
): { profile: string; session: SessionEntry } | null {
  const sessions = loadSessions();

  for (const [profile, profileSessions] of Object.entries(sessions)) {
    for (const session of profileSessions) {
      if (session.sessionKey && session.sessionKey === keyOrId) {
        return { profile, session };
      }
      if (session.id === keyOrId) {
        return { profile, session };
      }
    }
  }

  return null;
}

export function updateSessionControllerEndpoint(keyOrId: string, endpoint: string): boolean {
  const sessions = loadSessions();

  for (const [, profileSessions] of Object.entries(sessions)) {
    const entry = profileSessions.find((s) => s.sessionKey === keyOrId || s.id === keyOrId);
    if (entry) {
      entry.controllerEndpoint = endpoint;
      entry.lastUsed = Date.now();
      saveSessions(sessions);
      return true;
    }
  }

  return false;
}

export function removeSessionByKey(key: string): boolean {
  const sessions = loadSessions();

  for (const [profile, profileSessions] of Object.entries(sessions)) {
    const idx = profileSessions.findIndex((s) => s.sessionKey === key);
    if (idx !== -1) {
      profileSessions.splice(idx, 1);
      sessions[profile] = profileSessions;
      saveSessions(sessions);
      return true;
    }
  }

  return false;
}
