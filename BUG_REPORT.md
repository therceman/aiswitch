# CLI Help Command Bug - No Output

## Summary

Running `aiswitch help` (or `node dist/cli.js help`) produces **no output** and exits with code 0, though the code appears correct.

## Environment

- Node.js: v18.20.8
- npm: 10.8.2
- Platform: macOS (darwin)

## What Works

```bash
# Parsing works correctly
$ node -e "const {parseArgs} = require('./dist/cli.js'); console.log(parseArgs(['node', 'cli.js', 'help']))"
# Output: { command: 'help', args: [], flags: {}, ... }

# Manually calling showHelp works
$ node -e "
  process.argv = ['node', 'cli.js', 'help'];
  require('./dist/cli.js').runCli();
"
# Output: Full help text displays correctly

# Other commands work (when config exists)
$ node dist/cli.js list
# Output: Lists profiles or error about missing config
```

## What Doesn't Work

```bash
$ node dist/cli.js help
# NO OUTPUT, exit code 0

$ ./dist/cli.js help
# NO OUTPUT, exit code 0

$ aiswitch help
# NO OUTPUT, exit code 0
```

## Relevant Code

### 1. Entry Point (src/cli.ts lines 1-7)

```typescript
#!/usr/bin/env node
import { runCommand } from './commands/run';
import { listCommand, listCommandJson } from './commands/list';
import { whichCommand } from './commands/which';
import { doctorCommand } from './commands/doctor';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { selectCommand } from './commands/select';
```

**Issue**: All command modules are imported at module load time (eager loading).

### 2. runCli Function (src/cli.ts lines 158-221)

```typescript
async function runCli() {
  const { command, flags, profile, extraArgs } = parseArgs(process.argv);
  try {
    switch (command) {
      case 'init':
        initCommand(flags.force === true);
        break;
      case 'create':
        if (!profile) {
          console.error('Error: Profile name required');
          console.error('Usage: aiswitch create <name>');
          process.exit(1);
        }
        await createCommand(profile, flags.executable, flags.apiKey, flags.dir);
        break;
      case 'list':
        if (flags.json === true) {
          const profiles = listCommandJson();
          console.log(JSON.stringify(profiles, null, 2));
        } else {
          listCommand();
        }
        break;
      case 'which':
        if (!profile) {
          console.error('Error: Profile name required');
          console.error('Usage: aiswitch which <profile>');
          process.exit(1);
        }
        whichCommand(profile);
        break;
      case 'doctor':
        doctorCommand(profile);
        break;
      case 'run':
        if (!profile) {
          console.error('Error: Profile name required');
          console.error('Usage: aiswitch run <profile>');
          process.exit(1);
        }
        {
          const code = await runCommand(profile, extraArgs);
          process.exit(code);
        }
      case 'help':
        showHelp();
        break;
      case 'select':
      default:
        if (!command || command === 'select') {
          await selectCommand();
        } else {
          showHelp();
        }
        break;
    }
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}
```

**Note**: Missing `break` after `case 'run'` - potential fall-through bug.

### 3. showHelp Function (src/cli.ts lines 143-156)

```typescript
function showHelp() {
  console.log(`
aiswitch - Cross-platform CLI for profile-isolated opencode/codex

Usage:
  aiswitch <command> [options]
  aiswitch <profile> [args...]

Commands:
  init              Initialize config with auto-detected runtimes
  create <name>     Create a new profile
  list              List all profiles
  which <profile>   Show resolved runtime details
  doctor [profile]  Run diagnostics
  run <profile>     Run a profile (default command)
  help              Show this help message

Examples:
  aiswitch init
  aiswitch create myprofile -e opencode
  aiswitch opencode --help
  aiswitch myprofile -m fast
  aiswitch run myprofile --verbose

Create options:
  -e, --executable <name>  Executable name (opencode or codex)
  -k, --api-key <key>      API key
  -d, --dir <path>         Config directory

Init options:
  -f, --force              Overwrite existing config
`);
}
```

### 4. parseArgs Function (src/cli.ts lines 19-94)

```typescript
function parseArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let extraArgs: string[] = [];

  const command = args[0];
  const isKnownCommand = command && KNOWN_COMMANDS.includes(command);
  const takesProfile = command && PROFILE_COMMANDS.includes(command);

  if (!isKnownCommand) {
    // Handle profile-as-command (e.g., "aiswitch myprofile")
    if (!command && args.length === 0) {
      return {
        command: 'select',
        args: [],
        flags: {},
        profile: undefined,
        extraArgs: [],
      };
    }
    // ... extract extra args
    return {
      command: 'run',
      args: extraArgs,
      flags: {},
      profile: command,
      extraArgs,
    };
  }

  // Parse flags and positional args for known commands
  let i = 1;
  let profileFound = false;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--') {
      extraArgs = args.slice(i + 1);
      break;
    }
    // ... flag parsing
  }

  const profile = positional[0];
  const cmdArgs = positional.slice(1);

  return {
    command,
    args: cmdArgs,
    flags,
    profile,
    extraArgs,
  };
}
```

### 5. Exports (src/cli.ts line 223)

```typescript
export { runCli, parseArgs };
```

**Note**: `showHelp` is NOT exported - only used internally.

## Compiled Output (dist/cli.js)

The TypeScript compiles to CommonJS. Key parts:

```javascript
#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.runCli = runCli;
exports.parseArgs = parseArgs;
const run_1 = require('./commands/run');
const list_1 = require('./commands/list');
// ... all commands loaded eagerly

async function runCli() {
  const { command, flags, profile, extraArgs } = parseArgs(process.argv);
  try {
    switch (command) {
      // ... cases
      case 'help':
        showHelp();
        break;
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
```

## Debug Findings

### Test 1: Check process.argv

```bash
$ node -e "console.log(process.argv)"
# ['/opt/homebrew/Cellar/node@18/18.20.8/bin/node']
# (only 1 element when using -e)

$ node dist/cli.js help
# Should be: ['node', 'dist/cli.js', 'help']
```

### Test 2: Intercept process.exit

```bash
$ node -e "
  process.exit = (code) => { throw new Error('Exit: ' + code); };
  require('./dist/cli.js').runCli();
"
# Error: Config file not found: /Users/therceman/.aiswitch/config.yaml
# Then: Exit intercepted: 1
```

The error comes from a command module being loaded, not from the help case.

### Test 3: Module loading

```bash
$ node -e "
  const modules = [
    './dist/commands/run',
    './dist/commands/list',
    './dist/commands/which',
    './dist/commands/doctor',
    './dist/commands/init',
    './dist/commands/create',
    './dist/commands/select'
  ];
  for (const mod of modules) {
    try {
      require(mod);
      console.log('OK:', mod);
    } catch(e) {
      console.log('FAIL:', mod, '-', e.message);
    }
  }
"
# All modules load successfully (OK)
```

### Test 4: Mocked argv works

```bash
$ node -e "
  process.argv = ['node', 'cli.js', 'help'];
  require('./dist/cli.js').runCli();
"
# Full help text displays!
```

## Hypotheses

### H1: Missing `break` in 'run' case causes fall-through

In the switch statement, `case 'run'` has no `break` after `process.exit(code)`. While `process.exit()` should terminate, this might cause issues in some execution contexts.

**Location**: src/cli.ts line 202

### H2: Eager module loading causes side-effects

All command modules are loaded at the top of cli.ts before runCli executes. One of these modules might:

- Execute code on load that interferes
- Throw an error that's caught silently
- Modify process.stdout/stderr

### H3: Async function not awaited

When the module is loaded via shebang, `runCli()` is called at the bottom but nothing awaits it. The process might exit before async operations complete.

**Check**: Does the source file call `runCli()` at module load?

### H4: process.argv timing issue

The `process.argv` might not be fully populated when `runCli()` reads it in certain execution contexts.

## Missing Test Coverage

Current tests (test/cli.test.ts) only test `parseArgs`:

```typescript
import { parseArgs } from '../src/cli';

it('parses help command', () => {
  const result = parseArgs(['node', 'aiswitch', 'help']);
  expect(result.command).toBe('help');
});
```

**Missing**:

- Integration tests for `runCli()` execution
- Tests that capture stdout from commands
- Tests for each command case in the switch

## Suggested Fixes to Try

### Fix 1: Add break after 'run' case

```typescript
case 'run':
  if (!profile) {
    console.error('Error: Profile name required');
    console.error('Usage: aiswitch run <profile>');
    process.exit(1);
  }
  {
    const code = await runCommand(profile, extraArgs);
    process.exit(code);
  }
  break;  // ADD THIS
```

### Fix 2: Lazy-load command modules

Instead of importing at top, import inside each case:

```typescript
case 'help':
  showHelp();
  break;
// No imports needed for help!
```

### Fix 3: Ensure runCli is properly invoked

Check that the source file actually calls `runCli()`:

```typescript
// At bottom of src/cli.ts:
runCli(); // Is this present?
```

### Fix 4: Add debug logging

```typescript
async function runCli() {
  console.error('DEBUG: runCli called');
  console.error('DEBUG: argv =', process.argv);
  const { command } = parseArgs(process.argv);
  console.error('DEBUG: command =', command);
  // ... rest
}
```

## Questions for Debugging

1. Does src/cli.ts have `runCli()` call at the bottom?
2. What is the exact compiled output in dist/cli.js (full file)?
3. Does adding `console.error()` at start of runCli show output?
4. Does the 'help' case get reached (add console.error before showHelp)?
5. Is there something in select.ts that runs on module load?

## Files to Examine

1. `src/cli.ts` - Main CLI logic
2. `src/commands/select.ts` - Default command, might have side-effects
3. `src/config/load.ts` - Config loading, throws errors
4. `dist/cli.js` - Compiled output
5. `test/cli.test.ts` - Existing tests
