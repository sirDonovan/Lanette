import path = require('path');

// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - generated after first run
import * as config from './config';
import * as ConfigLoader from './config-loader';
import * as rooms from './rooms';
import type { ReloadableModule } from './types/app';
import type { IGamesWorkers } from './types/games';
import type { RunOptions } from './types/root';
import * as users from './users';

const moduleOrder: ReloadableModule[] = ['tools', 'config', 'dex', 'client', 'commandparser', 'storage', 'tournaments', 'games'];
const moduleFilenames: KeyedDict<ReloadableModule, string> = {
	client: 'client/client',
	commandparser: 'command-parser',
	config: 'config',
	dex: 'dex',
	games: 'games',
	storage: 'storage',
	tools: 'tools',
	tournaments: 'tournaments',
};
const configLoaderFilename = 'config-loader';

/* eslint-disable @typescript-eslint/no-var-requires */

let client = require('./' + moduleFilenames.client) as typeof import('./client/client');
let commandParser = require('./' + moduleFilenames.commandparser) as typeof import('./command-parser');
let dex = require('./' + moduleFilenames.dex) as typeof import('./dex');
let games = require('./' + moduleFilenames.games) as typeof import('./games');
let storage = require('./' + moduleFilenames.storage) as typeof import('./storage');
let tools = require('./' + moduleFilenames.tools) as typeof import('./tools');
let tournaments = require('./' + moduleFilenames.tournaments) as typeof import('./tournaments');

export function instantiate() {
	console.log("Instantiating modules...");

	tools.instantiate();
	global.Config = ConfigLoader.load(Tools.deepClone(config));
	dex.instantiate();
	users.instantiate();
	client.instantiate();
	commandParser.instantiate();
	rooms.instantiate();
	storage.instantiate();
	tournaments.instantiate();
	games.instantiate();

	CommandParser.loadBaseCommands();

	console.log("Loading databases...");
	Storage.importDatabases();

	console.log("Loading dex data...");
	Dex.loadBaseData();

	console.log("Loading games...");
	Games.loadFormats();

	console.log("Loading tournament schedules...");
	Tournaments.loadSchedules();

	console.log("Loading game schedules...");
	Games.loadSchedules();

	global.__reloadInProgress = false;
	global.__reloadModules = reloadModules;
}

/**Returns an error message or null if successful */
export async function reloadModules(username: string, targets: string[]): Promise<string | null> {
	let user = Users.get(username);
	const hasModules: boolean[] = moduleOrder.slice().map(() => false);

	for (const target of targets) {
		const id = Tools.toId(target) as ReloadableModule;
		if (id === 'games') {
			const workers = Games.getWorkers();
			const workerKeys = Object.keys(workers) as (keyof IGamesWorkers)[];
			for (const worker of workerKeys) {
				if (workers[worker].isBusy) {
					const error = "You must wait for all " + worker + " requests to finish first.";
					if (user) user.say(error);
					return error;
				}
			}

			const workerGameRooms: rooms.Room[] = [];
			Users.self.rooms.forEach((rank, room) => {
				if ((room.game && room.game.usesWorkers) || (room.searchChallenge && room.searchChallenge.usesWorkers)) {
					workerGameRooms.push(room);
				}
			});
			if (workerGameRooms.length) {
				const error = "You must wait for the game" + (workerGameRooms.length > 1 ? "s" : "") + " in " +
					Tools.joinList(workerGameRooms.map(x => x.title)) + " to finish first.";
				if (user) user.say(error);
				return error;
			}
		}

		const moduleIndex = moduleOrder.indexOf(id);
		if (moduleIndex !== -1) {
			hasModules[moduleIndex] = true;
		} else {
			const error = "'" + target.trim() + "' is not a module or cannot be reloaded.";
			if (user) user.say(error);
			return error;
		}
	}

	global.__reloadInProgress = true;

	const modules: ReloadableModule[] = [];
	for (let i = 0; i < hasModules.length; i++) {
		if (hasModules[i]) modules.push(moduleOrder[i]);
	}

	if (modules.includes('dex') || modules.includes('games')) Games.setReloadInProgress(true);

	const buildOptions: RunOptions = {
		incrementalBuild: "true",
		noRemote: "true",
		noSha: !modules.includes('dex') ? "true" : "",
	};

	if (user) user.say("Running ``esbuild``...");

	for (const moduleId of modules) {
		Tools.uncacheTree(path.join(Tools.srcBuildFolder, moduleFilenames[moduleId] + '.js'));
	}

	if (modules.includes('config')) Tools.uncacheTree(path.join(Tools.srcBuildFolder, configLoaderFilename + '.js'));
	if (modules.includes('games') || modules.includes('tournaments')) {
		Tools.uncacheTree(path.join(Tools.srcBuildFolder, 'room-activity.js'));
	}

	const buildScript = path.join(Tools.rootBuildFolder, 'build-src.js');
	return (require(buildScript) as typeof import('../build-src')).buildSrc(buildOptions).then(() => {
		for (const moduleId of modules) {
			const modulePath = path.join(Tools.srcBuildFolder, moduleFilenames[moduleId] + '.js');

			if (moduleId === 'client') {
				global.Tools.unrefProperties(client);

				client = require(modulePath) as typeof import('./client/client');
				client.instantiate();
			} else if (moduleId === 'commandparser') {
				global.Tools.unrefProperties(commandParser);

				commandParser = require(modulePath) as typeof import('./command-parser');
				commandParser.instantiate();

				if (!modules.includes('games')) global.Games.loadFormatCommands();
			} else if (moduleId === 'config') {
				let oldConfig = global.Config;
				const configLoader = require(path.join(Tools.srcBuildFolder,
					configLoaderFilename + '.js')) as typeof import('./config-loader');
				const newConfig = configLoader.load(Tools.deepClone(require(modulePath) as typeof import('./config-example')));
				global.Config = newConfig;
				global.Client.updateConfigSettings();
				global.Rooms.updateConfigSettings();

				global.Tools.unrefProperties(oldConfig);

				// @ts-expect-error
				oldConfig = undefined;
			} else if (moduleId === 'dex') {
				global.Tools.unrefProperties(dex);

				dex = require(modulePath) as typeof import('./dex');
				dex.instantiate();
				if (!modules.includes('games')) global.Games.setReloadInProgress(false);
			} else if (moduleId === 'games') {
				global.Games.unrefWorkers();

				global.Tools.unrefProperties(games);

				games = require(modulePath) as typeof import('./games');
				games.instantiate();
			} else if (moduleId === 'storage') {
				clearInterval(global.Storage.globalDatabaseExportInterval);

				global.Tools.unrefProperties(storage);

				storage = require(modulePath) as typeof import('./storage');
				storage.instantiate();
			} else if (moduleId === 'tools') {
				global.Tools.unrefProperties(tools);

				tools = require(modulePath) as typeof import('./tools');
				tools.instantiate();
			} else if (moduleId === 'tournaments') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				global.Tools.unrefProperties(tournaments);

				tournaments = require(modulePath) as typeof import('./tournaments');
				tournaments.instantiate();
			}
		}

		global.__reloadInProgress = false;

		user = global.Users.get(username);
		if (user) user.say("Successfully reloaded " + Tools.joinList(modules) + ".");

		return null;
	}).catch(e => {
		console.log(e);
		Tools.logError(e as Error, "__reloadModules(): " + Tools.joinList(modules));

		global.__reloadInProgress = false;
		if (global.Games.isReloadInProgress()) global.Games.setReloadInProgress(false);

		const error = (e as Error).message;
		user = global.Users.get(username);
		if (user) user.say(error);

		return error;
	});
}

/* eslint-enable @typescript-eslint/no-var-requires */