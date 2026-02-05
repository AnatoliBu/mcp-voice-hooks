/**
 * Setup git hooks for Windows compatibility
 *
 * Problem: MSYS bash (Git Bash on Windows) has issues with multi-line shell scripts
 * when they have a shebang line. The second line and beyond are not executed.
 *
 * Solution: Replace the standard husky hook wrapper with a Node.js script
 * that directly requires our hook logic.
 */

const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, '..', '.husky', '_', 'pre-commit');

// Node.js hook that bypasses sh issues on Windows
const nodeHook = `#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("../pre-commit.cjs");
`;

try {
  fs.writeFileSync(hookPath, nodeHook);
  fs.chmodSync(hookPath, 0o755);
  console.log('✓ Git hooks configured for Windows compatibility');
} catch (err) {
  // Non-fatal: hooks might not work on Windows but will work on Unix
  console.warn('⚠ Could not configure hooks:', err.message);
}
