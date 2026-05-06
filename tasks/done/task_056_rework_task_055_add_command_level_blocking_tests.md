# Task 056: Rework task 055 — add real command-level parity blocking tests

## Why task 055 is not accepted
Current tests verify helper-level behavior (`checkVersionParity`, partial `preflightVersionCheck`) but still do not prove command-level hard-stop semantics before action execution.

## Required additions
Add explicit command-level tests (not only helper tests):

1. `promptCommand`:
   - when preflight returns major-mismatch error, command exits non-zero
   - must NOT send `session.input` request payload (action blocked)

2. `sessionFindCommand`:
   - when preflight returns major-mismatch error, exits non-zero
   - must NOT fetch viewport/output IPC data

3. `sessionStatusCommand`:
   - when preflight returns major-mismatch error, exits non-zero
   - must NOT perform ping/output/info fetch requests

4. Same-major skew path:
   - for at least one command, assert warning is emitted and main action proceeds.

## Additional fix
`preflightVersionCheck` timeout-connectivity test is currently not a true timeout case.
Replace with deterministic unit test by mocking `fetchControllerInfo` rejection (timeout-shaped error) and validating policy decision.

## Acceptance Criteria
- Command-level tests enforce "block before action" semantics for major mismatch.
- Helper-level tests remain passing.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_056_rework_task_055_add_command_level_blocking_tests_report_draft.md`
2. Fill all sections with concrete evidence + exit codes.
3. Rename to:
   - `tasks/todo/task_056_rework_task_055_add_command_level_blocking_tests_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_056_done"`
