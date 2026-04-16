# aiswitch

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
npm install -g aiswitch
```

Or from source:

```bash
npm install
npm run build
npm link
```

## Quick Start

```bash
aiswitch init
```

This creates `~/.aiswitch/config.yaml` with example profiles.

## Config Location

- Default: `~/.aiswitch/config.yaml`
- Override: `AIUSE_CONFIG=/path/to/config.yaml`

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
      XDG_CONFIG_HOME: ~/.aiswitch/opencode-work/config
      XDG_DATA_HOME: ~/.aiswitch/opencode-work/data

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
aiswitch <profile>              # Run profile (alias of run)
aiswitch run <profile> [-- ...args]
aiswitch list                   # List all profiles
aiswitch which <profile>        # Show resolved runtime details
aiswitch doctor [profile]       # Run diagnostics
aiswitch init                  # Create starter config
```

## Examples

```bash
aiswitch opencode-work
aiswitch opencode-work --help
aiswitch opencode-work -m fast
aiswitch opencode-work -s ses_273323d6cffeRj1UNM002zx3wJ  # Resume opencode session
aiswitch codex-personal --sandbox workspace-write
aiswitch codex-work resume 029d71b4-5ef8-73b1-af8a-93c2e6812630  # Resume codex session
aiswitch which opencode-work
aiswitch doctor
```

Note: Arguments after the profile name are passed directly to the child process. No need for `--` separator unless you want to be explicit.

## How It Works

1. Load config from `~/.aiswitch/config.yaml`
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
