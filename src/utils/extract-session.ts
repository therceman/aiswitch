import { detectHarness, getSessionPatterns } from './harness';

interface SessionInfo {
  id: string;
  name?: string;
}

export function extractSessionInfo(output: string, executable: string): SessionInfo | null {
  const harness = detectHarness(executable);
  const patterns = getSessionPatterns(harness);

  let id: string | null = null;
  let name: string | undefined;

  for (const pattern of patterns) {
    const match = output.match(pattern.idPattern);
    if (match) {
      id = match[1];
      if (pattern.namePattern) {
        const nameMatch = output.match(pattern.namePattern);
        if (nameMatch) {
          const potentialName = nameMatch[1].trim();
          if (
            potentialName.toLowerCase() !== 'continue' &&
            potentialName.toLowerCase() !== 'session'
          ) {
            name = potentialName;
          }
        }
      }
      break;
    }
  }

  if (!id) return null;

  return { id, name };
}

export function extractSessionId(output: string, executable: string): string | null {
  const info = extractSessionInfo(output, executable);
  return info?.id || null;
}

export function extractSessionName(output: string, executable: string): string | undefined {
  const info = extractSessionInfo(output, executable);
  return info?.name;
}
