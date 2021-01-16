import * as client from './client';
import * as commandParser from './command-parser';
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - generated after first run
import * as config from './config';
import * as ConfigLoader from './config-loader';
import * as dex from './dex';
import * as games from './games';
import * as rooms from './rooms';
import * as storage from './storage';
import * as tools from './tools';
import * as tournaments from './tournaments';
import type { ReloadableModule } from './types/app';
import type { IGamesWorkers } from './types/games';
import * as users from './users';

const moduleOrder: ReloadableModule[] = ['tools', 'config', 'dex', 'client', 'storage', 'tournaments', 'commandparser', 'games'];
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

module.exports = (): void => {
	tools.instantiate();
	global.Config = ConfigLoader.load(config);
	dex.instantiate();
	client.instantiate();
	commandParser.instantiate();
	rooms.instantiate();
	storage.instantiate();
	tournaments.instantiate();
	users.instantiate();
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

	// eslint-disable-next-line @typescript-eslint/require-await
	global.__reloadModules = async(username: string, targets: string[]): Promise<void> => {
		let user = Users.get(username);
		const hasModules: boolean[] = moduleOrder.slice().map(() => false);

		for (const target of targets) {
			const id = Tools.toId(target) as ReloadableModule;
			if (id === 'games') {
				const workers = Object.keys(Games.workers) as (keyof IGamesWorkers)[];
				for (const worker of workers) {
					if (Games.workers[worker].isBusy) {
						if (user) user.say("You must wait for all " + worker + " requests to finish first.");
						return;
					}
				}

				const workerGameRooms: rooms.Room[] = [];
				Users.self.rooms.forEach((rank, room) => {
					if (room.game && room.game.usesWorkers) workerGameRooms.push(room);
				});
				if (workerGameRooms.length) {
					if (user) user.say("You must wait for the game" + (workerGameRooms.length > 1 ? "s" : "") + " in " +
						Tools.joinList(workerGameRooms.map(x => x.title)) + " to finish first.");
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

		if (modules.includes('dex') || modules.includes('games')) Games.reloadInProgress = true;
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

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const path = require('path') as typeof import('path');
		const buildScript = path.join(Tools.rootFolder, 'build.js');
		Tools.uncacheTree(buildScript);

		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
		return (require(buildScript)(buildOptions) as Promise<void>).then(() => {
			for (const moduleId of modules) {
				if (moduleId === 'client') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newClient = require('./' + moduleFilenames[moduleId]) as typeof import('./client');
					newClient.instantiate();
				} else if (moduleId === 'commandparser') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newCommandParser = require('./' + moduleFilenames[moduleId]) as typeof import('./command-parser');
					newCommandParser.instantiate();
					CommandParser.loadBaseCommands();

					if (!modules.includes('games')) Games.loadFormatCommands();
				} else if (moduleId === 'config') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const configLoader = require('./config-loader') as typeof import('./config-loader');
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newConfig = configLoader.load(require('./config') as typeof import('./config-example'));
					global.Config = newConfig;
					Client.updateConfigSettings();
					Rooms.updateConfigSettings();
				} else if (moduleId === 'dex') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newDex = require('./' + moduleFilenames[moduleId]) as typeof import('./dex');
					newDex.instantiate();
					if (!modules.includes('games')) Games.reloadInProgress = false;
				} else if (moduleId === 'games') {
					Games.unrefWorkers();

					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newGames = require('./' + moduleFilenames[moduleId]) as typeof import('./games');
					newGames.instantiate();
				} else if (moduleId === 'storage') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newStorage = require('./' + moduleFilenames[moduleId]) as typeof import('./storage');
					newStorage.instantiate();
				} else if (moduleId === 'tools') {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newTools = require('./' + moduleFilenames[moduleId]) as typeof import('./tools');
					newTools.instantiate();
				} else if (moduleId === 'tournaments') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const newTournaments = require('./' + moduleFilenames[moduleId]) as typeof import('./tournaments');
					newTournaments.instantiate();
				}
			}

			global.__reloadInProgress = false;

			user = Users.get(username);
			if (user) user.say("Successfully reloaded " + Tools.joinList(modules) + ".");
		}).catch(e => {
			console.log(e);

			global.__reloadInProgress = false;
			if (Games.reloadInProgress) Games.reloadInProgress = false;
			if (Storage.reloadInProgress) Storage.reloadInProgress = false;

			user = Users.get(username);
			if (user) user.say((e as Error).message);
		});
	};
};