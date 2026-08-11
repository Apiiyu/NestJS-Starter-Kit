import { exec } from 'child_process';
import chalk from 'chalk';

// Function to run a command and return a promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ stdout, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
}

async function runLintCheck() {
  try {
    console.log(chalk.blue('Checking import groups...'));

    // Import grouping is enforced here rather than by ESLint: the convention sorts groups
    // by their comment label, a key no ESLint rule can see. See scripts/sort-imports.ts.
    await runCommand('bun scripts/sort-imports.ts --check');
    console.log(chalk.green('Import groups are sorted!'));

    console.log(chalk.blue('Checking code conventions...'));

    // JSDoc @description, member ordering, and constant/type placement. Enforced here rather
    // than by an ESLint plugin — see the header of scripts/check-conventions.ts.
    await runCommand('bun scripts/check-conventions.ts');
    console.log(chalk.green('Code conventions hold!'));

    console.log(chalk.blue('Running ESLint...'));

    // Run ESLint
    await runCommand('bunx eslint ./src');
    console.log(chalk.green('ESLint passed successfully!'));
  } catch ({ stdout, stderr }) {
    console.error(
      chalk.red('ESLint failed. Please fix the following issues:\n'),
    );
    if (stderr) {
      console.error(chalk.red(stderr));
    }
    if (stdout) {
      console.error(chalk.red(stdout));
    }
    console.info(
      chalk.yellow(
        'If you believe this is a mistake, you can run command bun run lint:fix to automatically fix some issues:\n',
      ),
    );
    process.exit(1);
  }
}

// Execute the lint check
runLintCheck();
