import fs = require('fs');
import path = require('path');

import type { RunOptions } from './src/types/root';
import {
	createUntrackedFiles, deleteFolderRecursive, deletePreviousBuild, exec, getInputFolders, getRunOptions, setToSha, transpile
} from './tools';

interface IPackageJson {
    dependencies: Dict<string>;
    devDependencies: Dict<string>;
    optionalDependencies: Dict<string>;
    secretDependencies: Dict<string>;
}

function getPokemonShowdownFolder() {
	return path.join(getInputFolders().root.inputPath, 'pokemon-showdown');
}

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
		"typescript",
];

function rewritePokemonShowdownPackageJson(): void {
	const packageJsonPath = path.join(getPokemonShowdownFolder(), "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString().split("\n").join("")) as IPackageJson;

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

export const buildSrc = async(options?: RunOptions): Promise<void> => {
	if (options === undefined) options = getRunOptions();

	const rootFolder = getInputFolders().root;
	const pokemonShowdown = getPokemonShowdownFolder();

	createUntrackedFiles();

	if (!options.noBuild) {
		console.log("Preparing to build files...");
		if (!options.incrementalBuild) {
			deletePreviousBuild();
			console.log("Deleted old build folder");
		}
	}

	if (!options.offline && !options.noRemote) {
		console.log("Checking pokemon-showdown remote...");
		const remoteDirectories = [path.join(rootFolder.inputPath, 'Pokemon-Showdown'), pokemonShowdown];
		const lanetteRemote = fs.readFileSync(path.join(rootFolder.inputPath, "pokemon-showdown-remote.txt")).toString().trim();

		let needsClone = true;
		for (const remoteDirectory of remoteDirectories) {
			if (!fs.existsSync(remoteDirectory)) continue;
			process.chdir(remoteDirectory);

			const remoteOutput = exec('git remote -v');
			if (remoteOutput === false) {
				throw new Error("git remote error");
			}

			let currentRemote;
			const remotes = remoteOutput.split("\n");
			for (const remote of remotes) {
				const formattedRemote = remote.replace("\t", " ").trim();
				if (formattedRemote.startsWith('origin ') && formattedRemote.endsWith(' (fetch)')) {
					currentRemote = formattedRemote.split('origin ')[1].split(' (fetch)')[0].trim();
					break;
				}
			}
			process.chdir(rootFolder.inputPath);

			if (currentRemote === lanetteRemote || currentRemote + ".git" === lanetteRemote) {
				needsClone = false;
			} else {
				deleteFolderRecursive(remoteDirectory);
				console.log("Deleted old remote " + currentRemote);
			}
		}

		if (needsClone) {
			console.log("Cloning " + lanetteRemote + "...");
			const cmd = exec('git clone ' + lanetteRemote);
			if (cmd === false) {
				throw new Error("git clone error");
			}

			console.log("Cloned into pokemon-showdown");
		}
	}

	const lanetteSha = fs.readFileSync(path.join(rootFolder.inputPath, "pokemon-showdown-sha.txt")).toString().trim();
	if (!options.offline && !options.noSha && lanetteSha !== global._lastPokemonShowdownSha) {
		console.log("Checking pokemon-showdown version...");
		process.chdir(pokemonShowdown);

		const revParseOutput = exec('git rev-parse master');
		if (revParseOutput === false) {
			throw new Error("git rev-parse error");
		}

		const pokemonShowdownBaseDist = path.join(pokemonShowdown, "dist");
		const pokemonShowdownDistFolders = [path.join(pokemonShowdownBaseDist, "data"), path.join(pokemonShowdownBaseDist, "sim")];

		const currentSha = revParseOutput.replace("\n", "");
		const differentSha = currentSha !== lanetteSha;

		let installPokemonShowdownDependencies = false;
		if (differentSha) {
			installPokemonShowdownDependencies = true;

			// revert package.json changes
			let cmd = exec('git reset --hard');
			if (cmd === false) {
				throw new Error("git reset error");
			}

			cmd = exec('git pull');
			if (cmd === false) {
				setToSha(currentSha);
				throw new Error("git pull error");
			}

			cmd = setToSha(lanetteSha);
			if (cmd === false) {
				setToSha(currentSha);
				throw new Error("git reset error");
			}

			console.log("Updated pokemon-showdown to latest compatible commit (" + lanetteSha.substr(0, 7) + ")");
		} else {
			for (const dist of pokemonShowdownDistFolders) {
				if (!fs.existsSync(dist)) {
					installPokemonShowdownDependencies = true;
					break;
				}
			}
		}

		global._lastPokemonShowdownSha = lanetteSha;

		if (installPokemonShowdownDependencies) {
			console.log("Installing pokemon-showdown dependencies...");

			deleteFolderRecursive(path.join(pokemonShowdown, "node_modules"));

			rewritePokemonShowdownPackageJson();

			const npmInstallOutput = exec('npm install --ignore-scripts');
			if (npmInstallOutput === false) {
				if (differentSha) setToSha(currentSha);
				throw new Error("npm install error");
			}
		}

		console.log("Running pokemon-showdown build script...");

		deleteFolderRecursive(pokemonShowdownBaseDist);

		const nodeBuildOutput = exec('node build');
		if (nodeBuildOutput === false) {
			if (differentSha) setToSha(currentSha);
			throw new Error("pokemon-showdown build script error");
		}

		process.chdir(rootFolder.inputPath);
	}

	if (!options.noBuild) {
		console.log("Running esbuild...");

		transpile();

		console.log("Successfully built files");
	}

	return Promise.resolve();
};
