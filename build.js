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

module.exports = async (resolve, reject) => {
	if (firstBuild) {
		firstBuild = false;
		console.log("Deleting built folder...");
		deleteFolderRecursive(builtFolder);

		const PokemonShowdown = path.join(__dirname, 'Pokemon-Showdown');
		if (!fs.existsSync(PokemonShowdown)) {
			console.log("Setting up Pokemon-Showdown folder...");
			await exec('git clone https://github.com/Zarel/Pokemon-Showdown.git');
		}
		process.chdir(PokemonShowdown);
		const revParse = await exec('git rev-parse master', {stdio: 'inherit'}).catch(e => console.log(e));
		if (revParse && !revParse.Error) {
			const sha = revParse.stdout.replace("\n", "");
			const lkg = fs.readFileSync(path.join(__dirname, "pokemon-showdown-lkg.txt")).toString();
			if (sha !== lkg) {
				console.log("Setting Pokemon-Showdown to LKG...");
				await exec('git pull');
				await exec('git reset --hard ' + lkg);
			}
		}

		process.chdir(__dirname);
	} else {
		pruneBuiltFiles();
	}

	console.log("Running tsc...");
	const build = await exec('npm run tsc', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!build || build.Error) {
		reject();
		return;
	}

	console.log("Successfully built files");
	resolve();
}
