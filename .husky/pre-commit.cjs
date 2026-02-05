const { execSync } = require('child_process');

function run(cmd, label) {
  console.log(`\n=== ${label} ===`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`\nError: ${label} failed. Please fix the issues above.`);
    process.exit(1);
  }
}

console.log('=== PRE-COMMIT HOOK IS RUNNING ===');

// Run knip to check for unused dependencies, files, and exports
run('node node_modules/knip/dist/cli.js --no-config-hints', 'Knip: unused dependencies/files/exports');

// Run the build to ensure it compiles successfully
run('npm run build', 'TypeScript build');

// Run tests silently
run('npm test -- --silent', 'Tests');

console.log('\n=== All checks passed ===');
