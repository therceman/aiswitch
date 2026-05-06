# Task 054: Rework task 052 for strict centralized parity enforcement

## Why task 052 is not accepted
Current implementation is advisory/non-blocking and runs preflight concurrently, so command actions can execute before parity verdict. This violates the required hard-stop behavior for major version mismatch.

Observed issues:
1. `prompt` sends prompt first, then may report parity error afterwards.
2. `session-find` / `session-status` do not fail on parity error (`parity.error` ignored in those commands).
3. `preflightVersionCheck` catches all failures and returns `{ok:true}`, masking important preflight error classes.

## Required Fixes
1. **Centralized gate must be authoritative**:
   - Commands must perform parity preflight before main controller action.
   - If parity result is major mismatch (`ok:false`), command must fail immediately and not execute action.
2. **No per-command parity logic**:
   - Keep single shared helper in `session-ipc.ts`.
   - Commands should only consume standardized result handling.
3. **Error handling precision**:
   - Do not blanket-swallow all preflight failures.
   - Only suppress errors that are explicitly expected to be handled by existing protocol/IPC path.
4. **Consistent command behavior**:
   - `prompt`, `session-find`, `session-status` all enforce same preflight policy.
5. **Warnings policy**:
   - older/newer same-major warnings should still allow command to proceed.

## Tests (Mandatory)
Add/adjust tests proving:
1. Major mismatch prevents `prompt` action send.
2. Major mismatch causes non-zero exit for `session-find` and `session-status`.
3. Same-major older/newer warns and proceeds.
4. Existing protocol-unsupported behavior remains actionable and unchanged.

## Acceptance Criteria
- Major mismatch hard-stops all controller-backed commands before action.
- Same-major skew warns but allows command.
- Centralized helper used consistently.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_054_rework_task_052_strict_parity_gate_enforcement_report_draft.md`
2. Fill all sections with concrete evidence + exit codes.
3. Rename to:
   - `tasks/todo/task_054_rework_task_052_strict_parity_gate_enforcement_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_054_done"`
