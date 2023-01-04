import child_process = require('child_process');
import esbuild = require('esbuild');
import fs = require('fs');
import path = require('path');

import { buildSrc } from './build-src';
import type { IInputMetadata, InputFolderNames, InputFolders, RunOptionNames, RunOptions } from './src/types/root';

if (!global._esbuildResults) global._esbuildResults = {};

const folderNames: InputFolderNames[] = ['private', 'src', 'web'];
const optionNames: RunOptionNames[] = ['offline', 'incrementalBuild', 'modules', 'games', 'gameSeed', 'noBuild', 'mochaRuns', 'script',
    'grep', 'ci'];
const optionAliases: Dict<RunOptionNames> = {
	'local': 'offline',
	'incremental': 'incrementalBuild',
	'module': 'modules',
	'game': 'games',
};

export function getInputFolders(): InputFolders {
	if (global._inputFolders) return global._inputFolders;

	// __dirname from build script is root/build
	const rootFolder: IInputMetadata = {
		buildPath: __dirname,
		inputPath: path.join(__dirname, ".."),
	};

	const inputFolders: PartialKeyedDict<InputFolderNames, IInputMetadata> = {};
	for (const folderName of folderNames) {
		inputFolders[folderName] = {
			buildPath: path.join(rootFolder.buildPath, folderName),
			inputPath: path.join(rootFolder.inputPath, folderName),
		};

		if (folderName === 'web') {
			inputFolders[folderName]!.tsConfig = path.join(inputFolders[folderName]!.inputPath, "tsconfig.json");
		}
	}

	global._inputFolders = {
		root: rootFolder,
		private: inputFolders.private!,
		src: inputFolders.src!,
		web: inputFolders.web!,
	};

	return global._inputFolders;
}

export function getRunOptions(filename?: string): RunOptions {
	if (!global._runOptions) {
		global._runOptions = {};
        const startIndex = filename ? process.argv.indexOf(filename) + 1 : 0;
		for (let i = startIndex; i < process.argv.length; i++) {
			if (!process.argv[i].startsWith('--')) continue;
			const arg = process.argv[i].substr(2);
			if (!arg) continue;

			const equalsIndex = arg.indexOf('=');
			let optionName = arg;
			let value;
			if (equalsIndex === -1) {
				value = 'true';
			} else {
				optionName = arg.substr(0, equalsIndex);
				value = arg.substr(equalsIndex + 1).trim();
			}

			if (optionName in optionAliases) optionName = optionAliases[optionName];

			if (!optionNames.includes(optionName as RunOptionNames)) throw new Error("Unknown test option '" + optionName + "'");
			global._runOptions[optionName as RunOptionNames] = value;
		}
	}

	return global._runOptions;
}

export async function initializeSrc(options?: RunOptions) {
    await buildSrc(options).catch(e => {
		console.log(e);
		process.exit(1);
	});

	// tools.ts is required by build-src so src files cannot be imported directly

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	(require(path.join(getInputFolders().src.buildPath, 'app')) as typeof import("./src/app")).instantiate();
}

export function setExceptionHandler() {
	process.on('uncaughtException', error => {
		console.log(error);
		Tools.logError(error, "process.on('uncaughtException')");
	});
}

// Modified from https://stackoverflow.com/a/32197381
export function deleteFolderRecursive(folder: string): void {
	folder = folder.trim();
	if (!folder || folder === '/' || folder === '.') return;

	let exists = false;
	try {
		fs.accessSync(folder);
		exists = true;
	} catch (e) {} // eslint-disable-line no-empty

	if (exists) {
		const files = fs.readdirSync(folder);
		for (const file of files) {
			const curPath = path.join(folder, file);
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		}

		if (folder !== getInputFolders().root.buildPath) fs.rmdirSync(folder);
	}
}

export function listFilesRecursive(folder: string): string[] {
	folder = folder.trim();
	if (!folder || folder === '/' || folder === '.') return [];

	let fileList: string[] = [];
	let exists = false;
	try {
		fs.accessSync(folder);
		exists = true;
	} catch (e) {} // eslint-disable-line no-empty

	if (exists) {
		const files = fs.readdirSync(folder);
		for (const file of files) {
			const curPath = path.join(folder, file);
			if (fs.lstatSync(curPath).isDirectory()) {
				fileList = fileList.concat(listFilesRecursive(curPath));
			}
			fileList.push(curPath);
		}
	}
	return fileList;
}

export function deleteBuildFolders(): void {
	const inputFolders = getInputFolders();
	for (const folderName of folderNames) {
		if (folderName === 'root') continue;

		deleteFolderRecursive(inputFolders[folderName].buildPath);
	}
}

export function exec(command: string): string | false {
    try {
        const result = child_process.execSync(command);
        if (typeof result === 'string') return result;
        return result.toString();
    } catch (e: unknown) {
        console.log("Failed to run command " + command + ": " + e);
        return false;
    }
}

export function setToSha(sha: string): string | false {
	return exec('git reset --hard ' + sha);
}

export function createUntrackedFiles() {
	const inputFolders = getInputFolders();
	const configFile = path.join(inputFolders.src.inputPath, 'config.ts');
	if (!fs.existsSync(configFile)) {
		console.log("Creating a default config.ts in the src folder (you need to edit this)...");
		fs.writeFileSync(configFile, fs.readFileSync(path.join(inputFolders.src.inputPath, 'config-example.ts')));
    }

	const clientDataDirectory = path.join(inputFolders.root.inputPath, 'client-data');

	const pokedexMiniFile = path.join(clientDataDirectory, 'pokedex-mini.js');
	if (!fs.existsSync(pokedexMiniFile)) {
		fs.writeFileSync(pokedexMiniFile, fs.readFileSync(path.join(clientDataDirectory, 'pokedex-mini-base.js')));
	}

	const pokedexMiniBWFile = path.join(clientDataDirectory, 'pokedex-mini-bw.js');
	if (!fs.existsSync(pokedexMiniBWFile)) {
		fs.writeFileSync(pokedexMiniBWFile, fs.readFileSync(path.join(clientDataDirectory, 'pokedex-mini-bw-base.js')));
	}
}

export async function transpile(options?: RunOptions): Promise<void> {
	const inputFolders = getInputFolders();
	const tsConfig = path.join(inputFolders.root.inputPath, "tsconfig.json");

	let allInputFiles: string[] = [];
	for (const folderName of folderNames) {
		if (folderName === 'root') continue;

		const inputFolder = inputFolders[folderName];
		const inputFiles = listFilesRecursive(inputFolder.inputPath);
		allInputFiles = allInputFiles.concat(inputFiles);
		for (const filepath of inputFiles) {
			if (filepath in _esbuildResults!) {
				_esbuildResults![filepath] = await _esbuildResults![filepath].rebuild();
			} else {
				if (!filepath.endsWith('.ts') || filepath.endsWith('.d.ts')) continue;

				let outDirectory = inputFolder.buildPath;
				const relativeFilepath = filepath.substr(inputFolder.inputPath.length + 1);
				const index = relativeFilepath.lastIndexOf(path.sep);
				if (index !== -1) {
					outDirectory = path.join(outDirectory, relativeFilepath.substr(0, index));
				}

				const result = await esbuild.build({
					entryPoints: [filepath],
					format: 'cjs',
					platform: 'node',
					sourcemap: true,
					incremental: true,
					tsconfig: inputFolder.tsConfig || tsConfig,
					outdir: outDirectory,
				}).catch((e: Error) =>  {
					console.log("Error building file " + filepath + ": " + e.message);
					process.exit(1);
				});

				if (!options || !options.ci) {
					_esbuildResults![filepath] = result;
				} else {
					result.rebuild.dispose();
				}
			}
		}
	}

    for (const filepath in _esbuildResults) {
        if (!allInputFiles.includes(filepath)) {
            _esbuildResults[filepath].rebuild.dispose();
            delete _esbuildResults[filepath];

            try {
                fs.unlinkSync(filepath);
            } catch (e) {} // eslint-disable-line no-empty
        }
    }
}
