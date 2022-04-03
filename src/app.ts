// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - generated after first run
import * as config from './config';
import * as ConfigLoader from './config-loader';
import * as rooms from './rooms';
import type { ReloadableModule } from './types/app';
import type { IGamesWorkers } from './types/games';
import * as users from './users';

const moduleOrder: ReloadableModule[] = ['tools', 'config', 'dex', 'client', 'commandparser', 'storage', 'tournaments', 'games'];
const moduleFilenames: KeyedDict<ReloadableModule, string> = {
	client: 'client',
	commandparser: 'command-parser',
	config: 'config',
	dex: 'dex',
	games: 'games',
	storage: 'storage',
	tools: 'tools',
	tournaments: 'tournaments',
};

/* eslint-disable @typescript-eslint/no-var-requires */

let client = require('./' + moduleFilenames.client) as typeof import('./client');
let commandParser = require('./' + moduleFilenames.commandparser) as typeof import('./command-parser');
let dex = require('./' + moduleFilenames.dex) as typeof import('./dex');
let games = require('./' + moduleFilenames.games) as typeof import('./games');
let storage = require('./' + moduleFilenames.storage) as typeof import('./storage');
let tools = require('./' + moduleFilenames.tools) as typeof import('./tools');
let tournaments = require('./' + moduleFilenames.tournaments) as typeof import('./tournaments');

module.exports = (): void => {
	console.log("Instantiating modules...");

	tools.instantiate();
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	global.Config = ConfigLoader.load(config);
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
	Dex.loadAllData();

	console.log("Loading games...");
	Games.loadFormats();

	console.log("Loading tournament schedules...");
	Tournaments.loadSchedules();

	global.__reloadInProgress = false;

	global.__reloadModules = async(username: string, targets: string[]): Promise<void> => {
		let user = Users.get(username);
		const hasModules: boolean[] = moduleOrder.slice().map(() => false);

		for (const target of targets) {
			const id = Tools.toId(target) as ReloadableModule;
			if (id === 'games') {
				const workers = Games.getWorkers();
				const workerKeys = Object.keys(workers) as (keyof IGamesWorkers)[];
				for (const worker of workerKeys) {
					if (workers[worker].isBusy) {
						if (user) user.say("You must wait for all " + worker + " requests to finish first.");
						return;
					}
				}

				const workerGameRooms: rooms.Room[] = [];
				Users.self.rooms.forEach((rank, room) => {
					if ((room.game && room.game.usesWorkers) || (room.searchChallenge && room.searchChallenge.usesWorkers)) {
						workerGameRooms.push(room);
					}
				});
				if (workerGameRooms.length) {
					if (user) {
						user.say("You must wait for the game" + (workerGameRooms.length > 1 ? "s" : "") + " in " +
							Tools.joinList(workerGameRooms.map(x => x.title)) + " to finish first.");
					}
					return;
				}
			}

			const moduleIndex = moduleOrder.indexOf(id);
			if (moduleIndex !== -1) {
				hasModules[moduleIndex] = true;
			} else {
				if (user) user.say("'" + target.trim() + "' is not a module or cannot be reloaded.");
				return;
			}
		}

		global.__reloadInProgress = true;

		const modules: ReloadableModule[] = [];
		for (let i = 0; i < hasModules.length; i++) {
			if (hasModules[i]) modules.push(moduleOrder[i]);
		}

		if (modules.includes('dex') || modules.includes('games')) Games.setReloadInProgress(true);
		if (modules.includes('storage')) Storage.reloadInProgress = true;

		const buildOptions: Dict<boolean> = {
			incrementalBuild: true,
			offline: !modules.includes('dex'),
		};

		if (user) user.say("Running ``tsc``...");

		for (const moduleId of modules) {
			Tools.uncacheTree('./' + moduleFilenames[moduleId]);
		}
		if (modules.includes('config')) Tools.uncacheTree('./config-loader');
		if (modules.includes('games') || modules.includes('tournaments')) Tools.uncacheTree('./room-activity');

		const path = require('path') as typeof import('path');
		const buildScript = path.join(Tools.rootFolder, 'build.js');
		Tools.uncacheTree(buildScript);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		return (require(buildScript)(buildOptions) as Promise<void>).then(() => {
			for (const moduleId of modules) {
				if (moduleId === 'client') {
					global.Tools.unrefProperties(client);

					client = require('./' + moduleFilenames[moduleId]) as typeof import('./client');
					client.instantiate();
				} else if (moduleId === 'commandparser') {
					global.Tools.unrefProperties(commandParser);

					commandParser = require('./' + moduleFilenames[moduleId]) as typeof import('./command-parser');
					commandParser.instantiate();

					if (!modules.includes('games')) global.Games.loadFormatCommands();
				} else if (moduleId === 'config') {
					let oldConfig = global.Config;
					const configLoader = require('./config-loader') as typeof import('./config-loader');
					const newConfig = configLoader.load(require('./config') as typeof import('./config-example'));
					global.Config = newConfig;
					global.Client.updateConfigSettings();
					global.Rooms.updateConfigSettings();

					global.Tools.unrefProperties(oldConfig);

					// @ts-expect-error
					oldConfig = undefined;
				} else if (moduleId === 'dex') {
					global.Tools.unrefProperties(dex);

					dex = require('./' + moduleFilenames[moduleId]) as typeof import('./dex');
					dex.instantiate();
					if (!modules.includes('games')) global.Games.setReloadInProgress(false);
				} else if (moduleId === 'games') {
					global.Games.unrefWorkers();

					global.Tools.unrefProperties(games);

					games = require('./' + moduleFilenames[moduleId]) as typeof import('./games');
					games.instantiate();
				} else if (moduleId === 'storage') {
					global.Tools.unrefProperties(storage);

					storage = require('./' + moduleFilenames[moduleId]) as typeof import('./storage');
					storage.instantiate();
				} else if (moduleId === 'tools') {
					global.Tools.unrefProperties(tools);

					tools = require('./' + moduleFilenames[moduleId]) as typeof import('./tools');
					tools.instantiate();
				} else if (moduleId === 'tournaments') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
					global.Tools.unrefProperties(tournaments);

					tournaments = require('./' + moduleFilenames[moduleId]) as typeof import('./tournaments');
					tournaments.instantiate();
				}
			}

			global.__reloadInProgress = false;

			user = global.Users.get(username);
			if (user) user.say("Successfully reloaded " + Tools.joinList(modules) + ".");
		}).catch(e => {
			console.log(e);

			global.__reloadInProgress = false;
			if (global.Games.isReloadInProgress()) global.Games.setReloadInProgress(false);
			if (global.Storage.reloadInProgress) global.Storage.reloadInProgress = false;

			user = global.Users.get(username);
			if (user) user.say((e as Error).message);
		});
	};
};

/* eslint-enable @typescript-eslint/no-var-requires */