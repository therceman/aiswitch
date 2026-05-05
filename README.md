# airelay

Cross-platform CLI for launching profile-isolated OpenCode/Codex instances with separate config and data directories.

## Tech Stack

Runtime dependencies:

| Package     | Version | Purpose                         |
| ----------- | ------- | ------------------------------- |
| TypeScript  | 5.9.3   | Type-safe JavaScript superset   |
| zod         | 4.3.6   | Runtime schema validation       |
| yaml        | 2.8.3   | YAML parsing for config files   |
| cross-spawn | 7.0.6   | Cross-platform process spawning |

Dev dependencies:

| Package  | Version | Purpose           |
| -------- | ------- | ----------------- |
| eslint   | 10.2.0  | Code linting      |
| prettier | 3.8.3   | Code formatting   |
| jest     | 30.3.0  | Testing framework |

## Install

## Install

```bash
npm install -g airelay
```

Or from source:

```bash
npm install
npm run build
npm link
```

## Quick Start

```bash
airelay init
```

This creates `~/.airelay/config.yaml` with example profiles.

## Config Location

- Default: `~/.airelay/config.yaml`
- Override: `AIRELAY_CONFIG=/path/to/config.yaml`

## Config Format

```yaml
version: 1

profiles:
  opencode-work:
    executable: opencode
    cwd: ~/git/work
    description: Work profile
    env:
      OPENCODE_CONFIG_DIR: ~/.config/opencode-work
      XDG_CONFIG_HOME: ~/.airelay/opencode-work/config
      XDG_DATA_HOME: ~/.airelay/opencode-work/data

  codex-personal:
    executable: codex
    cwd: ~/git/personal
    args:
      - --sandbox
      - workspace-write
    description: Personal profile
    env:
      CODEX_HOME: ~/.codex-personal
```

## Commands

```bash
airelay <profile>              # Run profile (alias of run)
airelay run <profile> [-- ...args]
airelay list                   # List all profiles
airelay which <profile>        # Show resolved runtime details
airelay doctor [profile]       # Run diagnostics
airelay init                  # Create starter config
```

## Examples

```bash
airelay opencode-work
airelay opencode-work --help
airelay opencode-work -m fast
airelay opencode-work -s ses_273323d6cffeRj1UNM002zx3wJ  # Resume opencode session
airelay codex-personal --sandbox workspace-write
airelay codex-work resume 029d71b4-5ef8-73b1-af8a-93c2e6812630  # Resume codex session
airelay which opencode-work
airelay doctor
```

Note: Arguments after the profile name are passed directly to the child process. No need for `--` separator unless you want to be explicit.

## How It Works

1. Load config from `~/.airelay/config.yaml`
2. Resolve paths (expand `~` to home directory)
3. Merge profile env with parent environment
4. Spawn executable with inherited stdio
5. Pass through exit code

## Platform Support

- Windows
- macOS
- Linux

Uses `cross-spawn` for cross-platform executable resolution.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format

# Check all before commit
npm run lint && npm run format:check && npm test && npm audit
```

## License

MIT
