const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const launcherPath = path.join(distDir, 'airelay.cjs');
const launcher = "#!/usr/bin/env node\nrequire('./index.js');\n";

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(launcherPath, launcher, 'utf-8');
fs.chmodSync(launcherPath, 0o755);
