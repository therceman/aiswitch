export type HarnessType = 'opencode' | 'codex' | 'unknown';

const HARNESS_PATTERNS: Record<string, string[]> = {
  opencode: ['opencode'],
  codex: ['codex', 'o1', 'o3'],
};

export function detectHarness(executable: string): HarnessType {
  const lower = executable.toLowerCase();
  for (const [harness, patterns] of Object.entries(HARNESS_PATTERNS)) {
    if (patterns.some((p) => lower.includes(p))) {
      return harness as HarnessType;
    }
  }
  return 'unknown';
}

export function getSessionArgExample(harness: HarnessType): string {
  switch (harness) {
    case 'opencode':
      return '-s session-id';
    case 'codex':
      return 'resume session-id';
    default:
      return '--session-id';
  }
}

export function getArgsHelpMessage(harness: HarnessType, hasSession: boolean): string {
  if (hasSession) {
    return 'Additional args (or press enter to use session)';
  }
  const example = getSessionArgExample(harness);
  return `Additional args (e.g., ${example})`;
}

export interface SessionPattern {
  idPattern: RegExp;
  namePattern?: RegExp;
}

export function getSessionPatterns(harness: HarnessType): SessionPattern[] {
  switch (harness) {
    case 'opencode':
      return [
        {
          idPattern: /opencode -s (ses_[a-zA-Z0-9]+)/,
          namePattern: /Session\s+([^\n\r]+)/,
        },
        {
          idPattern: /opencode --session (ses_[a-zA-Z0-9]+)/,
        },
      ];
    case 'codex':
      return [
        {
          idPattern: /codex resume ([a-zA-Z0-9]+)/,
        },
        {
          idPattern: /codex --session ([a-zA-Z0-9]+)/,
        },
      ];
    default:
      return [
        {
          idPattern: /Session[:\s]+([a-zA-Z0-9_]+)/,
        },
      ];
  }
}
