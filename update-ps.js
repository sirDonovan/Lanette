const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const exec = util.promisify(child_process.exec);
const pokemonShowdown = path.join(__dirname, 'pokemon-showdown');

async function revert(sha) {
	console.log("Reverting pokemon-showdown to previous version...");
	process.chdir(pokemonShowdown);
	await exec('git reset --hard ' + sha);
}

(async () => {
	if (!fs.existsSync(pokemonShowdown)) {
		console.log("pokemon-showdown will be cloned on the first run of Lanette.");
		return;
	}

	let updatePsIndex = -1;
	for (let i = 0; i < process.argv.length; i++) {
		if (process.argv[i].endsWith('update-ps.js')) {
			updatePsIndex = i;
			break;
		}
	}

	const hotpatch = updatePsIndex !== -1 && process.argv[updatePsIndex + 1] === '--hotpatch';

	console.log("Attempting to update pokemon-showdown to latest version...");
	process.chdir(pokemonShowdown);
	const currentRevParse = await exec('git rev-parse master').catch(e => console.log(e));
	if (!currentRevParse || currentRevParse.Error) {
		console.log("Error: could not retrieve current commit");
		return;
	}
	const currentSha = currentRevParse.stdout.replace("\n", "");
	const pull = await exec('git pull');
	if (!pull || pull.Error) {
		console.log("Error: could not pull origin");
		return;
	}
	if (pull.stdout.replace("\n", "") === 'Already up to date.') {
		console.log('pokemon-showdown is already up to date.');
		return;
	}

	console.log("Running tests to check compatibility with Lanette...");
	process.chdir(__dirname);
	const npmTest = await exec('npm test').catch(e => console.log(e));
	if (!npmTest || npmTest.Error) {
		if (hotpatch) await revert(currentSha);
		return;
	}

	if (!hotpatch) {
		process.chdir(pokemonShowdown);
		const newRevParse = await exec('git rev-parse master').catch(e => console.log(e));
		if (newRevParse && !newRevParse.Error) {
			const newSha = newRevParse.stdout.replace("\n", "");
			fs.writeFileSync(path.join(__dirname, "pokemon-showdown-sha.txt"), newSha);
		}
		process.chdir(__dirname);
	}

	console.log("Successfully updated pokemon-showdown");
})();
