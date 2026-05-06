# Task 051: Make session-find reliable with rolling live snapshot window

## Objective
Fix missed matches in `session-find` (e.g. visible `pong` / `interrupt` not found) by introducing a rolling live snapshot history from the true terminal viewport and searching within that history.

## Problem
Current strict single-moment viewport query can miss transient content or race with redraw timing. User needs practical reliability for active agent monitoring.

## Required Behavior
1. Controller captures viewport snapshots periodically (every 1s default).
2. Keep rolling history for recent visible content (minimum 50 lines total retained).
3. `session-find` searches this rolling snapshot window, not only a single instant.
4. Keep ability to detect currently visible terms and just-recent transient terms.

## Design Requirements
- Keep true viewport source from xterm/headless buffer.
- Add a controller-side structure for sampled snapshots (timestamped optional).
- Expose IPC method for search window retrieval, or extend existing viewport method in a backward-compatible way.
- Avoid unbounded memory growth (hard cap required).
- Ensure old-controller compatibility errors remain actionable.

## Suggested Defaults
- Snapshot interval: 1000ms
- Retained lines: at least 50 (can be configurable constant, default 50-120)

## Tests (Mandatory)
Add tests proving:
1. A term visible briefly then replaced can still be found shortly after.
2. A term absent from both current viewport and recent window is not found.
3. Window retention cap works.
4. `session-find` uses the rolling window source.

## Acceptance Criteria
- Repro case fixed: `session-find <session> pong` can find recent visible `pong`.
- Similar for `interrupt` when present/recently visible.
- `npm test` exits `0`.
- `npm run verify` exits `0`.

## Report Process (Mandatory)
1. Copy `tasks/report_stub.md` to:
   - `tasks/todo/task_051_session_find_live_snapshot_window_report_draft.md`
2. Fill all sections with concrete evidence and exit codes.
3. Rename to:
   - `tasks/todo/task_051_session_find_live_snapshot_window_report.md`
4. Notify completion:
   - `airelay prompt gpt_master_airelay "task_051_done"`
