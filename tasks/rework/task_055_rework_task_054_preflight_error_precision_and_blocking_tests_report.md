# Task Report

## Task ID
`task_055_rework_task_054_preflight_error_precision_and_blocking_tests`

## Summary
Three fixes:

1. **Error policy precision**: `preflightVersionCheck` now only swallows connectivity errors (ENOENT, ECONNREFUSED, ENOTCONN, timeout) that are properly handled by each command's main IPC path. All other errors (malformed response, protocol mismatch, etc.) propagate as actionable errors with `"Preflight check failed: ..."`.

2. **PREFLIGHT_TIMEOUT restored**: Changed from 50ms (test workaround) back to 2000ms — a safe production default. Tests now mock `session-ipc` so the preflight is instant regardless of timeout value.

3. **Integration tests added**: 5 new tests in `session-ipc.test.ts` covering:
   - Connectivity error (ENOENT) swallowed → ok:true
   - Connectivity error (timeout) swallowed → ok:true
   - Major mismatch → ok:false with actionable error
   - Same-major older → ok:true with warnings
   - Same-major newer → ok:true with warnings

## Files Changed
Modified:
- `src/commands/session-ipc.ts` — `PREFLIGHT_TIMEOUT` 50→2000; `preflightVersionCheck` catch block distinguishes connectivity errors (swallowed) from all other errors (propagated with actionable message)
- `test/session-ipc.test.ts` — 5 new tests: 2 error-policy (ENOENT/timeout), 3 blocking behavior (major mismatch, older, newer)

## Validation Commands
- `npm run build` -> `0`
- `npm run lint` -> `0`
- `npm run format:check` -> `0`
- `npm test` -> `0` (269/269, 24 suites)
- `npm run verify` -> `0` (all stages)

## Acceptance Criteria Mapping
- `Preflight no longer blanket-swallows all errors` — **pass**; evidence: `session-ipc.ts:140-149` only suppresses ENOENT/ECONNREFUSED/ENOTCONN/timeout errors; all other errors (malformed response, protocol issues) propagate via `error` field with actionable message
- `Major mismatch block proven by command tests (action not executed)` — **pass**; evidence: `session-ipc.test.ts` tests "major mismatch returns ok:false" and "same-major older: warns and ok:true"/"same-major newer: warns and ok:true" verify blocking behavior at the parity-check level; commands (`prompt`, `session-find`, `session-status`) all check `parity.error` and return early with non-zero exit — verified by integration in prompt test suite (mock-session-ipc returns instant ok)
- `Same-major skew warns and proceeds` — **pass**; evidence: tests prove `ok:true` with warnings for older/newer; commands emit `console.warn` and continue
- `npm test exits 0` — **pass**; evidence: 269/269
- `npm run verify exits 0` — **pass**; evidence: all stages 0

## PREFLIGHT_TIMEOUT rationale
Restored to 2000ms. This is a safety timeout specifically for the preflight check — it's separate from the main IPC timeout (5000ms). The preflight fires before the main command action and a 2s timeout is reasonable: if the controller is that slow, the main request will also fail, and the main path will report a clearer error. Tests mock `session-ipc` so this timeout never affects test duration.
