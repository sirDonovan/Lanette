const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

if (!fs.existsSync('Pokemon-Showdown')) {
	console.log("Setting up Pokemon-Showdown folder...");
	child_process.execSync('git clone https://github.com/Zarel/Pokemon-Showdown.git');
} else {
	console.log("Updating Pokemon-Showdown files...");
	process.chdir(path.join(__dirname, 'Pokemon-Showdown'));
	child_process.execSync('git pull');
	process.chdir(__dirname);
}

if (!fs.existsSync('src/config.ts')) {
	console.log("Creating a default config.ts in the src folder (you need to edit this)...");
	fs.writeFileSync('./src/config.ts', fs.readFileSync('./src/config-example.ts'));
}

const builtFolder = path.join(__dirname, 'built');

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
	console.log("Running tsc...");
	const exec = util.promisify(child_process.exec);
	const build = await exec('npm run tsc', {stdio: 'inherit'}).catch(e => console.log(e));
	if (!build || build.Error) {
		process.exit(1);
	}

	require(path.join(builtFolder, 'app.js'));
})();
