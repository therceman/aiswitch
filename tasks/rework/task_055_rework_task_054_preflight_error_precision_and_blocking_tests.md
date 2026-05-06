# Task 055: Rework task 054 — precise preflight error policy + blocking integration tests

## Why task 054 is not accepted
Remaining gaps:
1. `preflightVersionCheck` still catches all exceptions and returns `{ok:true}`. This masks non-connectivity parsing/protocol response issues.
2. Missing command-level integration tests proving major mismatch blocks command action before request send.
3. `PREFLIGHT_TIMEOUT=50` appears as a test workaround; needs rationale or safer value with deterministic tests.

## Required Fixes
1. **Error policy precision** in `preflightVersionCheck`:
   - Only suppress connectivity/availability errors explicitly expected to be handled by command main path (e.g., ENOENT/ECONNREFUSED/ENOTCONN/timeout).
   - Do NOT suppress malformed/invalid `session.info` response classes; return actionable error.
2. **Deterministic blocking behavior**:
   - Ensure preflight is awaited and major mismatch hard-stops before main command action for `prompt`, `session-find`, `session-status`.
3. **Add integration tests**:
   - `prompt`: major mismatch => returns non-zero and does not send `session.input` request.
   - `session-find`: major mismatch => non-zero before viewport fetch.
   - `session-status`: major mismatch => non-zero before ping/output/info fetch.
   - same-major older/newer => warnings + success path.
4. **Timeout handling**:
   - Revisit `PREFLIGHT_TIMEOUT=50`; either restore sane default or document and test a robust reason.

## Acceptance Criteria
- Preflight no longer blanket-swallows all errors.
- Major mismatch block proven by command tests (action not executed).
- Same-major skew warns and proceeds.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_055_rework_task_054_preflight_error_precision_and_blocking_tests_report_draft.md`
2. Fill with concrete evidence and exit codes.
3. Rename to:
   - `tasks/todo/task_055_rework_task_054_preflight_error_precision_and_blocking_tests_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_055_done"`
