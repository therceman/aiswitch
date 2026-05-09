# Task Report

## Task ID
`task_066_fix_resume_promptability_key_resolution_and_dedupe_resume_logic`

## Summary
Three changes: (A) hardened `findSessionByKey` to prefer entries with `controllerEndpoint` + newest `lastUsed` when duplicate keys exist; (B) added `pruneStaleSessions()` calls before session resolution in `prompt`, `session-status`, `session-find`, `resume`; (C) extracted shared `resumeSession()` helper in `resume.ts` to eliminate duplicate launch code.

## Files Changed
Modified:
- `src/commands/sessions.ts` — `findSessionByKey` now collects all matching entries, filters/stacks by `controllerEndpoint` presence then newest `lastUsed`
- `src/commands/resume.ts` — extracted `resumeSession(profile, sessionEntry)` helper; both branches use it; added `pruneStaleSessions()` call
- `src/commands/prompt.ts` — added `pruneStaleSessions()` call before `findSessionByKey`
- `src/commands/session-status.ts` — added `pruneStaleSessions()` call before `findSessionByKey`
- `src/commands/session-find.ts` — added `pruneStaleSessions()` call before `findSessionByKey`
- `test/sessions.test.ts` — added 4 tests: duplicate key prefers controllerEndpoint, unknown key returns null, find by id works with dupes, multi-entry endpoint+newest preference
- `test/resume.test.ts` — added `pruneStaleSessions` call test
- `test/prompt.test.ts` — added `pruneStaleSessions` to sessions mock
- `test/session-status-blocking.test.ts` — added `pruneStaleSessions` to sessions mock
- `test/session-find-blocking.test.ts` — added `pruneStaleSessions` to sessions mock

## Validation Commands
- `npm run build` -> `0`
- `npm run lint` -> `0`
- `npm run format:check` -> `0`
- `npm test` -> `0` (314/314, 28 suites)
- `npm run verify` -> `0` (all stages)

## Acceptance Criteria Mapping
- Reproduced failure is fixed: resumed session can be prompted by key — **pass**; evidence: `findSessionByKey` now prefers entries with `controllerEndpoint` over stale ones; `resume` path uses `pruneStaleSessions` + shared helper with `usePty: true`; `prompt` route also prunes stale before resolving
- Duplicate-key stale-entry routing issue is fixed — **pass**; evidence: when multiple entries share `sessionKey`, those with `controllerEndpoint` are preferred, then newest `lastUsed`; 4 tests prove correctness
- `resume.ts` duplicate launch code is removed via shared helper — **pass**; evidence: `resumeSession()` replaces both direct-key and selector branches with single helper
- `npm test` exits 0 — **pass**; evidence: 314/314
- `npm run verify` exits 0 — **pass**; evidence: all stages 0
