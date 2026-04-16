import { runCommand } from './commands/run';
import { listCommand, listCommandJson } from './commands/list';
import { whichCommand } from './commands/which';
import { doctorCommand } from './commands/doctor';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { selectCommand } from './commands/select';

interface ParseResult {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  profile?: string;
  extraArgs: string[];
}

const KNOWN_COMMANDS = ['init', 'create', 'list', 'which', 'doctor', 'run', 'help', 'select'];
const PROFILE_COMMANDS = ['run', 'which', 'doctor'];

function parseArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let extraArgs: string[] = [];

  const command = args[0];
  const isKnownCommand = command && KNOWN_COMMANDS.includes(command);
  const takesProfile = command && PROFILE_COMMANDS.includes(command);

  if (!isKnownCommand) {
    if (!command && args.length === 0) {
      return {
        command: 'select',
        args: [],
        flags: {},
        profile: undefined,
        extraArgs: [],
      };
    }

    const dashIndex = args.indexOf('--');
    if (dashIndex !== -1) {
      extraArgs = args.slice(dashIndex + 1);
    } else {
      extraArgs = args.slice(1);
    }

    return {
      command: 'run',
      args: extraArgs,
      flags: {},
      profile: command,
      extraArgs,
    };
  }

  let i = 1;
  let profileFound = false;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--') {
      extraArgs = args.slice(i + 1);
      break;
    }

    if (profileFound) {
      extraArgs.push(arg);
      i++;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      positional.push(arg);
      if (takesProfile && positional.length === 1) {
        profileFound = true;
      }
      i++;
    }
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

function showHelp(): void {
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

async function runCli(): Promise<void> {
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
        await createCommand(
          profile,
          flags.executable as string | undefined,
          flags.apiKey as string | undefined,
          flags.dir as string | undefined
        );
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

export { runCli, parseArgs };
