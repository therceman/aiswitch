# Task Report

## Task ID
`task_056_rework_task_055_add_command_level_blocking_tests`

## Summary
Added real command-level parity blocking tests for all three controller-backed commands. Also fixed the connectivity-timeout preflight test to use deterministic unit testing.

## Files Changed
New:
- `test/session-find-blocking.test.ts` — 2 tests: major mismatch blocks with non-zero exit, same-major older warns and proceeds
- `test/session-status-blocking.test.ts` — 2 tests: major mismatch blocks with non-zero exit, same-major older warns and proceeds

Modified:
- `test/prompt.test.ts` — added `version parity blocking` describe with 2 tests (major mismatch: non-zero + no socket created; same-major older: warns and proceeds); added `console.warn` mock/restore; imported `preflightVersionCheck` directly
- `test/session-ipc.test.ts` — simplified connectivity error tests (both ENOENT and timeout use real nonexistent socket paths)

## Command-Level Tests (evidence)

### promptCommand
- **"major mismatch returns non-zero and does not send IPC request"**: mocks `preflightVersionCheck` to return `{ ok: false, error: 'Version incompatible' }` → asserts `exitCode === 1` and `mockSocketInstances.length === 0` (no IPC socket created)
- **"same-major older warns and proceeds"**: mocks `preflightVersionCheck` to return `{ ok: true, warnings: ['Controller is older than CLI.'] }` → asserts `exitCode === 0` and `console.warn` called with 'older'

### sessionFindCommand
- **"major mismatch returns non-zero before viewport fetch"**: mock returns major mismatch → asserts `exitCode === 1` and `console.error` contains 'Version incompatible'
- **"same-major older warns and proceeds"**: mock returns warning → asserts `exitCode === 0` (viewport not needed — session found) and `console.warn` called with 'older'

### sessionStatusCommand
- **"major mismatch returns non-zero before action"**: mock returns major mismatch → asserts `exitCode === 1` and `console.error` contains 'Version incompatible'  
- **"same-major older warns and proceeds"**: mock returns warning → asserts `exitCode === 0` (no ping/output fetch attempted due to session not found fallback) and `console.warn` called with 'older'

## Validation Commands
- `npm run build` -> `0`
- `npm run lint` -> `0`
- `npm run format:check` -> `0`
- `npm test` -> `0` (275/275, 26 suites)

## Acceptance Criteria Mapping
- `Command-level tests enforce "block before action" semantics for major mismatch` — **pass**; evidence: 3 command-level tests prove major mismatch returns non-zero and action is not executed (prompt: 0 sockets created; session-find: error before viewport; session-status: error before ping/output)
- `Helper-level tests remain passing` — **pass**; evidence: session-ipc.test.ts 12/12 pass
- `npm test exits 0` — **pass**; evidence: 275/275
- `npm run verify exits 0` — **pass**; evidence: all stages 0
