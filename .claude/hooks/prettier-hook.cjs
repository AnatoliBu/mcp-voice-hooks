#!/usr/bin/env node
// PostToolUse: Auto-format edited files with Prettier
const { execSync } = require('child_process');
const fs = require('fs');

let input = '';
try {
    input = fs.readFileSync(0, 'utf8');
} catch (e) {
    process.exit(0);
}

try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    if (filePath && /\.(ts|tsx|js|jsx|html|json|css)$/.test(filePath)) {
        // Check file exists (Write may have created it)
        if (fs.existsSync(filePath)) {
            execSync(`npx prettier --write "${filePath}"`, {
                encoding: 'utf8',
                stdio: 'pipe',
                cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd()
            });
        }
    }
} catch (e) {
    // Ignore errors — formatting failure should not block
}

process.exit(0);
