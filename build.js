const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const builtFolder = path.join(__dirname, "built");

module.exports = async (resolve, reject) => {
	// Modified from https://stackoverflow.com/a/32197381
	function deleteFolderRecursive(folder) {
		folder = folder.trim();
		if (!folder || folder === '/' || folder === '.') return;
		let exists = false;
		try {
			fs.accessSync(folder);
			exists = true;
		} catch (e) {}
		if (exists) {
			let contents = fs.readdirSync(folder);
			for (let i = 0; i < contents.length; i++) {
				let curPath = path.join(folder, contents[i]);
				if (fs.lstatSync(curPath).isDirectory()) {
					deleteFolderRecursive(curPath);
				} else {
					fs.unlinkSync(curPath);
				}
			}

			if (folder !== builtFolder) fs.rmdirSync(folder);
		}
	};

	deleteFolderRecursive(builtFolder);

	(async () => {
		const exec = util.promisify(child_process.exec);
		const PokemonShowdown = path.join(__dirname, 'Pokemon-Showdown');
		if (!fs.existsSync(PokemonShowdown)) {
			console.log("Setting up Pokemon-Showdown folder...");
			await exec('git clone https://github.com/Zarel/Pokemon-Showdown.git');
		} else {
			process.chdir(PokemonShowdown);
			const revParse = await exec('git rev-parse master', {stdio: 'inherit'}).catch(e => console.log(e));
			if (revParse && !revParse.Error) {
				const sha = revParse.stdout.replace("\n", "");
				const lkg = fs.readFileSync(path.join(__dirname, "pokemon-showdown-lkg.txt")).toString();
				if (sha !== lkg) {
					console.log("Updating Pokemon-Showdown files...");
					await exec('git reset --hard ' + lkg);
				}
			}
			process.chdir(__dirname);
		}

		console.log("Running tsc...");
		const build = await exec('npm run tsc', {stdio: 'inherit'}).catch(e => console.log(e));
		if (!build || build.Error) {
			reject();
			return;
		}
	
		console.log("Successfully built files");
		resolve();
	})();
}
