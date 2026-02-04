#!/usr/bin/env node
// PreToolUse: Git Paranoia Mode — backup commit before Claude edits
const { execSync } = require('child_process');

try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd() }).trim();
    if (status) {
        execSync('git add -A && git commit -m "auto-backup before Claude edit"', {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd()
        });
        process.stderr.write('[git-paranoia] Created backup commit\n');
    }
} catch (e) {
    // Ignore errors (nothing to commit, hook failures should not block)
}

process.exit(0);
