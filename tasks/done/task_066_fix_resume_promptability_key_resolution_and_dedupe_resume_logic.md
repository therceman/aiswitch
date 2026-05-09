# Task 066: Fix resume promptability + key resolution + dedupe resume launch logic

## Objective
Resolve real-world failure where a freshly resumed session is still non-promptable, and clean up duplicate resume launch code in `resume.ts`.

## Context / Current Failure
Observed after resume:
`Error: IPC error from controller: Prompt injection unavailable: this session is not in a promptable mode.`

Even with recent `usePty: true` change, key collisions and stale entries can route prompt to a non-promptable old session.

## Required Outcomes
1. **Functional fix**: `resume` should reliably produce a prompt-capable session that accepts `airelay prompt <key> ...` immediately.
2. **Resolution fix**: key/session lookup must prefer the correct newest active runtime entry when duplicate `sessionKey` entries exist.
3. **Code quality fix**: remove duplicated `runCommand(...)` launch construction in `resume.ts`.

## Implementation Requirements
### A) Session resolution hardening
- Audit `findSessionByKey` / selection logic used by `prompt`, `session-status`, `resume`.
- When multiple entries share same `sessionKey`, prefer deterministically:
  1. newest active runtime entry with reachable controller
  2. otherwise newest runtime entry
  3. otherwise legacy fallback
- Prune/ignore stale entries where possible.
- Ensure `prompt` resolves to the active prompt-capable target after resume/start.

### B) Resume promptability guarantee
- Ensure resume path always launches in prompt-capable mode (PTY path), and the resulting saved entry is the one resolved by key.
- Validate that `sessionKey`, `profileArgs`, `profileSessionId`, and controller endpoint metadata align after resume.

### C) Dedupe in `resume.ts`
- Extract shared helper (e.g. `resumeSession(profileName, sessionEntry)`):
  1. builds `resumeArgs`
  2. applies metadata fallback warning once
  3. calls `runCommand(..., { sessionKey, profileSessionId, profileArgs, usePty: true })`
  4. returns exit code handling
- Use helper in both branches (direct found + selector).

### D) Deep review for dupes/robustness
- Inspect nearby resume/session modules for duplicate logic and fragile assumptions.
- Apply minimal safe refactors where justified.

## Tests (Mandatory)
Add/extend tests for:
1. Duplicate same-key entries: resolver picks newest active runtime entry.
2. Resume then prompt by key succeeds (or unit-level equivalent proving promptable binding is selected).
3. Legacy fallback still works with warning.
4. `resume.ts` helper path covers both branches and avoids behavior regressions.

## Acceptance Criteria
- Reproduced failure is fixed: resumed session can be prompted by key.
- Duplicate-key stale-entry routing issue is fixed.
- `resume.ts` duplicate launch code is removed via shared helper.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_066_fix_resume_promptability_key_resolution_and_dedupe_resume_logic_report_draft.md`
2. Fill all sections with concrete evidence + exit codes.
3. Rename to:
   - `tasks/todo/task_066_fix_resume_promptability_key_resolution_and_dedupe_resume_logic_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_066_done"`
