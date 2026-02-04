const DEBUG = process.argv.includes('--debug') || process.argv.includes('-d');

export function debugLog(...args: any[]): void {
    if (DEBUG) {
        console.log(...args);
    }
}

export function unusedExportForTesting(): string {
    return 'this should be caught by knip or ts-prune';
}
