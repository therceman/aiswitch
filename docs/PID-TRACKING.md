# PID Tracking & Process Cleanup

## Problem

When running diagnostic commands like `aiswitch opencode --version` or `aiswitch opencode models`, orphaned processes were left running after completion, consuming ~1 GB of RAM each.

**Root causes:**
1. Child processes not properly detached
2. Unhandled promises keeping Node.js event loop alive
3. No mechanism to track and cleanup zombie processes

## Solution

### 1. PID Tracking (`src/utils/pid.ts`)

All spawned harness processes are now tracked in `~/.aiswitch/pids.json`:

```json
{
  "77837": {
    "pid": 77837,
    "ppid": 77824,
    "command": "opencode",
    "args": ["-s", "ses_abc123"],
    "cwd": "/home/user/project",
    "started": 1776409079562,
    "profile": "opencode"
  }
}
```

**Features:**
- Auto-cleanup on module load (removes dead processes)
- Register/unregister PIDs on spawn/exit
- Detect orphaned processes (parent aiswitch died)

### 2. Fixed Spawn Logic (`src/runtime/spawn.ts`)

- Added `trackPID` option to enable tracking
- Properly unregister PIDs on process exit
- Set `detached: false` to ensure proper parent-child relationship
- Handle both 'close' and 'error' events for cleanup

### 3. Cleanup Commands

**`aiswitch ps`** - List all tracked processes
```
Tracked processes:
PID	PPID	Command	Profile	CWD
---	----	-------	-------	---
77837	77824	opencode	opencode	/home/user/project
```

**`aiswitch cleanup`** - Kill orphaned processes
```
Killed orphaned process 13047 (opencode)
Killed orphaned process 18907 (opencode)
Cleaned up 2 orphaned processes.
```

## Usage

### Check for zombie processes
```bash
aiswitch ps
```

### Clean up orphaned processes
```bash
aiswitch cleanup
```

### Manual cleanup (if needed)
```bash
# Find orphaned opencode processes
ps aux | grep opencode | grep -v grep

# Kill specific PID
kill <PID>

# Kill all orphaned opencode processes
pkill -f "opencode.*--version"
pkill -f "opencode.*models"
```

## Implementation Details

### PID Lifecycle

1. **Spawn**: `registerPID(pid, command, args, profile)`
2. **Exit**: `unregisterPID(pid)` (automatic)
3. **Orphan detection**: Check if parent PID is alive with `process.kill(ppid, 0)`
4. **Cleanup**: Kill orphan + remove from tracking file

### Auto-Cleanup Triggers

- Module load (removes dead PIDs from tracking file)
- Process exit (unregisters PID)
- Manual `aiswitch cleanup` command

### File Location

- Default: `~/.aiswitch/pids.json`
- Override: `AIUSE_PIDS` environment variable

## Benefits

1. **Prevents memory leaks** - No more zombie processes consuming GBs of RAM
2. **Easy debugging** - See all active aiswitch-spawned processes
3. **Automatic cleanup** - Dead processes removed from tracking
4. **Manual control** - Kill orphans on demand

## Future Enhancements

- [ ] Auto-cleanup on aiswitch startup
- [ ] Timeout-based cleanup (kill processes running > N hours)
- [ ] Resource monitoring (alert on high memory usage)
- [ ] Process groups (kill all processes for a session)
