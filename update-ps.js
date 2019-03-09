const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

(async () => {
	const exec = util.promisify(child_process.exec);
	const PokemonShowdown = path.join(__dirname, 'Pokemon-Showdown');
	if (!fs.existsSync(PokemonShowdown)) {
		console.log("Pokemon-Showdown will be cloned on the first run of Lanette.");
		return;
	}
	console.log("Updating Pokemon-Showdown files...");
	process.chdir(PokemonShowdown);
	const revParse = await exec('git rev-parse master', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!revParse || revParse.Error) {
		console.log("Error: could not retrieve SHA");
		return;
	}
	const sha = revParse.stdout.replace("\n", "");
	await exec('git pull');
	console.log("Running tests to verify compatibility with Lanette...");
	process.chdir(__dirname);
	const npmTest = await exec('npm test', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!npmTest || npmTest.Error) {
		console.log("Reverting Pokemon-Showdown to " + sha + "...");
		process.chdir(PokemonShowdown);
		await exec('git reset --hard ' + sha);
		return;
	}
	console.log("Writing new Pokemon-Showdown LKG...");
	fs.writeFileSync(path.join(__dirname, "pokemon-showdown-lkg.txt"), sha);
})();
