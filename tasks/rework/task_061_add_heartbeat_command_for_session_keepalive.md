# Task 061: Add `airelay heartbeat <session>` keepalive command

## Objective
Add a heartbeat command that periodically sends a keepalive prompt to a target session:
- `airelay heartbeat <session>`
- sends message: `[from=cron] heartbeat`
- interval: every 5 minutes

## Required Behavior
1. Command starts a heartbeat loop for the given session key/id.
2. Every 5 minutes, send:
   - text payload exactly: `[from=cron] heartbeat`
3. Continue until interrupted (Ctrl+C / SIGINT / SIGTERM).
4. Print concise lifecycle logs:
   - start message (session + interval)
   - each heartbeat sent (timestamp)
   - clean stop message on interrupt
5. Return non-zero on immediate setup failures (session not found / IPC errors).

## Integration
- Add new CLI command route: `heartbeat <session>`
- Reuse existing prompt infrastructure where possible.
- Respect existing parity checks and `--no-warn` behavior if prompt path supports it.

## Flags (minimum)
- `--no-warn` support should be available (same semantics as other commands).

## Optional (nice to have, only if simple)
- `--interval <ms|sec|min>` override for testing (default 5m).
If implemented, document clearly and test.

## Tests (Mandatory)
Add tests for:
1. Command wiring from CLI.
2. Loop schedules sends at expected interval (mock timers).
3. Payload is exactly `[from=cron] heartbeat`.
4. Clean shutdown on interrupt signal.
5. Error path returns non-zero when session unavailable.

## Acceptance Criteria
- `airelay heartbeat <session>` works and sends every 5 minutes.
- Graceful stop on Ctrl+C.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_061_add_heartbeat_command_for_session_keepalive_report_draft.md`
2. Fill all sections with concrete evidence + exit codes.
3. Rename to:
   - `tasks/todo/task_061_add_heartbeat_command_for_session_keepalive_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_061_done"`
