const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const exec = util.promisify(child_process.exec);
const PokemonShowdown = path.join(__dirname, 'Pokemon-Showdown');

async function revert(sha) {
	console.log("Reverting Pokemon-Showdown to previous commit...");
	process.chdir(PokemonShowdown);
	await exec('git reset --hard ' + sha);
}

(async () => {
	if (!fs.existsSync(PokemonShowdown)) {
		console.log("Pokemon-Showdown will be cloned on the first run of Lanette.");
		return;
	}

	console.log("Attempting to update Pokemon-Showdown files...");
	process.chdir(PokemonShowdown);
	const currentRevParse = await exec('git rev-parse master', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!currentRevParse || currentRevParse.Error) {
		console.log("Error: could not retrieve current commit");
		return;
	}
	const currentSHA = currentRevParse.stdout.replace("\n", "");
	const pull = await exec('git pull');
	if (!pull || pull.Error) {
		console.log("Error: could not pull origin");
		return;
	}
	if (pull.stdout.replace("\n", "") === 'Already up to date.') {
		console.log('Pokemon-Showdown is already up to date.');
		return;
	}
	const newRevParse = await exec('git rev-parse master', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!newRevParse || newRevParse.Error) {
		console.log("Error: could not retrieve newest commit");
		await revert(currentSHA);
		return;
	}

	// write before tests so build.js doesn't reset to the current commit
	fs.writeFileSync(path.join(__dirname, "pokemon-showdown-lkg.txt"), newRevParse.stdout.replace("\n", ""));

	console.log("Running tests to verify compatibility with Lanette...");
	process.chdir(__dirname);
	const npmTest = await exec('npm test', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!npmTest || npmTest.Error) {
		await revert(currentSHA);
		fs.writeFileSync(path.join(__dirname, "pokemon-showdown-lkg.txt"), currentSHA);
		return;
	}

	console.log("Successfully updated.");
})();
