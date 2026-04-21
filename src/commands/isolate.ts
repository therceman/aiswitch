import { setupIsolatedHarnessHome, getHarnessIsolationConfig } from '../utils/harness-isolate';
import { loadConfig } from '../config/load';

export function isolateCommand(profileName?: string): void {
  const config = loadConfig();

  if (!profileName) {
    // Show all codex profiles that can be isolated
    const codexProfiles = Object.entries(config.profiles)
      .filter(([, p]) => (p as { executable: string }).executable === 'codex')
      .map(([name]) => name);

    if (codexProfiles.length === 0) {
      console.log('No Codex profiles found.');
      return;
    }

    console.log('Codex profiles (run with profile name to isolate):');
    for (const name of codexProfiles) {
      const profile = config.profiles[name] as { env?: { CODEX_HOME?: string } };
      const codexHome = profile.env?.CODEX_HOME;
      const isIsolated = codexHome && codexHome.includes('.aiswitch/codex-');
      console.log(`  ${name}${isIsolated ? ' ✓ (already isolated)' : ' (shared)'}`);
    }
    return;
  }

  const profile = config.profiles[profileName] as {
    executable: string;
    env?: { CODEX_HOME?: string };
  };
  if (!profile || profile.executable !== 'codex') {
    console.error(`Profile '${profileName}' not found or is not a Codex profile.`);
    return;
  }

  // Set up isolation using universal harness isolation
  const codexHome = setupIsolatedHarnessHome('codex', profileName);

  console.log(`✓ Isolated Codex profile '${profileName}'`);
  console.log(`  Location: ${codexHome}`);

  const isolationConfig = getHarnessIsolationConfig('codex');
  if (isolationConfig) {
    console.log(`  Isolated: ${isolationConfig.isolatedItems.join(', ')}`);
    console.log(`  Shared: ${isolationConfig.sharedItems.slice(0, 5).join(', ')}...`);
  }
  console.log('\nUpdate your config to use:');
  console.log(`  env:`);
  console.log(`    CODEX_HOME: ${codexHome}`);
}
