#!/usr/bin/env node
// PostToolUse: TypeScript type check after editing .ts files
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

    // Only check TypeScript files in src/
    if (filePath && /\.tsx?$/.test(filePath) && filePath.includes('src')) {
        const result = execSync('npx tsc --noEmit 2>&1', {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd()
        });
    }
} catch (e) {
    // Show type errors to Claude via stderr (non-blocking, exit 0)
    const output = e.stdout || e.stderr || e.message;
    if (output) {
        process.stderr.write('[typecheck] ' + output.slice(0, 2000) + '\n');
    }
}

process.exit(0);
