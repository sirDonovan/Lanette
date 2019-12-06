const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const builtFolder = path.join(__dirname, "built");
const srcFolder = path.join(__dirname, "src");
const exec = util.promisify(child_process.exec);

let firstBuild = true;

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
		if (!builtFiles[i].endsWith('.js')) {
			if (fs.lstatSync(builtFiles[i]).isDirectory()) {
				if (!srcFiles.includes(path.join(srcFolder, builtFiles[i].substr(builtFolder.length + 1)))) {
					fs.rmdirSync(builtFiles[i]);
				}
			}
			continue;
		}
		const file = builtFiles[i].substr(builtFolder.length + 1);
		if (!srcFiles.includes(path.join(srcFolder, file.substr(0, file.length - 3) + '.ts'))) {
			fs.unlinkSync(builtFiles[i]);
		}
	}
}

async function setToSha(sha) {
	return await exec('git reset --hard ' + sha).catch(e => console.log(e));
}

module.exports = async (resolve, reject) => {
	if (firstBuild) {
		firstBuild = false;
		console.log("Preparing to build files...");
		deleteFolderRecursive(builtFolder);
		console.log("Deleted old built folder");

		let testIndex = -1;
		for (let i = 0; i < process.argv.length; i++) {
			if (process.argv[i] === 'test/setup.js') {
				testIndex = i;
				break;
			}
		}

		const offline = testIndex !== -1 && process.argv[testIndex + 1] === '--offline';
		if (!offline) {
			console.log("Checking pokemon-showdown remote...");
			const pokemonShowdown = path.join(__dirname, 'pokemon-showdown');
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

			const revParseOutput = await exec('git rev-parse master').catch(e => console.log(e));
			if (!revParseOutput || revParseOutput.Error) {
				reject();
				return;
			}

			const currentSha = revParseOutput.stdout.replace("\n", "");

			const cmd = await exec('git pull').catch(e => console.log(e));
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

			if (setToLanetteSha) {
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
			}

			process.chdir(__dirname);
		}
	} else {
		pruneBuiltFiles();
	}

	console.log("Running tsc...");
	const cmd = await exec('npm run tsc').catch(e => console.log(e));
	if (!cmd || cmd.Error) {
		reject();
		return;
	}

	console.log("Successfully built files");
	resolve();
}
