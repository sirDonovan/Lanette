const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const buildTools = require(path.join(__dirname, 'build-tools'));

const pokemonShowdown = path.join(__dirname, 'pokemon-showdown');

const removeFromPackageJson = [
	// dependencies
	"@types/pg", "@swc/core", "preact", "preact-render-to-string", "probe-image-size", "sockjs", "ts-node",
	// optionalDependencies
	"better-sqlite3", "brain.js", "cloud-env", "githubhook", "node-static", "nodemailer", "permessage-deflate", "pg",
		"sql-template-strings", "sqlite", "sucrase",
	// secretDependencies
	"node-oom-heapdump",
	// devDependencies
	"@types/better-sqlite3", "@types/cloud-env", "@types/node", "@types/node-static", "@types/nodemailer", "@types/pg", "@types/sockjs", 
		"@typescript-eslint/eslint-plugin", "@typescript-eslint/parser", "eslint", "eslint-plugin-import", "husky", "mocha", "smogon",
		"typescript"
];

const exec = util.promisify(child_process.exec);

function rewritePokemonShowdownPackageJson() {
	const packageJsonPath = path.join(pokemonShowdown, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString().split("\n").join(""));

	for (const dependency in packageJson.dependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.dependencies[dependency];
	}
	for (const dependency in packageJson.devDependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.devDependencies[dependency];
	}
	for (const dependency in packageJson.optionalDependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.optionalDependencies[dependency];
	}
	for (const dependency in packageJson.secretDependencies) {
		if (removeFromPackageJson.includes(dependency)) delete packageJson.secretDependencies[dependency];
	}

	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));
}

async function setToSha(sha) {
	return await exec('git reset --hard ' + sha).catch(e => console.log(e));
}

module.exports = async (options) => {
	if (options === undefined) options = require('./get-options.js')();

	if (!options.noBuild) {
		console.log("Preparing to build files...");
		if (!options.incrementalBuild) {
			buildTools.deleteFolderRecursive(buildTools.buildFolder);
			console.log("Deleted old build folder");
		}
	}

	if (!options.offline && !options.noRemote) {
		console.log("Checking pokemon-showdown remote...");
		const remoteDirectories = [path.join(__dirname, 'Pokemon-Showdown'), pokemonShowdown];
		const lanetteRemote = fs.readFileSync(path.join(__dirname, "pokemon-showdown-remote.txt")).toString().trim();
		let needsClone = true;
		for (let i = 0; i < remoteDirectories.length; i++) {
			if (!fs.existsSync(remoteDirectories[i])) continue;
			process.chdir(remoteDirectories[i]);

			const remoteOutput = await exec('git remote -v').catch(e => console.log(e));
			if (!remoteOutput || remoteOutput.Error) {
				throw new Error("git remote error");
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
					buildTools.deleteFolderRecursive(remoteDirectories[i]);
				}
				console.log("Deleted old remote " + currentRemote);
			}
		}

		if (needsClone) {
			console.log("Cloning " + lanetteRemote + "...");
			const cmd = await exec('git clone ' + lanetteRemote).catch(e => console.log(e));
			if (!cmd || cmd.Error) {
				throw new Error("git clone error");
			}

			console.log("Cloned into pokemon-showdown");
		}
	}

	const lanetteSha = fs.readFileSync(path.join(__dirname, "pokemon-showdown-sha.txt")).toString().trim();
	if (!options.offline && !options.noSha && lanetteSha !== global._lastPokemonShowdownSha) {
		console.log("Checking pokemon-showdown version...");
		process.chdir(pokemonShowdown);

		const revParseOutput = await exec('git rev-parse master').catch(e => console.log(e));
		if (!revParseOutput || revParseOutput.Error) {
			throw new Error("git rev-parse error");
		}

		const pokemonShowdownDist = [path.join(pokemonShowdown, "dist")];

		const currentSha = revParseOutput.stdout.replace("\n", "");
		const differentSha = currentSha !== lanetteSha;

		let installPokemonShowdownDependencies = false;
		if (differentSha) {
			installPokemonShowdownDependencies = true;

			// revert build and package.json changes
			let cmd = await exec('git reset --hard').catch(e => console.log(e));
			if (!cmd || cmd.Error) {
				throw new Error("git reset error");
			}

			cmd = await exec('git pull').catch(e => console.log(e));
			if (!cmd || cmd.Error) {
				await setToSha(currentSha);
				throw new Error("git pull error");
			}

			cmd = await setToSha(lanetteSha);
			if (!cmd || cmd.Error) {
				await setToSha(currentSha);
				throw new Error("git reset error");
			}

			console.log("Updated pokemon-showdown to latest compatible commit (" + lanetteSha.substr(0, 7) + ")");
		} else {
			for (const dist of pokemonShowdownDist) {
				if (!fs.existsSync(dist)) {
					installPokemonShowdownDependencies = true;
					break;
				}
			}
		}

		global._lastPokemonShowdownSha = lanetteSha;

		if (installPokemonShowdownDependencies) {
			console.log("Installing pokemon-showdown dependencies...");

			buildTools.deleteFolderRecursive(path.join(pokemonShowdown, "node_modules"));

			rewritePokemonShowdownPackageJson();

			const npmInstallOutput = await exec('npm install --ignore-scripts').catch(e => console.log(e));
			if (!npmInstallOutput || npmInstallOutput.Error) {
				if (differentSha) await setToSha(currentSha);
				throw new Error("npm install error");
			}
		}

		console.log("Running pokemon-showdown build script...");

		for (const dist of pokemonShowdownDist) {
			buildTools.deleteFolderRecursive(dist);
		}

		const nodeBuildOutput = await exec('node build').catch(e => console.log(e));
		if (!nodeBuildOutput || nodeBuildOutput.Error) {
			if (differentSha) await setToSha(currentSha);
			throw new Error("pokemon-showdown build script error");
		}

		process.chdir(__dirname);
	}

	if (!options.noBuild) {
		console.log("Running esbuild...");

		await buildTools.transpile({ci: options.ci});

		console.log("Successfully built files");
	}

	return Promise.resolve();
}
