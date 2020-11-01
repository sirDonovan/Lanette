const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const builtFolder = path.join(__dirname, "built");
const srcFolder = path.join(__dirname, "src");
const pokemonShowdown = path.join(__dirname, 'pokemon-showdown');

const removeFromBuild = ["require('better-sqlite3')"];
const removeFromPackageJson = ["@types/better-sqlite3", "better-sqlite3", "husky"];

const exec = util.promisify(child_process.exec);

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
		const contents = fs.readdirSync(folder);
		for (let i = 0; i < contents.length; i++) {
			const curPath = path.join(folder, contents[i]);
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		}

		if (folder !== builtFolder) fs.rmdirSync(folder);
	}
}

function listFilesRecursive(folder) {
	folder = folder.trim();
	if (!folder || folder === '/' || folder === '.') return [];
	let fileList = [];
	let exists = false;
	try {
		fs.accessSync(folder);
		exists = true;
	} catch (e) {}
	if (exists) {
		const contents = fs.readdirSync(folder);
		for (let i = 0; i < contents.length; i++) {
			const curPath = path.join(folder, contents[i]);
			if (fs.lstatSync(curPath).isDirectory()) {
				fileList = fileList.concat(listFilesRecursive(curPath));
			}
			fileList.push(curPath);
		}
	}
	return fileList;
}

function pruneBuiltFiles() {
	const builtFiles = listFilesRecursive(builtFolder);
	const srcFiles = listFilesRecursive(srcFolder);
	for (let i = 0; i < builtFiles.length; i++) {
		if (!builtFiles[i].endsWith('.js') && !builtFiles[i].endsWith('.js.map')) {
			if (fs.lstatSync(builtFiles[i]).isDirectory()) {
				if (!srcFiles.includes(path.join(srcFolder, builtFiles[i].substr(builtFolder.length + 1)))) {
					fs.rmdirSync(builtFiles[i]);
				}
			}
			continue;
		}

		const filepath = builtFiles[i].substr(builtFolder.length + 1);
		let filename;
		if (filepath.endsWith('.js.map')) {
			filename = filepath.substr(0, filepath.length - 7);
		} else {
			filename = filepath.substr(0, filepath.length - 3);
		}

		if (!srcFiles.includes(path.join(srcFolder, filename + '.ts'))) {
			fs.unlinkSync(builtFiles[i]);
		}
	}
}

function rewritePokemonShowdownPackageJson() {
	const packageJsonPath = path.join(pokemonShowdown, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString().split("\n").join(""));

	for (const dependency in packageJson.dependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.dependencies[dependency];
	}
	for (const dependency in packageJson.devDependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.devDependencies[dependency];
	}

	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));
}

function rewritePokemonShowdownBuild() {
	const buildFilePath = path.join(pokemonShowdown, "build");
	const buildFile = fs.readFileSync(buildFilePath).toString().split("\n");

	const newBuildFile = [];
	for (const line of buildFile) {
		let remove = false;
		for (const lineToRemove of removeFromBuild) {
			if (line.includes(lineToRemove)) {
				remove = true;
				break;
			}
		}

		if (remove) continue;
		newBuildFile.push(line);
	}

	fs.writeFileSync(buildFilePath, newBuildFile.join("\n"));
}

async function setToSha(sha) {
	return await exec('git reset --hard ' + sha).catch(e => console.log(e));
}

module.exports = async (resolve, reject, options) => {
	if (options === undefined) options = require('./get-options.js')();

	if (!options.noBuild) {
		console.log("Preparing to build files...");
		if (options.incrementalBuild) {
			pruneBuiltFiles();
			console.log("Pruned built folder")
		} else {
			deleteFolderRecursive(builtFolder);
			console.log("Deleted old built folder");
		}
	}

	if (!options.offline) {
		console.log("Checking pokemon-showdown remote...");
		const remoteDirectories = [path.join(__dirname, 'Pokemon-Showdown'), pokemonShowdown];
		const lanetteRemote = fs.readFileSync(path.join(__dirname, "pokemon-showdown-remote.txt")).toString();
		let needsClone = true;
		for (let i = 0; i < remoteDirectories.length; i++) {
			if (!fs.existsSync(remoteDirectories[i])) continue;
			process.chdir(remoteDirectories[i]);

			const remoteOutput = await exec('git remote -v').catch(e => console.log(e));
			if (!remoteOutput || remoteOutput.Error) {
				reject();
				return;
			}

			let currentRemote;
			const remotes = remoteOutput.stdout.split("\n");
			for (let i = 0; i < remotes.length; i++) {
				const remote = remotes[i].replace("\t", " ");
				if (remote.startsWith('origin ') && remote.endsWith(' (fetch)')) {
					currentRemote = remote.split('origin ')[1].split(' (fetch)')[0].trim();
					break;
				}
			}
			process.chdir(__dirname);

			if (currentRemote === lanetteRemote) {
				needsClone = false;
			} else {
				for (let i = 0; i < remoteDirectories.length; i++) {
					deleteFolderRecursive(remoteDirectories[i]);
				}
				console.log("Deleted old remote " + currentRemote);
			}
		}

		if (needsClone) {
			console.log("Cloning " + lanetteRemote + "...");
			const cmd = await exec('git clone ' + lanetteRemote).catch(e => console.log(e));
			if (!cmd || cmd.Error) {
				reject();
				return;
			}

			console.log("Cloned into pokemon-showdown");
		}

		console.log("Checking pokemon-showdown version...");
		process.chdir(pokemonShowdown);

		// revert build and package.json changes
		let cmd = await exec('git reset --hard').catch(e => console.log(e));
		if (!cmd || cmd.Error) {
			reject();
			return;
		}

		const revParseOutput = await exec('git rev-parse master').catch(e => console.log(e));
		if (!revParseOutput || revParseOutput.Error) {
			reject();
			return;
		}

		const currentSha = revParseOutput.stdout.replace("\n", "");

		cmd = await exec('git pull').catch(e => console.log(e));
		if (!cmd || cmd.Error) {
			await setToSha(currentSha);
			reject();
			return;
		}

		const lanetteSha = fs.readFileSync(path.join(__dirname, "pokemon-showdown-sha.txt")).toString();
		let setToLanetteSha = false;
		if (needsClone) {
			setToLanetteSha = true;
		} else {
			const gitShowCurrentOutput = await exec('git show -s --format=%ct ' + currentSha).catch(e => console.log(e));
			if (!gitShowCurrentOutput || gitShowCurrentOutput.Error) {
				await setToSha(currentSha);
				reject();
				return;
			}

			const gitShowLanetteOutput = await exec('git show -s --format=%ct ' + lanetteSha).catch(e => console.log(e));
			if (!gitShowLanetteOutput || gitShowLanetteOutput.Error) {
				await setToSha(currentSha);
				reject();
				return;
			}

			const currentTimestamp = parseInt(gitShowCurrentOutput.stdout.replace("\n", ""));
			const lanetteTimestamp = parseInt(gitShowLanetteOutput.stdout.replace("\n", ""));
			if (!isNaN(currentTimestamp) && !isNaN(lanetteTimestamp) && lanetteTimestamp > currentTimestamp) {
				setToLanetteSha = true;
			}
		}

		const pokemonShowdownDist = [path.join(pokemonShowdown, ".config-dist"), path.join(pokemonShowdown, ".data-dist"),
			path.join(pokemonShowdown, ".lib-dist"), path.join(pokemonShowdown, ".server-dist"), path.join(pokemonShowdown, ".sim-dist"),
			path.join(pokemonShowdown, ".translations-dist")];
		let buildPokemonShowdown = false;
		if (setToLanetteSha) {
			buildPokemonShowdown = true;
			const cmd = await setToSha(lanetteSha);
			if (!cmd || cmd.Error) {
				await setToSha(currentSha);
				reject();
				return;
			}

			console.log("Updated pokemon-showdown to latest compatible version");
		} else {
			const cmd = await setToSha(currentSha);
			if (!cmd || cmd.Error) {
				reject();
				return;
			}

			for (const dist of pokemonShowdownDist) {
				if (!fs.existsSync(dist)) {
					buildPokemonShowdown = true;
					break;
				}
			}
		}

		if (buildPokemonShowdown) {
			console.log("Installing pokemon-showdown dependencies...");
			rewritePokemonShowdownPackageJson();
			const npmInstallOutput = await exec('npm install').catch(e => console.log(e));
			if (!npmInstallOutput || npmInstallOutput.Error) {
				await setToSha(currentSha);
				reject();
				return;
			}

			for (const dist of pokemonShowdownDist) {
				deleteFolderRecursive(dist);
			}

			console.log("Running pokemon-showdown build script...");
			rewritePokemonShowdownBuild();
			const nodeBuildOutput = await exec('node build --force').catch(e => console.log(e));
			if (!nodeBuildOutput || nodeBuildOutput.Error) {
				await setToSha(currentSha);
				reject();
				return;
			}
		}

		process.chdir(__dirname);
	}

	if (!options.noBuild) {
		console.log("Running tsc...");
		const cmd = await exec('npm run tsc').catch(e => console.log(e));
		if (!cmd || cmd.Error) {
			reject();
			return;
		}

		console.log("Successfully built files");
	}

	resolve();
}
