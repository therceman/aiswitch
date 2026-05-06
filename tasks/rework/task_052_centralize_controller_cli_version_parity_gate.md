# Task 052: Centralize controller/CLI semantic version parity gate

## Objective
Add a shared IPC preflight parity check so all controller-backed commands consistently enforce controller/CLI semantic version compatibility without duplicating logic per command.

## Problem
Current commands only fail on protocol-level incompatibility (`METHOD_NOT_FOUND`). They do not warn/error when controller and CLI versions differ but protocol still responds, causing silent behavior skew.

## Required Outcome
Create one reusable preflight gate used by all controller-backed commands (`prompt`, `session-find`, `session-status`, and any others using controller IPC).

## Design Requirements
1. Add shared helper in a central module (e.g. `src/commands/session-ipc.ts` or similar):
   - Connect to controller.
   - Fetch `session.info`.
   - Compare `controller airelayVersion` vs local CLI version.
2. Enforce semantic policy centrally:
   - **Major mismatch** (controller major != CLI major): hard error, actionable restart message.
   - **Controller older minor/patch**: warning shown once per command invocation (command may continue).
   - **Controller newer**: warning (CLI may be older) with actionable suggestion.
3. Commands must call this shared preflight before their main request flow.
4. Keep existing protocol/version checks intact (do not regress METHOD_NOT_FOUND handling).
5. Ensure user-facing errors are concise and actionable.

## Scope
- Shared IPC helper + semver comparison utility.
- Refactor controller-backed commands to use helper.
- Tests for helper + command integration.

## Tests (Mandatory)
Cover:
1. Equal versions: no warning, command continues.
2. Older controller same major: warning emitted, command continues.
3. Newer controller same major: warning emitted, command continues.
4. Major mismatch: command fails with actionable error.
5. Protocol unsupported path still returns existing actionable restart message.

## Acceptance Criteria
- Centralized parity logic used by all relevant controller-backed commands.
- No per-command duplicated version-parity logic.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_052_centralize_controller_cli_version_parity_gate_report_draft.md`
2. Fill all sections with concrete evidence and exit codes.
3. Rename to:
   - `tasks/todo/task_052_centralize_controller_cli_version_parity_gate_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_052_done"`
