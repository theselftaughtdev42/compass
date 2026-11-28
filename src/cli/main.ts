/** Entry point for `npm run lint:notes` and `npm run lint:note`. */
import { runLintCli } from './lint-cli';
import { openNodeVault } from './node-vault';

const [command, ...args] = process.argv.slice(2);
if (command !== 'notes' && command !== 'note') {
	console.error('Unknown lint command. Use lint:notes or lint:note.');
	process.exit(2);
}

// npm runs scripts from the package folder; resolve paths from where the user ran it.
const cwd = process.env.INIT_CWD ?? process.cwd();
const result = runLintCli(command, args, (vault) => openNodeVault(vault, cwd));
for (const line of result.stdout) console.log(line);
for (const line of result.stderr) console.error(line);
process.exit(result.exitCode);
