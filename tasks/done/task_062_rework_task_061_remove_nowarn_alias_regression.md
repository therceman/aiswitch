# Task 062: Rework task 061 — remove `--nowarn` alias regression

## Why task 061 is not accepted yet
Heartbeat command implementation reintroduced `flags.nowarn` alias in `src/cli.ts`, which violates current CLI policy: only `--no-warn` is supported.

## Required Fix
1. In `heartbeat` CLI handling, remove `flags.nowarn` usage.
2. Keep only:
   - `const noWarn = flags['no-warn'] === true;`
3. Ensure no other new `nowarn` references were introduced by this task.

## Validation
- `npm run build`
- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run verify`

## Acceptance Criteria
- Heartbeat command remains functional.
- Only `--no-warn` is accepted; no `--nowarn` support.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_062_rework_task_061_remove_nowarn_alias_regression_report_draft.md`
2. Fill all sections with concrete evidence + exit codes.
3. Rename to:
   - `tasks/todo/task_062_rework_task_061_remove_nowarn_alias_regression_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_062_done"`
