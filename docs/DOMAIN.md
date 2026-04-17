# DOMAIN.md — aiswitch Domain Model

## Core Concepts

### Profile

A named configuration for running an AI coding assistant (harness).

**Attributes:**

- `name`: Unique identifier
- `executable`: Command to run (opencode/codex)
- `cwd`: Optional working directory override
- `args`: Optional default arguments
- `env`: Environment variables (with path expansion)
- `description`: Human-readable description
- `createDirs`: Directories to create before running

**Lifecycle:**

- Created via `aiswitch create <name>` or `aiswitch new` (interactive)
- Stored in `~/.aiswitch/config.yaml`
- Can be default (opencode/codex) or custom

### Session

A specific instance of a harness run with a unique identifier.

**Attributes:**

- `id`: Harness-provided session ID (e.g., `ses_267f917bdffe...`)
- `profile`: Reference to parent profile
- `sessionKey`: User-friendly identifier (default: `<profile>_<last-4>`)
- `description`: Optional user description
- `cwd`: Working directory where started
- `lastUsed`: Timestamp for recency tracking

**Lifecycle:**

- Created when harness starts with `-s <id>` or generates new ID
- Saved after harness exits (manual entry of session ID)
- Stored in `~/.aiswitch/sessions.json`
- Limited to 50 per profile (oldest pruned)

### Harness

The underlying AI coding assistant executable.

**Supported:**

- `opencode` — OpenCode CLI
- `codex` — OpenAI Codex CLI

**Detection:**

- Via `src/utils/harness.ts` patterns
- Session ID extraction from output
- Args help messages

### Session Key

A user-friendly identifier for referencing sessions.

**Format:** `<profile>_<last-4-chars-of-session-id>`

**Example:** `opencode_XjhS`

**Purpose:**

- Easier to remember than full session ID
- Provides context via profile prefix
- Can be customized by user

## Commands

### Interactive (TUI)

**`aiswitch`** (no arguments)

Main menu with three options:

1. **Resume an existing profile session**
   - Select profile → Select session → Run with `-s <id>`
   - Can rename/delete sessions (R/D keys)
2. **Start a new profile session**
   - Select profile → Run without session ID
3. **Create a new profile**
   - Interactive profile creation flow

**Post-Run Flow:**
After harness exits:

- Prompt for session ID
- If provided: prompt for session key (pre-filled) and description
- Save to session history

### CLI Commands

**`aiswitch resume <profile|session-key>`**

- Resume an existing session
- Currently treats argument as session ID
- Future: support session key lookup

**`aiswitch start <profile> [args...]`**

- Start a new session with optional arguments
- No TUI, direct execution
- Example: `aiswitch start opencode -m fast`

**`aiswitch new`**

- Create a new profile (interactive)
- Alias for `aiswitch create` without arguments

**`aiswitch create <name> [options]`**

- Create a new profile
- Options: `-e <executable>`, `-k <api-key>`, `-d <config-dir>`

**`aiswitch run <profile> [args...]`**

- Run a profile with optional arguments
- Default command (can omit `run`)

**`aiswitch select`**

- Explicit invocation of TUI
- Same as `aiswitch` with no args

**`aiswitch list`**

- List all configured profiles

**`aiswitch which <profile>`**

- Show profile details and resolved paths

**`aiswitch doctor [profile]`**

- Run diagnostics

**`aiswitch init [--force]`**

- Initialize config with auto-detected runtimes

## Data Storage

### Config File

**Location:** `~/.aiswitch/config.yaml` (or `AIUSE_CONFIG` env var)

**Structure:**

```yaml
version: 1
profiles:
  opencode:
    executable: opencode
    description: OpenCode profile
    env:
      OPENCODE_CONFIG_DIR: ~/.config/opencode
```

### Session History

**Location:** `~/.aiswitch/sessions.json` (or `AIUSE_SESSIONS` env var)

**Structure:**

```json
{
  "opencode": [
    {
      "id": "ses_267f917bdffeOW2yp1TMXjhSFl",
      "profile": "opencode",
      "sessionKey": "opencode_XjhS",
      "description": "Implement texture maker",
      "cwd": "/home/user/project",
      "lastUsed": 1776409079562
    }
  ]
}
```

### Last-Used Profile (Per-Directory)

**Location:** `~/.aiswitch/last-used/<cwd-hash>.json` (or `AIUSE_LAST_USED` env var)

**Structure:**

```json
{
  "profile": "opencode",
  "cwd": "/home/user/project",
  "timestamp": 1776409079562
}
```

**Purpose:**

- Track last-used profile per working directory
- Mark profile with "(last used)" in TUI
- Pre-select in profile list

## Environment Variables

| Variable          | Purpose              | Default                     |
| ----------------- | -------------------- | --------------------------- |
| `AIUSE_CONFIG`    | Config file path     | `~/.aiswitch/config.yaml`   |
| `AIUSE_SESSIONS`  | Session history path | `~/.aiswitch/sessions.json` |
| `AIUSE_LAST_USED` | Last-used directory  | `~/.aiswitch/last-used`     |
| `AIUSE_PIDS`      | PID tracking file    | `~/.aiswitch/pids.json`     |

## User Workflows

### Quick Resume

```bash
# See session list, pick one
aiswitch resume myprofile

# Or directly by session key (future)
aiswitch resume opencode_XjhS
```

### Start New Session

```bash
# Via TUI
aiswitch
→ Start a new profile session
→ Select profile
→ Confirm

# Via CLI
aiswitch start opencode
```

### Create Profile

```bash
# Interactive
aiswitch new

# Or
aiswitch create myprofile -e opencode
```

### Session Management

After harness exits:

1. Copy session ID from harness output
2. Paste when prompted
3. Accept/modify session key
4. Optionally add description
5. Session saved for future resume

### Process Management

```bash
# List tracked processes
aiswitch ps

# Kill orphaned processes (parent aiswitch died)
aiswitch cleanup
```

**PID Tracking:**

- All harness processes spawned by aiswitch are tracked in `~/.aiswitch/pids.json`
- Tracking includes: PID, parent PID, command, args, cwd, start time, profile
- Orphaned processes (where parent aiswitch died) can be detected and cleaned up
- PID entries are automatically removed when process exits cleanly
- Dead PIDs are cleaned up on module load

## Design Principles

1. **TUI for discovery, CLI for automation**
   - Interactive menu for exploration
   - Direct commands for scripts/aliases

2. **Per-directory context**
   - Last-used tracked per working directory
   - Respects project boundaries

3. **Session keys for memorability**
   - Short, contextual identifiers
   - Default format includes profile name

4. **Manual session save**
   - User controls what to save
   - No automatic capture (harness TTY limitation)

5. **Profile isolation**
   - Separate config/data per profile
   - No cross-contamination
