import fs = require('fs');
import path = require('path');
import type { SearchChallenge } from './games/templates/search-challenge';

import { gameSchedules } from './game-schedules';
import type { PRNGSeed } from './lib/prng';
import { ScriptedGame } from './room-game-scripted';
import type { UserHostedGame } from './room-game-user-hosted';
import type { Room } from "./rooms";
import type { CommandErrorArray } from "./types/command-parser";
import type { ModelGeneration } from './types/dex';
import type {
	AutoCreateTimerType, DefaultGameOption, GameCategory, GameChallenge, GameChallengeSettings, GameCommandDefinitions,
	GameCommandReturnType, GameMode, GameNumberOptions, IGameAchievement, IGameFile, IGameFormat, IGameFormatComputed, IGameMode,
	IGameModeFile, IGameOptions, IGameNumberOptionValues, IGamesWorkers, IGameTemplateFile, IGameVariant, InternalGame, IUserHostedComputed,
	IUserHostedFormat, IUserHostedFormatComputed, LoadedGameCommands, LoadedGameFile, UserHostedCustomizable, IOfficialGame,
	IScheduledGameTimerData
} from './types/games';
import type { IAbility, IAbilityCopy, IItem, IItemCopy, IMove, IMoveCopy, IPokemon, IPokemonCopy } from './types/pokemon-showdown';
import type { ICustomBorder, IGameCustomBox, IGameHostBox, IGameHostDisplay, IPastGame } from './types/storage';
import type { HexCode, IHexCodeData } from './types/tools';
import type { User } from './users';
import { ParametersWorker } from './workers/parameters';
import { PortmanteausWorker } from './workers/portmanteaus';
import { UniquePairsWorker } from './workers/unique-pairs';

type Achievements = Dict<IGameAchievement>;
type Formats = Dict<LoadedGameFile>;
type InternalFormats = KeyedDict<InternalGame, LoadedGameFile>;
type LastChallengeTimes = KeyedDict<GameChallenge, Dict<Dict<number>>>;
type MinigameCommandNames = Dict<{aliases: string[]; format: string}>;
type Modes = Dict<IGameMode>;
type UserHostedFormats = Dict<IUserHostedComputed>;
type GameCategoryNames = Readonly<KeyedDict<GameCategory, string>>;

interface IPokemonListOptions {
	filter?: (pokemon: IPokemon) => boolean;
	gen?: number;
	obtainable?: boolean;
}

interface ICreateGameOptions {
	childGame?: boolean;
	minigame?: boolean;
	official?: boolean;
	pmRoom?: Room;
	initialSeed?: PRNGSeed;
}

const SKIP_SCRIPTED_COOLDOWN_DURATION = 5 * 60 * 1000;
const SKIPPED_SCRIPTED_COOLDOW_TIMER = 10 * 1000;
const DEFAULT_CATEGORY_COOLDOWN = 3;
const MAX_MOVE_AVAILABILITY = 500;
const MINIGAME_BITS = 25;
const SCRIPTED_GAME_HIGHLIGHT = "Hosting a scriptedgame of";
const USER_HOST_GAME_HIGHLIGHT = "is hosting a hostgame of";
const SCRIPTED_GAME_VOTING_HIGHLIGHT = "Hosting a scriptedgamevote";

const gamesDirectory = path.join(__dirname, 'games');
const internalGamePaths: Readonly<KeyedDict<InternalGame, string>> = {
	botchallenge: path.join(gamesDirectory, "internal", "bot-challenge.js"),
	eggtoss: path.join(gamesDirectory, "internal", "egg-toss.js"),
	headtohead: path.join(gamesDirectory, "internal", "head-to-head.js"),
	onevsone: path.join(gamesDirectory, "internal", "one-vs-one.js"),
	sweetthief: path.join(gamesDirectory, "internal", "sweet-thief.js"),
	vote: path.join(gamesDirectory, "internal", "vote.js"),
};

const categoryNames: GameCategoryNames = {
	'battle-elimination': 'Battle Elimination',
	'chain': 'Chain',
	'identification-1': 'Identification Group 1',
	'identification-2': 'Identification Group 2',
	'knowledge-1': 'Knowledge Group 1',
	'knowledge-2': 'Knowledge Group 2',
	'knowledge-3': 'Knowledge Group 3',
	'luck': 'Luck',
	'map': 'Map',
	'puzzle': 'Puzzle',
	'reaction': 'Reaction',
	'search-challenge': 'Search Challenge',
	'speed': 'Speed',
	'tabletop': 'Tabletop',
};

const numberGameOptions: GameNumberOptions[] = ['points', 'teamPoints', 'freejoin', 'cards', 'operands', 'names', 'gen', 'params',
	'ports', 'teams'];

const excludedTiers: string[] = ["Illegal", "Unreleased", "(Uber)", "(OU)", "(UU)", "(RU)", "(NU)", "(PU)", "(ZU)", "(LC)"];

const sharedCommandDefinitions: GameCommandDefinitions = {
	summary: {
		command(target, room, user) {
			if (!(user.id in this.players)) return false;
			if (!this.started) {
				user.say("You must wait for the game to start to see your summary.");
				return false;
			}
			const player = this.players[user.id];
			if (this.getPlayerSummary) {
				this.getPlayerSummary(this.players[user.id]);
			} else {
				let summary = '';
				if (this.points) summary += "Your points: " + (this.points.get(player) || 0) + "<br />";
				if (summary) player.sayHtml(summary);
			}
			return true;
		},
		pmGameCommand: true,
	},
	repost: {
		command(target, room, user) {
			if (!user.hasRank(this.room as Room, 'voice')) return false;
			if (this.repostInformation) this.repostInformation();
			return true;
		},
		chatOnly: true,
	},
};

const gameChallenges: GameChallenge[] = ['botchallenge', 'onevsone'];

export class Games {
	readonly delayedOfficialGameTime: number = 15 * 1000;

	private readonly achievements: Achievements = {};
	private readonly aliases: Dict<string> = {};
	private autoCreateTimers: Dict<NodeJS.Timeout> = {};
	private autoCreateTimerData: Dict<{endTime: number, type: AutoCreateTimerType}> = {};
	private readonly formats: Formats = {};
	private readonly formatModules: NodeModule[] = [];
	private readonly freejoinFormatTargets: string[] = [];
	private gameCooldownMessageTimers: Dict<NodeJS.Timeout> = {};
	private gameCooldownMessageTimerData: Dict<{endTime: number, minigameCooldownMinutes: number}> = {};
	// @ts-expect-error - set in loadFormats()
	private readonly internalFormats: InternalFormats = {};
	private lastCatalogUpdates: Dict<string> = {};
	private lastChallengeTimes: LastChallengeTimes = {
		botchallenge: {},
		onevsone: {},
	};
	private lastGames: Dict<number> = {};
	private lastMinigames: Dict<number> = {};
	private lastScriptedGames: Dict<number> = {};
	private lastUserHostedGames: Dict<number> = {};
	private lastUserHostTimes: Dict<Dict<number>> = {};
	private lastUserHostFormatTimes: Dict<Dict<number>> = {};
	private lastWinners: Dict<string[]> = {};
	private readonly minigameCommandNames: MinigameCommandNames = {};
	private readonly modes: Modes = {};
	private readonly modeAliases: Dict<string> = {};
	private nextVoteBans: Dict<string[]> = {};
	private reloadInProgress: boolean = false;
	private skippedScriptedCooldowns: Dict<boolean> = {};
	private readonly userHostedAliases: Dict<string> = {};
	private readonly userHostedFormats: UserHostedFormats = {};
	private readonly workers: IGamesWorkers = {
		parameters: new ParametersWorker(),
		portmanteaus: new PortmanteausWorker(),
		uniquePairs: new UniquePairsWorker(),
	};

	private nextOfficialGames: Dict<IOfficialGame> = {};
	private officialGames: Dict<Dict<IOfficialGame[]>> = {};
	private readonly schedules: typeof gameSchedules = gameSchedules;
	private scheduledGameTimerData: Dict<IScheduledGameTimerData> = {};
	private scheduledGameTimers: Dict<NodeJS.Timeout> = {};

	private readonly commands: LoadedGameCommands;
	private readonly sharedCommands: LoadedGameCommands;

	// set in loadFormats()
	private readonly userHosted!: typeof import('./room-game-user-hosted').game;

	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	private abilitiesLists: Dict<readonly IAbility[]> = Object.create(null);
	private itemsLists: Dict<readonly IItem[]> = Object.create(null);
	private movesLists: Dict<readonly IMove[]> = Object.create(null);
	private nationalDexPokemonLists: Dict<readonly IPokemon[]> = Object.create(null);
	private pokemonLists: Dict<readonly IPokemon[]> = Object.create(null);
	/* eslint-enable */

	constructor() {
		const sharedCommands = CommandParser.loadCommandDefinitions(sharedCommandDefinitions);
		this.sharedCommands = sharedCommands;
		this.commands = Object.assign(Object.create(null), sharedCommands) as GameCommandDefinitions;
	}

	getScriptedGameHighlight(): string {
		return SCRIPTED_GAME_HIGHLIGHT;
	}

	getUserHostedGameHighlight(): string {
		return USER_HOST_GAME_HIGHLIGHT;
	}

	getScriptedGameVoteHighlight(): string {
		return SCRIPTED_GAME_VOTING_HIGHLIGHT;
	}

	getAchievements(): Readonly<Achievements> {
		return this.achievements;
	}

	getAliases(): Readonly<Dict<string>> {
		return this.aliases;
	}

	getExcludedTiers(): readonly string[] {
		return excludedTiers;
	}

	getFormats(): Readonly<Formats> {
		return this.formats;
	}

	getFreejoinFormatTargets(): readonly string[] {
		return this.freejoinFormatTargets;
	}

	getInternalFormats(): Readonly<InternalFormats> {
		return this.internalFormats;
	}

	getCategoryNames(): GameCategoryNames {
		return categoryNames;
	}

	getMaxMoveAvailability(): number {
		return MAX_MOVE_AVAILABILITY;
	}

	getMinigameBits(): number {
		return MINIGAME_BITS;
	}

	getSharedCommands(): Readonly<LoadedGameCommands> {
		return this.sharedCommands;
	}

	getLastChallengeTimes(): DeepImmutable<LastChallengeTimes> {
		return this.lastChallengeTimes;
	}

	getLastWinners(room: Room): string[] | undefined {
		return this.lastWinners[room.id];
	}

	getMinigameCommandNames(): Readonly<MinigameCommandNames> {
		return this.minigameCommandNames;
	}

	getModes(): Readonly<Modes> {
		return this.modes;
	}

	getModeAliases(): Readonly<Dict<string>> {
		return this.modeAliases;
	}

	getUserHostedAliases(): Readonly<Dict<string>> {
		return this.userHostedAliases;
	}

	getUserHostedFormats(): Readonly<UserHostedFormats> {
		return this.userHostedFormats;
	}

	getWorkers(): Readonly<IGamesWorkers> {
		return this.workers;
	}

	isReloadInProgress(): boolean {
		return this.reloadInProgress;
	}

	setReloadInProgress(state: boolean): void {
		this.reloadInProgress = state;
	}

	async unrefWorkers(): Promise<void> {
		const workers = Object.keys(this.workers) as (keyof IGamesWorkers)[];
		for (const worker of workers) {
			await this.workers[worker].unref();
			delete this.workers[worker];
		}
	}

	exitWorkers(): void {
		const workers = Object.keys(this.workers) as (keyof IGamesWorkers)[];
		for (const worker of workers) {
			this.workers[worker].exit();
		}
	}

	copyTemplateProperties<T extends ScriptedGame, U extends ScriptedGame>(template: IGameTemplateFile<T>, game: IGameFile<U>):
		IGameFile<U> {
		return Object.assign(Tools.deepClone(template), game);
	}

	loadSchedules(): void {
		for (const server in this.schedules) {
			const rooms = Object.keys(this.schedules[server]);
			for (const room of rooms) {
				const id = Tools.toRoomId(room);
				if (id !== room) {
					this.schedules[server][id] = this.schedules[server][room];
					delete this.schedules[server][room];
				}
			}
		}

		for (const server in this.schedules) {
			this.officialGames[server] = {};

			for (const room in this.schedules[server]) {
				this.officialGames[server][room] = [];

				for (const month in this.schedules[server][room].months) {
					for (const day in this.schedules[server][room].months[month].formats) {
						for (const format of this.schedules[server][room].months[month].formats[day]) {
							try {
								if (format) this.getExistingFormat(format);
							} catch (e) {
								throw new Error(month + "/" + day + " in " + room + ": " + (e as Error).message);
							}
						}
					}
				}

				const months = Object.keys(this.schedules[server][room].months).map(x => parseInt(x));
				let month = months[0];
				months.shift();

				let formats = this.schedules[server][room].months[month].formats;
				let times = this.schedules[server][room].months[month].times;
				let formatIndex = times[0][0] > times[1][0] ? 2 : 1;
				const date = new Date();
				let day = 1;
				date.setMonth(month - 1, day);
				date.setDate(day);
				date.setFullYear(this.schedules[server][room].months[month].year);
				let lastDayOfMonth = Tools.getLastDayOfMonth(date);

				const rolloverDay = (): void => {
					formatIndex++;
					if (!(formatIndex in formats)) {
						if (months.length) {
							formats = this.schedules[server][room].months[months[0]].formats;
							formatIndex = 1;
						} else {
							formatIndex--;
						}
					}

					day++;
					if (day > lastDayOfMonth) {
						day = 1;
						const previousMonth = month;
						month = months[0];
						months.shift();
						if (month) {
							date.setMonth(month - 1, day);
							date.setFullYear(this.schedules[server][room].months[month].year);

							times = this.schedules[server][room].months[month].times;
							lastDayOfMonth = Tools.getLastDayOfMonth(date);
						} else {
							// previousMonth + 1 - 1
							date.setMonth(previousMonth, day);
						}
					}
					date.setDate(day);
				};

				// month is eventually undefined due to rolloverDay()
				while (month) {
					let rolledOverDay = false;
					for (let i = 0; i < times.length; i++) {
						if (i > 0 && times[i][0] < times[i - 1][0]) {
							rolloverDay();
							rolledOverDay = true;
						}

						date.setHours(times[i][0], times[i][1], 0, 0);

						let format = "";
						for (let j = i; j >= 0; j--) {
							format = formats[formatIndex][j];
							if (format) break;
						}

						if (format) this.officialGames[server][room].push({format, time: date.getTime(), official: true});
					}

					if (!rolledOverDay) rolloverDay();
				}

				this.officialGames[server][room].sort((a, b) => a.time - b.time);
			}
		}
	}

	setNextScheduledGame(room: Room): void {
		this.setOfficialGame(room);

		const database = Storage.getDatabase(room);
		if (database.queuedScriptedGame && (!(room.id in this.nextOfficialGames) ||
			database.queuedScriptedGame.time < this.nextOfficialGames[room.id].time)) {
			const format = this.getFormat(database.queuedScriptedGame.formatid);
			if (!Array.isArray(format)) {
				const now = Date.now();
				if (database.queuedScriptedGame.time <= now) database.queuedScriptedGame.time = now + this.delayedOfficialGameTime;

				this.setCreateGameTimer(room, database.queuedScriptedGame.time, format, false);
			}
		}
	}

	setOfficialGame(room: Room): void {
		const serverId = Client.getServerId();
		if (!(serverId in this.officialGames) || !(room.id in this.officialGames[serverId])) return;

		delete this.nextOfficialGames[room.id];

		const now = Date.now();
		let nextOfficialIndex = -1;

		for (let i = 0; i < this.officialGames[serverId][room.id].length; i++) {
			if (this.officialGames[serverId][room.id][i].time >= now) {
				nextOfficialIndex = i;
				break;
			}
		}

		if (nextOfficialIndex === -1) return;

		if (nextOfficialIndex > 0) {
			this.officialGames[serverId][room.id] = this.officialGames[serverId][room.id].slice(nextOfficialIndex);
		}

		this.nextOfficialGames[room.id] = this.officialGames[serverId][room.id][0];
		this.setOfficialGameTimer(room);
	}

	setOfficialGameTimer(room: Room): void {
		if (room.id in this.nextOfficialGames) {
			this.setCreateGameTimer(room, this.nextOfficialGames[room.id].time,
				this.getExistingFormat(this.nextOfficialGames[room.id].format), true);
		}
	}

	setCreateGameTimer(room: Room, startTime: number, format: IGameFormat, official?: boolean): void {
		if (room.id in this.scheduledGameTimers) clearTimeout(this.scheduledGameTimers[room.id]);

		let timer = startTime - Date.now();
		if (timer <= 0) timer = this.delayedOfficialGameTime;

		this.scheduledGameTimerData[room.id] = {formatid: format.inputTarget, startTime, official};
		this.scheduledGameTimers[room.id] = setTimeout(() => {
			void (async () => {
				if (room.game) return;
				const game = await global.Games.createGame(room, format, {official});
				if (game) {
					await game.signups();
				}

				delete this.scheduledGameTimers[room.id];
			})();
		}, timer);
	}

	loadFormats(): void {
		const userHostedPath = path.join(Tools.srcBuildFolder, "room-game-user-hosted.js");

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const userHostedModule = require(userHostedPath) as typeof import('./room-game-user-hosted');

		// @ts-expect-error
		this.formatModules.push(userHostedModule);

		// @ts-expect-error
		this.userHosted = userHostedModule.game;

		const internalGameKeys = Object.keys(internalGamePaths) as InternalGame[];
		for (const key of internalGameKeys) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
			const file = require(internalGamePaths[key]);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.formatModules.push(file);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const game = file.game as DeepImmutable<IGameFile> | undefined;
			if (!game) throw new Error("No game exported from " + internalGamePaths[key]);

			let commands;
			if (game.commands) {
				commands = CommandParser.loadCommandDefinitions<ScriptedGame, GameCommandReturnType>(Tools.deepClone(game.commands));
				for (const i in commands) {
					if (i in BaseCommands) {
						throw new Error("Internal game " + game.name + " command '" + i + "' already exists as a regular command.");
					}
					if (!(i in this.commands)) this.commands[i] = commands[i];
				}
			}

			if (game.class.achievements) this.loadFileAchievements(game);

			this.internalFormats[key] = Object.assign({}, game, {commands, id: Tools.toId(game.name)});
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (const fileName of modeFiles) {
			if (!fileName.endsWith('.js')) continue;
			const modePath = path.join(modesDirectory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
			const file = require(modePath);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.formatModules.push(file);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const mode = file.mode as DeepImmutable<IGameModeFile> | undefined;
			if (!mode) throw new Error("No mode exported from " + modePath);

			const id = Tools.toId(mode.name);
			if (id in this.modes) throw new Error("The name '" + mode.name + "' is already used by another mode.");

			if (mode.commands) {
				for (const i in mode.commands) {
					if (i in BaseCommands) {
						throw new Error("Mode " + mode.name + " command '" + i + "' already exists as a regular command.");
					}
					if (!(i in this.commands)) this.commands[i] = mode.commands[i];
				}
			}

			if (mode.aliases) {
				for (const alias of mode.aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in this.modeAliases) {
						throw new Error(mode.name + " mode's alias '" + alias + " is already used by " +
							this.modes[this.modeAliases[aliasId]].name + ".");
					}
					this.modeAliases[aliasId] = id;
				}
			}

			this.modes[id] = Object.assign({}, mode as IGameMode, {id});
		}

		const gameFiles = fs.readdirSync(gamesDirectory);
		for (const fileName of gameFiles) {
			if (!fileName.endsWith('.js')) continue;
			const gamePath = path.join(gamesDirectory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
			const file = require(gamePath);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.formatModules.push(file);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const game = file.game as DeepImmutable<IGameFile> | undefined;
			if (!game) throw new Error("No game exported from " + gamePath);

			const id = Tools.toId(game.name);
			if (id in this.formats) throw new Error("The name '" + game.name + "' is already used by another game.");

			let challengeSettings: GameChallengeSettings | undefined;
			if (game.challengeSettings) {
				challengeSettings = Tools.deepClone(game.challengeSettings);
				for (const gameChallenge of gameChallenges) {
					if (!challengeSettings[gameChallenge]) continue;
					if (challengeSettings[gameChallenge].options) {
						challengeSettings[gameChallenge].options = challengeSettings[gameChallenge].options.map(x => Tools.toId(x));
					}

					if (challengeSettings[gameChallenge].requiredOptions) {
						challengeSettings[gameChallenge].requiredOptions = challengeSettings[gameChallenge].requiredOptions
							.map(x => Tools.toId(x));
					}
				}
			}

			let commands;
			if (game.commands) {
				commands = CommandParser.loadCommandDefinitions<ScriptedGame, GameCommandReturnType>(Tools.deepClone(game.commands));
			}

			let variants;
			if (game.variants) {
				variants = Tools.deepClone(game.variants);
				for (const variant of variants) {
					variant.variantAliases = variant.variantAliases.map(x => Tools.toId(x));
				}
			}

			let modes: string[] | undefined;
			if (game.modes) {
				modes = [];
				for (const mode of game.modes) {
					const modeId = Tools.toId(mode);
					if (!(modeId in this.modes)) throw new Error(game.name + "'s mode '" + mode + "' is not a valid mode.");
					modes.push(modeId);
				}
			}

			if (game.class.achievements) this.loadFileAchievements(game);

			this.formats[id] = Object.assign({}, game, {challengeSettings, commands, id, modes, variants});
		}

		for (const format of this.userHosted.formats) {
			const id = Tools.toId(format.name);
			if (id in this.userHostedFormats) {
				throw new Error("The name '" + format.name + "' is already used by another user-hosted format.");
			}

			if (format.aliases) {
				for (const alias of format.aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in this.userHostedFormats) {
						throw new Error(format.name + "'s alias '" + alias + "' is the name of another user-hosted format.");
					}
					if (aliasId in this.userHostedAliases) {
						throw new Error(format.name + "'s alias '" + alias + "' is already an alias for " +
							this.userHostedAliases[aliasId] + ".");
					}
					this.userHostedAliases[aliasId] = format.name;
				}
			}

			this.userHostedFormats[id] = Object.assign({}, format, {
				class: this.userHosted.class,
				id,
			});
		}

		for (const formatId in this.formats) {
			const format = this.formats[formatId];

			if (format.mascot && format.mascots) throw new Error(format.name + " has both a single and randomized mascots.");
			if (format.mascots && !format.mascotPrefix) {
				throw new Error(format.name + " has randomized mascots so it needs a mascotPrefix.");
			}

			const idsToAlias: string[] = [format.id];
			if (format.formerNames) {
				for (const formerName of format.formerNames) {
					const id = Tools.toId(formerName);
					if (id in this.formats) {
						throw new Error(format.name + "'s former name '" + formerName + "' is already used by another game.");
					}
					if (id in this.aliases) {
						throw new Error(format.name + "'s former name '" + formerName + "' is already an alias for " +
							this.aliases[id] + ".");
					}
					this.aliases[id] = format.name;
					idsToAlias.push(id);
				}
			}

			if (format.aliases) {
				for (const alias of format.aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in this.aliases) {
						throw new Error(format.name + "'s alias '" + alias + "' is already an alias for " + this.aliases[aliasId] + ".");
					}
					this.aliases[aliasId] = format.name;
					idsToAlias.push(aliasId);
				}
			}

			if (format.commands) {
				for (const command in format.commands) {
					if (command in BaseCommands) {
						throw new Error(format.name + " command '" + command + "' already exists as a regular command.");
					}
					if (!(command in this.commands)) this.commands[command] = format.commands[command];
				}
			}

			if (format.minigameCommand) {
				const command = Tools.toId(format.minigameCommand);
				if (command in this.minigameCommandNames) {
					throw new Error(format.name + "'s minigame command '" + format.minigameCommand + "' is already a minigame command " +
						"for " + this.minigameCommandNames[command].format + ".");
				}
				this.minigameCommandNames[command] = {aliases: format.minigameCommandAliases ?
					format.minigameCommandAliases.map(x => Tools.toId(x)) : [], format: format.name};
			}

			if (format.variants) {
				for (const variant of format.variants) {
					const variantId = Tools.toId(variant.name);
					if (variantId in this.aliases) {
						throw new Error(format.name + "'s variant '" + variant.name + "' is already an alias for " +
							this.aliases[variantId] + ".");
					}

					for (const variantAlias of variant.variantAliases) {
						for (const id of idsToAlias) {
							const aliases = [id + variantAlias, variantAlias + id];
							for (const alias of aliases) {
								if (alias in this.aliases) {
									throw new Error(variant.name + "'s variant alias '" + variantId + "' clashes " +
										"with the alias for " + this.aliases[alias] + ".");
								}

								this.aliases[alias] = format.id + "," + variantAlias;
							}
						}
					}

					if (variant.aliases) {
						for (const alias of variant.aliases) {
							const aliasId = Tools.toId(alias);
							if (aliasId in this.aliases) {
								throw new Error(format.name + "'s variant alias '" + alias + "' is already an alias for " +
									this.aliases[aliasId] + ".");
							}
							this.aliases[aliasId] = format.id + "," + variant.variantAliases[0];
						}
					}
				}
			}

			if (format.modes) {
				for (const mode of format.modes) {
					const modeAliases: string[] = [mode];
					for (const i in this.modeAliases) {
						if (this.modeAliases[i] === mode) modeAliases.push(i);
					}

					for (const modeAlias of modeAliases) {
						for (const id of idsToAlias) {
							const aliases = [id + modeAlias, modeAlias + id];
							for (const alias of aliases) {
								if (alias in this.aliases) {
									throw new Error(format.name + "'s mode alias '" + alias + "' clashes " +
										"with the alias for " + this.aliases[alias] + ".");
								}

								this.aliases[alias] = format.id + "," + mode;
							}
						}
					}
				}
			}

			if (format.freejoin) {
				this.freejoinFormatTargets.push(format.id);
			} else if (format.defaultOptions && format.defaultOptions.includes('freejoin')) {
				this.freejoinFormatTargets.push(format.id + ",freejoin");
			}
		}

		for (const modeId in this.modes) {
			const mode = this.modes[modeId];
			if (mode.commands) {
				for (const command in mode.commands) {
					if (!(command in this.commands)) this.commands[command] = mode.commands[command];
				}
			}
		}

		this.loadFormatCommands();
	}

	loadFormatCommands(): void {
		for (const i in this.commands) {
			Commands[i] = {
				command(target, room, user, command, timestamp) {
					let returnedResult: boolean = false;
					if (this.isPm(room)) {
						if (user.game) {
							const result = user.game.tryCommand(target, user, user, command, timestamp);
							if (result) returnedResult = result;
						} else {
							const games: ScriptedGame[] = [];
							user.rooms.forEach((value, userRoom) => {
								if (userRoom.game) {
									if (!games.includes(userRoom.game)) games.push(userRoom.game);
								}
								if (userRoom.tournament && userRoom.tournament.battleRoomGame) {
									if (!games.includes(userRoom.tournament.battleRoomGame)) games.push(userRoom.tournament.battleRoomGame);
								}
								if (userRoom.searchChallenge) {
									if (!games.includes(userRoom.searchChallenge)) games.push(userRoom.searchChallenge);
								}
							});

							for (const game of games) {
								const result = game.tryCommand(target, user, user, command, timestamp);
								if (result) returnedResult = result;
							}
						}
					} else {
						const games: ScriptedGame[] = [];
						if (room.game) {
							if (!games.includes(room.game)) games.push(room.game);
						}
						if (room.tournament && room.tournament.battleRoomGame) {
							if (!games.includes(room.tournament.battleRoomGame)) games.push(room.tournament.battleRoomGame);
						}
						if (room.searchChallenge) {
							if (!games.includes(room.searchChallenge)) games.push(room.searchChallenge);
						}

						for (const game of games) {
							const result = game.tryCommand(target, room, user, command, timestamp);
							if (result) returnedResult = result;
						}
					}

					return returnedResult;
				},
			};
		}

		for (const name in this.minigameCommandNames) {
			const formatName = this.minigameCommandNames[name].format;
			if (name in BaseCommands) throw new Error(formatName + " minigame command '" + name + "' is already a command.");

			Commands[name] = {
				command(target, room, user) {
					let pmRoom: Room | undefined;
					if (this.isPm(room)) {
						if (room.game) return;

						user.rooms.forEach((rank, userRoom) => {
							if (!pmRoom && Config.allowScriptedGames && Config.allowScriptedGames.includes(userRoom.id) &&
								Users.self.hasRank(userRoom, 'bot')) {
								pmRoom = userRoom;
							}
						});

						if (!pmRoom) return this.say(CommandParser.getErrorText(['noPmGameRoom']));
					} else {
						if (!global.Games.canUseRestrictedCommand(room, user) || room.game || room.userHostedGame ||
							!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) return;
						if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
						const remainingGameCooldown = global.Games.getRemainingGameCooldown(room, true);
						if (remainingGameCooldown > 1000) {
							const durationString = Tools.toDurationString(remainingGameCooldown);
							this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the " +
								"minigame cooldown remaining.");
							return;
						}
					}

					const format = global.Games.getFormat(formatName + (target ? "," + target : ""), true);
					if (Array.isArray(format)) return this.sayError(format);
					if (format.mode) return this.say("Minigames cannot be played in modes.");

					delete format.resolvedInputProperties.options.points;
					format.minigameCreator = user.id;

					void (async () => {
						const game = await global.Games.createGame(room, format, {pmRoom, minigame: true});
						if (game) await game.signups();
					})();
				},
			};

			for (const alias of this.minigameCommandNames[name].aliases) {
				if (alias in BaseCommands) throw new Error(formatName + " minigame command alias '" + alias + "' is already a command.");
				Commands[alias] = Commands[name];
			}
		}
	}

	getFormatMascot(format: IGameFormat): IPokemonCopy | undefined {
		if (format.mascot) {
			return Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			return Dex.getPokemonCopy(Tools.sampleOne(format.mascots));
		}
	}

	getFormatMascotPrefix(format: IGameFormat | IUserHostedFormat): string {
		if (format.mascotPrefix) return format.mascotPrefix;

		if (format.mascot) {
			const mascot = Dex.getExistingPokemon(format.mascot);
			if (mascot.name.endsWith('s')) return mascot.name + "'";
			return mascot.name + "'s";
		}

		return "";
	}

	/**
	 * Returns a copy of the format
	 */
	getFormat(inputTarget: string, checkDisabled?: boolean): IGameFormat | CommandErrorArray {
		const targets = inputTarget.split(",");
		const name = targets[0];
		targets.shift();
		const id = Tools.toId(name);
		if (id in this.aliases) return this.getFormat(this.aliases[id] + (targets.length ? "," + targets.join(",") : ""), checkDisabled);
		if (!(id in this.formats)) return ['invalidGameFormat', name];
		if (checkDisabled && this.formats[id].disabled) return ['disabledGameFormat', this.formats[id].name];

		const formatData = Tools.deepClone(this.formats[id]);
		const inputOptions: IGameOptions = {};
		let mode: IGameMode | undefined;
		let variant: IGameVariant | undefined;
		for (const target of targets) {
			const targetId = Tools.toId(target);
			if (!targetId) continue;
			if (formatData.modes) {
				const modeId = (targetId in this.modeAliases ? this.modeAliases[targetId] : targetId) as GameMode;
				if (formatData.modes.includes(modeId)) {
					if (mode) return ['tooManyGameModes'];
					mode = this.modes[modeId];
					continue;
				}
			}
			if (formatData.variants) {
				let matchingVariant: IGameVariant | undefined;
				// eslint-disable-next-line @typescript-eslint/prefer-for-of
				for (let i = 0; i < formatData.variants.length; i++) {
					if (formatData.variants[i].variantAliases.includes(targetId)) {
						matchingVariant = formatData.variants[i];
						break;
					}
				}
				if (matchingVariant) {
					if (variant) return ['tooManyGameVariants'];
					variant = matchingVariant;
					continue;
				}
			}

			const option = target.trim();
			let optionName = '';
			let optionValue = '' as string | number;
			if (option.includes(":")) {
				const parts = option.split(":");
				optionName = Tools.toId(parts[0]);
				optionValue = parts[1].trim();
			} else {
				const optionId = Tools.toId(option);
				if (optionId === 'freejoin' || optionId === 'fj') {
					optionName = 'freejoin';
					optionValue = "1";
				} else {
					const firstSpaceIndex = option.indexOf(" ");
					if (firstSpaceIndex !== -1) {
						const lastSpaceIndex = option.lastIndexOf(" ");
						optionName = option.substr(0, firstSpaceIndex);
						if (Tools.isInteger(optionName)) {
							optionValue = optionName;
							optionName = option.substr(firstSpaceIndex + 1);
						} else {
							if (lastSpaceIndex !== firstSpaceIndex) {
								optionName = option.substr(0, lastSpaceIndex);
								optionValue = option.substr(lastSpaceIndex + 1);
							} else {
								optionValue = option.substr(firstSpaceIndex + 1);
							}
						}
						optionName = Tools.toId(optionName);
					}
				}
			}

			if (!optionName) return ['invalidGameOption', option];

			if (optionName === 'firstto') optionName = 'points';
			if (optionName === 'points' && mode && (mode.id === 'collectiveteam' || mode.id === 'spotlightteam')) optionName = 'teamPoints';

			if (numberGameOptions.includes(optionName as GameNumberOptions)) {
				optionValue = parseInt(optionValue as string);
				if (isNaN(optionValue)) return ['invalidGameOption', option];
			}

			inputOptions[optionName] = optionValue;
		}

		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions,
			inputTarget,
			mode,
			nameWithOptions: '',
			variant,
		};

		const challengeSettings: GameChallengeSettings = formatData.challengeSettings || {};
		let customizableNumberOptions: Dict<IGameNumberOptionValues> = formatData.customizableNumberOptions || {};
		let defaultOptions: DefaultGameOption[] = formatData.defaultOptions || [];
		if (variant) {
			if (variant.challengeSettings) Object.assign(challengeSettings, variant.challengeSettings);
			if (variant.customizableNumberOptions) customizableNumberOptions = variant.customizableNumberOptions;
			if (variant.defaultOptions) defaultOptions = variant.defaultOptions;
		}

		const format = Object.assign(formatData, formatComputed,
			{challengeSettings, customizableNumberOptions, defaultOptions}) as IGameFormat;

		if (variant) Object.assign(format, variant);

		format.resolvedInputProperties = ScriptedGame.resolveInputProperties(format, mode, variant);

		if (inputOptions.points && !format.freejoin && !format.resolvedInputProperties.options.freejoin) {
			return ['gameOptionRequiresFreejoin', format.nameWithOptions];
		}

		if (format.resolvedInputProperties.description) format.description = format.resolvedInputProperties.description;
		if (format.resolvedInputProperties.defaultOptions) format.defaultOptions = format.resolvedInputProperties.defaultOptions;

		return format;
	}

	getExistingFormat(target: string): IGameFormat {
		const format = this.getFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	getFormatList(filter?: ((format: IGameFormat) => boolean)): IGameFormat[] {
		const formats: IGameFormat[] = [];
		for (const i in this.formats) {
			const format = this.getExistingFormat(i);
			if (format.disabled || format.tournamentGame || format.searchChallenge || (filter && !filter(format))) continue;
			formats.push(format);
		}

		return formats;
	}

	getTournamentFormatList(): IGameFormat[] {
		const formats: IGameFormat[] = [];
		for (const i in this.formats) {
			const format = this.getExistingFormat(i);
			if (format.disabled || !format.tournamentGame) continue;
			formats.push(format);
		}

		return formats;
	}

	getSearchChallengeList(): IGameFormat[] {
		const formats: IGameFormat[] = [];
		for (const i in this.formats) {
			const format = this.getExistingFormat(i);
			if (format.disabled || !format.searchChallenge) continue;
			formats.push(format);
		}

		return formats;
	}

	getLeastPlayedFormats(room: Room, formatList?: IGameFormat[]): IGameFormat[] {
		const database = Storage.getDatabase(room);
		const lastGameFormatTimes = database.lastGameFormatTimes || {};

		return (formatList || this.getFormatList()).sort((a, b) => {
			const lastGameA = lastGameFormatTimes[a.id] || 0;
			const lastGameB = lastGameFormatTimes[b.id] || 0;
			return lastGameA - lastGameB;
		});
	}

	/**
	 * Returns a copy of the format
	 */
	getUserHostedFormat(inputTarget: string, user?: User): IUserHostedFormat | CommandErrorArray {
		const targets = inputTarget.split(",");
		const name = targets[0];
		targets.shift();
		const id = Tools.toId(name);
		if (id in this.userHostedAliases) {
			return this.getUserHostedFormat(this.userHostedAliases[id] + (targets.length ? "," + targets.join(",") : ""), user);
		}

		let formatData: IUserHostedComputed | undefined;
		if (id in this.userHostedFormats) {
			formatData = Tools.deepClone(this.userHostedFormats[id]);
		} else {
			const scriptedFormat = this.getFormat(id + (targets.length ? "," + targets.join(",") : ""));
			if (Array.isArray(scriptedFormat)) {
				if (scriptedFormat[0] !== 'invalidGameFormat') return scriptedFormat;
			} else if (!scriptedFormat.scriptedOnly) {
				formatData = Object.assign(Tools.deepClone(scriptedFormat), {
					class: this.userHosted.class,
					commands: null,
					commandDescriptions: null,
					mode: null,
				});
			}
		}
		if (!formatData) return ['invalidUserHostedGameFormat', name];

		let teamGame = false;
		for (const target of targets) {
			const targetId = Tools.toId(target);
			if (targetId === 'freejoin' || targetId === 'fj') {
				formatData.freejoin = true;
			} else if (targetId === 'team' || targetId === 'teams') {
				if (!formatData.teamGame) teamGame = true;
			} else if (formatData.customizableAttributes) {
				const colonIndex = target.indexOf(':');
				if (colonIndex === -1) continue;

				const attribute = Tools.toId(target.substr(0, colonIndex)) as UserHostedCustomizable;
				if (!formatData.customizableAttributes.includes(attribute)) continue;

				const value = target.substr(colonIndex + 1).trim();
				if (attribute === 'link') {
					if (!value.startsWith('https://')) return ['invalidHttpsLink'];
				}

				if (value) {
					formatData[attribute] = value;
				}
			}
		}

		if (teamGame) {
			formatData.name = "Team " + formatData.name;
			if (formatData.freejoin) formatData.freejoin = false;
		}

		const formatComputed: IUserHostedFormatComputed = {
			effectType: "UserHostedFormat",
			inputTarget,
			nameWithOptions: '',
		};

		return Object.assign(formatData, formatComputed);
	}

	getExistingUserHostedFormat(target: string): IUserHostedFormat {
		const format = this.getUserHostedFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	getInternalFormat(id: InternalGame): IGameFormat | CommandErrorArray {
		if (this.internalFormats[id].disabled) return ['disabledGameFormat', this.internalFormats[id].name];

		const formatData = Tools.deepClone(this.internalFormats[id]);
		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions: {},
			inputTarget: id,
			nameWithOptions: '',
		};

		const format = Object.assign(formatData, formatComputed, {customizableNumberOptions: formatData.customizableNumberOptions || {},
			defaultOptions: formatData.defaultOptions || []}) as IGameFormat;

		format.resolvedInputProperties = ScriptedGame.resolveInputProperties(format, undefined, undefined);

		return format;
	}

	getExistingInternalFormat(id: InternalGame): IGameFormat {
		const format = this.getInternalFormat(id);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	setLastGame(room: Room, time: number): void {
		this.lastGames[room.id] = time;
	}

	setLastMinigame(room: Room, time: number): void {
		this.lastMinigames[room.id] = time;
	}

	setLastScriptedGame(room: Room, time: number): void {
		this.lastScriptedGames[room.id] = time;
	}

	setLastUserHostedGame(room: Room, time: number): void {
		this.lastUserHostedGames[room.id] = time;
	}

	setLastUserHostTime(room: Room, hostId: string, time: number): void {
		if (!(room.id in this.lastUserHostTimes)) this.lastUserHostTimes[room.id] = {};
		this.lastUserHostTimes[room.id][hostId] = time;
	}

	setLastWinners(room: Room, winners: readonly string[]): void {
		this.lastWinners[room.id] = winners.slice();
	}

	removeLastUserHostTime(room: Room, hostId: string): void {
		if (room.id in this.lastUserHostTimes) delete this.lastUserHostTimes[room.id][hostId];
	}

	setLastUserHostFormatTime(room: Room, formatId: string, time: number): void {
		if (!(room.id in this.lastUserHostFormatTimes)) this.lastUserHostFormatTimes[room.id] = {};
		this.lastUserHostFormatTimes[room.id][formatId] = time;
	}

	setLastChallengeTime(challenge: GameChallenge, room: Room, userid: string, time: number): void {
		if (!(room.id in this.lastChallengeTimes[challenge])) this.lastChallengeTimes[challenge][room.id] = {};
		this.lastChallengeTimes[challenge][room.id][userid] = time;
	}

	getRemainingGameCooldown(room: Room, isMinigame?: boolean): number {
		const now = Date.now();
		if (Config.gameCooldownTimers && room.id in Config.gameCooldownTimers && room.id in this.lastGames) {
			let cooldown = Config.gameCooldownTimers[room.id] * 60 * 1000;
			if (isMinigame) cooldown /= 2;
			return cooldown - (now - this.lastGames[room.id]);
		}

		if (isMinigame && Config.minigameCooldownTimers && room.id in Config.minigameCooldownTimers && room.id in this.lastMinigames) {
			return (Config.minigameCooldownTimers[room.id] * 1000) - (now - this.lastMinigames[room.id]);
		}

		return 0;
	}

	getRemainingTournamentGameCooldown(room: Room): number {
		const now = Date.now();
		if (Config.tournamentGameCooldownTimers && room.id in Config.tournamentGameCooldownTimers && room.id in this.lastGames) {
			return (Config.tournamentGameCooldownTimers[room.id] * 60 * 1000) - (now - this.lastGames[room.id]);
		}

		return 0;
	}

	getRemainingUserHostCooldown(room: Room, hostId: string): number {
		const now = Date.now();
		if (Config.userHostCooldownTimers && room.id in Config.userHostCooldownTimers && room.id in this.lastUserHostTimes &&
			hostId in this.lastUserHostTimes[room.id]) {
			return (Config.userHostCooldownTimers[room.id] * 60 * 1000) - (now - this.lastUserHostTimes[room.id][hostId]);
		}

		return 0;
	}

	getRemainingUserHostFormatCooldown(room: Room, formatId: string): number {
		const now = Date.now();
		if (Config.userHostFormatCooldownTimers && room.id in Config.userHostFormatCooldownTimers &&
			room.id in this.lastUserHostFormatTimes && formatId in this.lastUserHostFormatTimes[room.id]) {
			return (Config.userHostFormatCooldownTimers[room.id] * 60 * 1000) - (now - this.lastUserHostFormatTimes[room.id][formatId]);
		}

		return 0;
	}

	requiresScriptedGame(room: Room): boolean {
		if (Config.disallowRepeatUserHostedGames && Config.disallowRepeatUserHostedGames.includes(room.id) &&
			room.id in this.lastUserHostedGames && (!(room.id in this.lastScriptedGames) ||
			this.lastUserHostedGames[room.id] > this.lastScriptedGames[room.id])) {
			return true;
		}
		return false;
	}

	canUseRestrictedCommand(room: Room, user: User, infoCommand?: boolean): boolean {
		if (user.hasRank(room, infoCommand ? 'star' : 'voice')) return true;

		const database = Storage.getDatabase(room);
		if (database.gameManagers && database.gameManagers.includes(user.id)) return true;

		return false;
	}

	canCreateGame(room: Room, format: IGameFormat): true | string {
		if (format.disabled) return CommandParser.getErrorText(['disabledGameFormat', format.name]);

		if (format.tournamentGame && (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id))) {
			return CommandParser.getErrorText(['disabledTournamentGameFeatures', room.title]);
		}

		if (format.searchChallenge && (!Config.allowSearchChallenges || !Config.allowSearchChallenges.includes(room.id))) {
			return CommandParser.getErrorText(['disabledSearchChallengeFeatures', room.title]);
		}

		const database = Storage.getDatabase(room);
		const pastGames = database.pastGames || [];

		if (Config.disallowCreatingPastGames && Config.disallowCreatingPastGames.includes(room.id) &&
			this.isInPastGames(room, format.inputTarget, pastGames)) {
			return format.name + " is on the past games list.";
		}

		if (Config.disallowCreatingPreviousUserHostedGame && Config.disallowCreatingPreviousUserHostedGame.includes(room.id)) {
			if (database.pastUserHostedGames && database.pastUserHostedGames.length) {
				const pastUserHostedFormat = this.getUserHostedFormat(database.pastUserHostedGames[0].inputTarget);
				const id = Array.isArray(pastUserHostedFormat) ? Tools.toId(database.pastUserHostedGames[0].name) : pastUserHostedFormat.id;
				if (id === format.id) return format.name + " was the last user-hosted game.";
			}
		}

		if (database.userHostedGameQueue && database.userHostedGameQueue.length) {
			const userHostedFormat = this.getUserHostedFormat(database.userHostedGameQueue[0].format);
			if (!Array.isArray(userHostedFormat) && userHostedFormat.id === format.id) {
				return format.name + " is the next user-hosted game.";
			}
		}

		const limitModes = format.mode && Config.limitGamesByMode && Config.limitGamesByMode.includes(room.id) ? true : false;
		const limitCategories = format.category && Config.limitGamesByCategory && Config.limitGamesByCategory.includes(room.id) ? true :
			false;
		let pastGameCategory = false;
		let pastGameMode = '';
		let categoryGamesBetween = 0;

		for (let i = pastGames.length - 1; i >= 0; i--) {
			const pastFormat = this.getFormat(pastGames[i].inputTarget);
			if (Array.isArray(pastFormat)) {
				if (format.category) categoryGamesBetween++;
				continue;
			}

			if (limitModes && format.mode && pastFormat.mode) {
				const formatModeId = format.mode.cooldownId || format.mode.id;
				const pastFormatModeId = pastFormat.mode.cooldownId || pastFormat.mode.id;
				if (formatModeId === pastFormatModeId) {
					pastGameMode = format.mode.cooldownName || pastFormat.mode.cooldownName || this.modes[pastFormatModeId].name;
					break;
				}
			}

			if (limitCategories) {
				if (pastFormat.category === format.category) {
					pastGameCategory = true;
					categoryGamesBetween = 0;
				} else {
					categoryGamesBetween++;
				}
			}
		}

		if (pastGameMode) {
			return "There is another " + pastGameMode + "-mode game on the past games list.";
		}

		const categoryCooldown = Config.gameCategoryCooldowns && room.id in Config.gameCategoryCooldowns ?
			Config.gameCategoryCooldowns[room.id] : DEFAULT_CATEGORY_COOLDOWN;
		if (pastGameCategory && categoryGamesBetween < categoryCooldown) {
			const remainingGames = categoryCooldown - categoryGamesBetween;
			return remainingGames + " more game" + (remainingGames > 1 ? "s" : "") + " must be played before another " + format.category +
				" game.";
		}

		return true;
	}

	isInPastGames(room: Room, input: string, pastGames?: IPastGame[]): boolean {
		if (!pastGames) {
			const database = Storage.getDatabase(room);
			if (!database.pastGames) return false;
			pastGames = database.pastGames;
		}

		const format = this.getFormat(input);
		const formatId = Array.isArray(format) ? Tools.toId(input) : format.id;

		for (const pastGame of pastGames) {
			const pastFormat = this.getFormat(pastGame.inputTarget);
			const id = Array.isArray(pastFormat) ? Tools.toId(pastGame.name) : pastFormat.id;
			if (formatId === id) return true;
		}

		return false;
	}

	async createGame(room: Room | User, format: IGameFormat, options?: ICreateGameOptions): Promise<ScriptedGame | undefined> {
		const minigame = options && options.minigame;
		const official = options && options.official;
		if (!minigame) this.clearAutoCreateTimer(room as Room);

		if (format.class.loadData && !format.class.loadedData) {
			if (format.nonTrivialLoadData) {
				room.say("Loading data for " + Users.self.name + "'s first " + format.name + " game since updating...");
			}
			await format.class.loadData(room);
			format.class.loadedData = true;
		}

		const game = new format.class(room, options ? options.pmRoom : undefined, options ? options.initialSeed : undefined);
		if (minigame) game.isMiniGame = true;
		if (official) game.official = true;

		// prevent duplicate games while loading data
		if (!(room as Room).userHostedGame && (!room.game || (options && options.childGame)) && game.initialize(format)) {
			if (minigame) {
				if (format.resolvedInputProperties.options.points) format.resolvedInputProperties.options.points = 1;
				if (!format.freejoin && format.resolvedInputProperties.customizableNumberOptions &&
					'freejoin' in format.resolvedInputProperties.customizableNumberOptions) {
					format.resolvedInputProperties.options.freejoin = 1;
				}
			}

			room.game = game;

			if (Config.onScriptedGameCreate && !game.isPmActivity(room)) Config.onScriptedGameCreate(room, format, official);
			return room.game;
		} else {
			if (!game.ended) game.deallocate(true);
		}
	}

	async createChildGame(format: IGameFormat, parentGame: ScriptedGame): Promise<ScriptedGame | undefined> {
		const childGame = await this.createGame(parentGame.room, format, {
			childGame: true,
			pmRoom: parentGame.pmRoom,
			initialSeed: parentGame.prng.seed.slice() as PRNGSeed,
		});

		if (childGame) {
			childGame.canLateJoin = false;
			childGame.parentGame = parentGame;

			parentGame.room.game = childGame;
		}

		return childGame;
	}

	createUserHostedGame(room: Room, format: IUserHostedFormat, host: User | string, noControlPanel?: boolean): UserHostedGame {
		this.clearAutoCreateTimer(room);

		room.userHostedGame = new format.class(room);
		room.userHostedGame.initialize(format);
		room.userHostedGame.setHost(host, noControlPanel);

		if (!(room.id in this.lastUserHostTimes)) this.lastUserHostTimes[room.id] = {};
		if (typeof host === 'string') {
			this.lastUserHostTimes[room.id][Tools.toId(host)] = Date.now();
		} else {
			this.lastUserHostTimes[room.id][host.id] = Date.now();
		}

		return room.userHostedGame;
	}

	async createSearchChallenge(room: Room, format: IGameFormat, pmRoom?: Room, initialSeed?: PRNGSeed): Promise<ScriptedGame> {
		if (format.class.loadData && !format.class.loadedData) {
			if (format.nonTrivialLoadData) {
				room.say("Loading data for " + Users.self.name + "'s first " + format.name + " game since updating...");
			}
			await format.class.loadData(room);
			format.class.loadedData = true;
		}

		// prevent duplicate challenges while loading data
		if (!room.searchChallenge) {
			room.searchChallenge = new format.class(room, pmRoom, initialSeed) as SearchChallenge;
			room.searchChallenge.initialize(format);
		}

		return room.searchChallenge;
	}

	disableFormat(format: IGameFormat): void {
		if (format.id in this.formats) {
			// @ts-expect-error
			this.formats[format.id].disabled = true;
		}
	}

	enableFormat(format: IGameFormat): void {
		if (format.id in this.formats) {
			// @ts-expect-error
			this.formats[format.id].disabled = false;
		}
	}

	disableInternalFormat(key: InternalGame): void {
		// @ts-expect-error
		this.internalFormats[key].disabled = true;
	}

	enableInternalFormat(key: InternalGame): void {
		// @ts-expect-error
		this.internalFormats[key].disabled = false;
	}

	canSkipScriptedCooldown(room: Room, previousGameDuration: number): boolean {
		if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id) || this.reloadInProgress) return false;
		return !(room.id in this.skippedScriptedCooldowns) && previousGameDuration <= SKIP_SCRIPTED_COOLDOWN_DURATION;
	}

	skipScriptedCooldown(room: Room): void {
		this.skippedScriptedCooldowns[room.id] = true;
		this.setAutoCreateTimer(room, 'scripted', SKIPPED_SCRIPTED_COOLDOW_TIMER);
	}

	clearSkippedScriptedCooldown(room: Room): void {
		delete this.skippedScriptedCooldowns[room.id];
	}

	banFromNextVote(room: Room, format: IGameFormat): void {
		if (!(room.id in this.nextVoteBans)) this.nextVoteBans[room.id] = [];
		this.nextVoteBans[room.id].push(format.inputTarget);
	}

	getNextVoteBans(room: Room): string[] {
		const bans: string[] = [];
		if (room.id in this.nextVoteBans) {
			for (const inputTarget of this.nextVoteBans[room.id]) {
				const format = this.getFormat(inputTarget);
				if (!Array.isArray(format)) bans.push(format.name);
			}
		}
		return bans;
	}

	clearNextVoteBans(room: Room): void {
		delete this.nextVoteBans[room.id];
	}

	setAutoCreateTimer(room: Room, type: AutoCreateTimerType, timer: number): void {
		this.clearAutoCreateTimer(room);

		this.autoCreateTimerData[room.id] = {endTime: Date.now() + timer, type};
		this.autoCreateTimers[room.id] = setTimeout(() => {
			if (global.Games.isReloadInProgress() || (room.game && room.game.isMiniGame)) {
				this.setAutoCreateTimer(room, type, 5 * 1000);
				return;
			}

			delete this.autoCreateTimerData[room.id];
			const database = Storage.getDatabase(room);
			const now = Date.now();
			if (type === 'tournament') {
				let gameTarget = "";
				const leastPlayedFormats = this.getLeastPlayedFormats(room, this.getTournamentFormatList());
				for (const leastPlayedFormat of leastPlayedFormats) {
					if (this.canCreateGame(room, leastPlayedFormat) === true) {
						gameTarget = leastPlayedFormat.name;
						break;
					}
				}

				CommandParser.parse(room, Users.self,
					Config.commandCharacter + (gameTarget ? "createtournamentgame " + gameTarget : "createrandomtournamentgame"), now);
			} else if (type === 'scripted' || !database.userHostedGameQueue || !database.userHostedGameQueue.length) {
				CommandParser.parse(room, Users.self, Config.commandCharacter + "startskippedcooldownvote", now);
			} else if (type === 'userhosted') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				CommandParser.parse(room, Users.self, Config.commandCharacter + "nexthost", now);
			}
		}, timer);
	}

	setGameCooldownMessageTimer(room: Room, minigameCooldownMinutes: number, timer?: number): void {
		if (!timer) timer = minigameCooldownMinutes * 60 * 1000;

		this.gameCooldownMessageTimerData[room.id] = {endTime: Date.now() + timer, minigameCooldownMinutes};
		this.gameCooldownMessageTimers[room.id] = setTimeout(() => {
			delete this.gameCooldownMessageTimerData[room.id];
			delete this.gameCooldownMessageTimers[room.id];
			room.say("The cooldown timer is halfway over! Minigames can be played during the remaining time.");
		}, timer);
	}

	/** Returns a list of standard abilities for games
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean, gen?: number): readonly IAbility[] {
		if (!gen) gen = Dex.getGen();
		const mod = 'gen' + gen;
		if (!Object.prototype.hasOwnProperty.call(this.abilitiesLists, mod)) {
			const baseList = Dex.getDex(mod).getAbilitiesList();
			const list: IAbility[] = [];
			for (const ability of baseList) {
				if (!ability.name) continue;
				list.push(ability);
			}
			this.abilitiesLists[mod] = list;
		}

		if (!filter) return this.abilitiesLists[mod];

		const filteredList: IAbility[] = [];
		for (const ability of this.abilitiesLists[mod]) {
			if (!filter(ability)) continue;
			filteredList.push(ability);
		}

		return filteredList;
	}

	/** Returns a list of copied standard abilities for games
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesCopyList(filter?: (ability: IAbility) => boolean, gen?: number): IAbilityCopy[] {
		if (!gen) gen = Dex.getGen();
		const dex = Dex.getDex('gen' + gen);
		return this.getAbilitiesList(filter, gen).map(x => dex.getAbilityCopy(x));
	}

	/** Returns a list of standard items for games
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean, gen?: number): readonly IItem[] {
		if (!gen) gen = Dex.getGen();
		const mod = 'gen' + gen;
		if (!Object.prototype.hasOwnProperty.call(this.itemsLists, mod)) {
			const baseList = Dex.getDex(mod).getItemsList();
			const list: IItem[] = [];
			for (const item of baseList) {
				if (!item.name || (item.id.substr(0, 2) === 'tr' && !isNaN(parseInt(item.id.substr(2))))) continue;
				list.push(item);
			}
			this.itemsLists[mod] = list;
		}

		if (!filter) return this.itemsLists[mod];

		const filteredList: IItem[] = [];
		for (const item of this.itemsLists[mod]) {
			if (!filter(item)) continue;
			filteredList.push(item);
		}

		return filteredList;
	}

	/** Returns a list of copied standard items for games
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsCopyList(filter?: (item: IItem) => boolean, gen?: number): IItemCopy[] {
		if (!gen) gen = Dex.getGen();
		const dex = Dex.getDex('gen' + gen);
		return this.getItemsList(filter, gen).map(x => dex.getItemCopy(x));
	}

	/** Returns a list of standard moves for games
	 *
	 * filterItem: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean, gen?: number): readonly IMove[] {
		if (!gen) gen = Dex.getGen();
		const mod = 'gen' + gen;
		if (!Object.prototype.hasOwnProperty.call(this.movesLists, mod)) {
			const baseList = Dex.getDex(mod).getMovesList();
			const list: IMove[] = [];
			for (const move of baseList) {
				if (!move.name) continue;
				list.push(move);
			}
			this.movesLists[mod] = list;
		}

		if (!filter) return this.movesLists[mod];

		const filteredList: IMove[] = [];
		for (const move of this.movesLists[mod]) {
			if (!filter(move)) continue;
			filteredList.push(move);
		}

		return filteredList;
	}

	/** Returns a list of copied standard moves for games
	 *
	 * filterItem: Return `false` to filter `move` out of the list
	 */
	getMovesCopyList(filter?: (move: IMove) => boolean, gen?: number): IMoveCopy[] {
		if (!gen) gen = Dex.getGen();
		const dex = Dex.getDex('gen' + gen);
		return this.getMovesList(filter, gen).map(x => dex.getMoveCopy(x));
	}

	/** Returns a list of standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(options?: IPokemonListOptions): readonly IPokemon[] {
		if (!options) options = {};

		const currentGen = Dex.getGen();
		if (!options.gen) options.gen = currentGen;

		const mod = 'gen' + options.gen;
		if ((options.obtainable && !Object.prototype.hasOwnProperty.call(this.pokemonLists, mod)) ||
			(!options.obtainable && !Object.prototype.hasOwnProperty.call(this.nationalDexPokemonLists, mod))) {
			const baseList = Dex.getDex(mod).getPokemonList(!options.obtainable && options.gen === currentGen);
			const list: IPokemon[] = [];
			for (const pokemon of baseList) {
				if (!pokemon.name) continue;
				list.push(pokemon);
			}

			if (options.obtainable) {
				this.pokemonLists[mod] = list;
			} else {
				this.nationalDexPokemonLists[mod] = list;
			}
		}

		const list = options.obtainable ? this.pokemonLists[mod] : this.nationalDexPokemonLists[mod];
		if (!options.filter) return list;

		const filteredList: IPokemon[] = [];
		for (const pokemon of list) {
			if (!options.filter(pokemon)) continue;
			filteredList.push(pokemon);
		}

		return filteredList;
	}

	/** Returns a list of copied standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(options?: IPokemonListOptions): IPokemonCopy[] {
		if (!options) options = {};
		if (!options.gen) options.gen = Dex.getGen();
		const dex = Dex.getDex('gen' + options.gen);
		return this.getPokemonList(options).map(x => dex.getPokemonCopy(x));
	}

	unrefDex(): void {
		Tools.unrefProperties(this.abilitiesLists);
		Tools.unrefProperties(this.itemsLists);
		Tools.unrefProperties(this.movesLists);
		Tools.unrefProperties(this.nationalDexPokemonLists);
		Tools.unrefProperties(this.pokemonLists);

		/* eslint-disable @typescript-eslint/no-unsafe-assignment */
		this.abilitiesLists = Object.create(null);
		this.itemsLists = Object.create(null);
		this.movesLists = Object.create(null);
		this.nationalDexPokemonLists = Object.create(null);
		this.pokemonLists = Object.create(null);
		/* eslint-enable */
	}

	getEffectivenessScore(source: string | IMove, target: string | readonly string[] | IPokemon, inverseTypes?: boolean): number {
		if (Dex.isImmune(source, target)) {
			if (inverseTypes) return 2;
			return 0.125;
		}

		const effectiveness = Dex.getEffectiveness(source, target);
		if (effectiveness === -2) {
			if (inverseTypes) return 4;
			return 0.25;
		} else if (effectiveness === -1) {
			if (inverseTypes) return 2;
			return 0.5;
		} else if (effectiveness === 1) {
			if (inverseTypes) return 0.5;
			return 2;
		} else if (effectiveness === 2) {
			if (inverseTypes) return 0.25;
			return 4;
		}

		return 1;
	}

	getCombinedEffectivenessScore(attacker: IPokemon, defender: string | readonly string[] | IPokemon, inverseTypes?: boolean): number {
		let combinedScore = 1;
		for (const type of attacker.types) {
			combinedScore *= this.getEffectivenessScore(type, defender, inverseTypes);
		}

		return combinedScore;
	}

	getMatchupWinner(attacker: IPokemon, defender: IPokemon, inverseTypes?: boolean): IPokemon | null {
		const matchupScore = this.getCombinedEffectivenessScore(attacker, defender, inverseTypes) /
			this.getCombinedEffectivenessScore(defender, attacker, inverseTypes);

		if (matchupScore > 1) {
			return attacker;
		}

		if (matchupScore < 1) {
			return defender;
		}

		return null;
	}

	isIncludedPokemonTier(tier: string): boolean {
		return !excludedTiers.includes(tier);
	}

	getTrainerCardHtml(room: Room, name: string, format?: IGameFormat | IUserHostedFormat): string {
		const id = Tools.toId(name);
		const database = Storage.getDatabase(room);
		if (!database.gameTrainerCards || !(id in database.gameTrainerCards)) return "";

		const trainerCard = database.gameTrainerCards[id];

		let html = '<span class="infobox" style="display: inline-block;width:250px"><center><b><username>' + name + '</username></b>';
		if (format) {
			const bits = Storage.getPoints(room, Storage.gameLeaderboard, name);
			if (bits) {
				html += '&nbsp;&bull;&nbsp;<b>' + bits + ' bits</b>';
			}
		}
		html += "<hr /><span style='display: block;height:115px";
		if (trainerCard.background) {
			if (typeof trainerCard.background === 'string') {
				if (trainerCard.background in Tools.hexCodes) {
					html += ";background: " + Tools.hexCodes[trainerCard.background]!.gradient;
				}
			} else {
				html += ";background: " + trainerCard.background.gradient;
			}
		}
		html += "'>";

		let avatarHtml = "";
		if (trainerCard.avatar) {
			if (trainerCard.customAvatar) {
				avatarHtml += Dex.getCustomTrainerSprite(trainerCard.avatar);
			} else {
				const avatarSpriteId = Dex.getTrainerSpriteId(trainerCard.avatar);
				if (avatarSpriteId) avatarHtml = Dex.getTrainerSprite(avatarSpriteId);
			}
		}

		const emptySpan = '<span style="display: inline-block ; height: 30px ; width: 40px"></span>';
		if (trainerCard.pokemon.length) {
			if (!avatarHtml) avatarHtml = "&nbsp;";
			if (trainerCard.pokemonGifs) {
				html += Dex.getPokemonModel(Dex.getExistingPokemon(trainerCard.pokemon[0]));
				html += avatarHtml;
				if (trainerCard.pokemon[1]) html += Dex.getPokemonModel(Dex.getExistingPokemon(trainerCard.pokemon[1]));
			} else {
				if (trainerCard.pokemon.length <= 2) {
					html += Dex.getPokemonIcon(Dex.getExistingPokemon(trainerCard.pokemon[0]));
					html += avatarHtml;
					if (trainerCard.pokemon[1]) html += Dex.getPokemonIcon(Dex.getExistingPokemon(trainerCard.pokemon[1]));
					html += "<br />";
					html += emptySpan;
				} else {
					html += emptySpan;
					html += avatarHtml;
					html += emptySpan;
					html += "<br />";
					for (const pokemon of trainerCard.pokemon) {
						html += Dex.getPokemonIcon(Dex.getExistingPokemon(pokemon));
					}
				}
			}
		} else {
			if (!avatarHtml) return "";
			html += avatarHtml;
		}

		html += "</span>";

		if (format) {
			const currentCache = Storage.getSourcePointsCache(room, Storage.gameLeaderboard, [format.id]);
			let index = -1;
			for (let i = 0; i < currentCache.length; i++) {
				if (currentCache[i].id === id) {
					index = i;
					break;
				}
			}

			if (index !== -1) {
				html += "<hr /><b>" + Tools.toNumberOrderString(index + 1) + "</b> in " + format.name;
			}
		}

		html += "</center></span>";
		return html;
	}

	getSignupsCustomBoxDiv(content: string, customBox: IGameCustomBox | undefined, noBackgroundContent?: string): string {
		return this.getCustomBoxDiv(content, customBox, noBackgroundContent, 'signups');
	}

	getGameCustomBoxDiv(content: string, customBox: IGameCustomBox | undefined, noBackgroundContent?: string): string {
		return this.getCustomBoxDiv(content, customBox, noBackgroundContent, 'game');
	}

	getCustomBoxDiv(content: string, customBox: IGameCustomBox | undefined, noBackgroundContent?: string,
		optionalType?: 'signups' | 'game'): string {
		let html = "";
		let span = "";
		let hasBorder = false;

		if (customBox) {
			const signups = optionalType === 'signups';
			const game = optionalType === 'game';

			let background: HexCode | IHexCodeData | undefined;
			if (signups && customBox.signupsBackground) {
				background = customBox.signupsBackground;
			} else if (game && customBox.gameBackground) {
				background = customBox.gameBackground;
			} else if (customBox.background) {
				background = customBox.background;
			}

			let border: ICustomBorder = {};
			if (signups && customBox.signupsBackgroundBorder && Object.keys(customBox.signupsBackgroundBorder).length) {
				border = customBox.signupsBackgroundBorder;
			} else if (game && customBox.gameBackgroundBorder && Object.keys(customBox.gameBackgroundBorder).length) {
				border = customBox.gameBackgroundBorder;
			} else if (customBox.backgroundBorder) {
				border = customBox.backgroundBorder;
			}

			span = Tools.getHexSpan(background, border.color, game ? undefined : border.radius, border.size, border.type);

			hasBorder = Object.keys(border).length > 0;
		}

		if (!hasBorder) html += "<div class='infobox'>";

		if (span) {
			html += span + content + "</span>";
		} else {
			html += content;
		}

		if (noBackgroundContent) html += noBackgroundContent;

		if (!hasBorder) html += "</div>";

		return html;
	}

	getCustomBoxButtonStyle(customBox: IGameCustomBox | undefined, optionalType?: 'signups' | 'game', disabled?: boolean): string {
		let buttonStyle = "";
		if (customBox) {
			const signups = optionalType === 'signups';
			const game = optionalType === 'game';

			let buttons: HexCode | IHexCodeData | undefined;
			if (!disabled) {
				if (signups && customBox.signupsButtons) {
					buttons = customBox.signupsButtons;
				} else if (game && customBox.gameButtons) {
					buttons = customBox.gameButtons;
				} else if (customBox.buttons) {
					buttons = customBox.buttons;
				}
			}

			let border: ICustomBorder = {};
			if (signups && customBox.signupsButtonsBorder && Object.keys(customBox.signupsButtonsBorder).length) {
				border = customBox.signupsButtonsBorder;
			} else if (game && customBox.gameButtonsBorder && Object.keys(customBox.gameButtonsBorder).length) {
				border = customBox.gameButtonsBorder;
			} else if (customBox.buttonsBorder) {
				border = customBox.buttonsBorder;
			}

			buttonStyle = Tools.getCustomButtonStyle(buttons, border.color, border.radius, border.size, border.type);
		}

		return buttonStyle;
	}

	getScriptedBoxHtml(room: Room, gameName: string, formatId: string, voter?: string, description?: string, mascot?: IPokemon,
		shinyMascot?: boolean, highlightPhrase?: string, modeHighlightPhrase?: string): string {
		let scriptedBox: IGameCustomBox | undefined;
		let mascotGeneration: ModelGeneration | undefined;

		if (voter) {
			const user = Users.get(voter);
			if (user) voter = user.name;

			const id = Tools.toId(voter);
			const database = Storage.getDatabase(room);
			if (database.gameScriptedBoxes && id in database.gameScriptedBoxes) {
				mascotGeneration = database.gameScriptedBoxes[id].mascotGeneration;

				if (database.gameFormatScriptedBoxes && id in database.gameFormatScriptedBoxes &&
					formatId in database.gameFormatScriptedBoxes[id]) {
					scriptedBox = database.gameFormatScriptedBoxes[id][formatId];
				} else {
					scriptedBox = database.gameScriptedBoxes[id];
				}
			}
		}

		let content = "";
		if (voter) {
			content += "<b>" + voter + "</b>'s pick<br />";
		}

		if (mascot) {
			let generation: ModelGeneration | undefined;
			if (mascotGeneration) {
				const maxGeneration = Dex.getModelGenerationMaxGen(mascotGeneration);
				if (mascot.gen <= maxGeneration) {
					generation = mascotGeneration;
				}
			}

			const gif = Dex.getPokemonModel(mascot, generation, undefined, shinyMascot);
			if (gif) content += gif;
		}
		content += "<h3>" + gameName + "</h3>";
		if (description) content += description;

		const buttonStyle = this.getCustomBoxButtonStyle(scriptedBox);

		content += '<br /><br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) content += ' name="parseCommand" value="/highlight roomadd ' + highlightPhrase + '"';
		content += '>Enable game highlights</button>';
		content += '&nbsp;|&nbsp;';
		content += '<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) content += ' name="parseCommand" value="/highlight roomdelete ' + highlightPhrase + '"';
		content += '>Disable game highlights</button>';

		if (modeHighlightPhrase) {
			content += '<br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '') +
				' name="parseCommand" value="/highlight roomadd ' + modeHighlightPhrase + '">Enable mode highlights</button> | ' +
				'<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="parseCommand" ' +
				'value="/highlight roomdelete ' + modeHighlightPhrase + '">Disable mode highlights</button>';
		}

		content += "<br />&nbsp;";

		return "<center>" + this.getCustomBoxDiv(content, scriptedBox) + "</center>";
	}

	getHostBoxHtml(room: Room, host: string, gameName: string, format?: IUserHostedFormat, highlightPhrase?: string): string {
		const id = Tools.toId(host);
		const database = Storage.getDatabase(room);
		let hostBox: IGameHostBox | undefined;
		if (database.gameHostBoxes && id in database.gameHostBoxes) hostBox = database.gameHostBoxes[id];

		let content = "";

		if (hostBox) {
			let trainerHtml = "";
			if (hostBox.avatar) {
				if (hostBox.customAvatar) {
					trainerHtml += Dex.getCustomTrainerSprite(hostBox.avatar);
				} else {
					const trainerSpriteId = Dex.getTrainerSpriteId(hostBox.avatar);
					if (trainerSpriteId) {
						trainerHtml += Dex.getTrainerSprite(trainerSpriteId);
					}
				}
			}

			let staticSprites = false;
			const gifs: string[] = [];
			for (const pokemon of hostBox.pokemon) {
				const gif = Dex.getPokemonModel(Dex.getExistingPokemon(pokemon.pokemon), pokemon.generation, undefined, pokemon.shiny);
				if (gif) {
					if (!staticSprites && pokemon.generation !== 'xy' && pokemon.generation !== 'bw') staticSprites = true;
					gifs.push(gif);
				}
			}

			if (trainerHtml) {
				content += trainerHtml;
				if (gifs.length) content += "<br />";
			}

			content += gifs.join(staticSprites ? "" : "&nbsp;&nbsp;&nbsp;");
		}

		content += "<h3>" + gameName + "</h3>";
		if (format) {
			content += format.description;
		} else {
			content += "The game's description will be displayed here";
		}

		const buttonStyle = this.getCustomBoxButtonStyle(hostBox);

		content += '<br /><br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) content += ' name="parseCommand" value="/highlight roomadd ' + highlightPhrase + '"';
		content += '>Enable game highlights</button>';
		content += '&nbsp;|&nbsp;';
		content += '<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) content += ' name="parseCommand" value="/highlight roomdelete ' + highlightPhrase + '"';
		content += '>Disable game highlights</button>';

		content += "<br />&nbsp;";

		return "<center>" + this.getCustomBoxDiv(content, hostBox) + "</center>";
	}

	getSignupsPlayersHtml(customBox: IGameCustomBox | undefined, headerHtml: string, playerCount: number,
		subHtml: string, pokemonAvatars?: boolean): string {
		return this.getSignupsCustomBoxDiv(headerHtml + "<br />&nbsp;", customBox, (pokemonAvatars ? "" : "<br />") +
			"<b>Players (" + playerCount + ")</b>: " + subHtml);
	}

	getJoinButtonHtml(room: Room, label: string, customBox?: IGameCustomBox, optionalType?: 'signups' | 'game'): string {
		let html = "";
		if (label) {
			html += Client.getQuietPmButton(room, Config.commandCharacter + "joingame " + room.id, label, false,
				this.getCustomBoxButtonStyle(customBox, optionalType || 'signups'));
		} else {
			html += "<b>This game is free-join!</b>";
		}

		return html;
	}

	getHostCustomDisplay(host: string, hostDisplay: IGameHostDisplay, randomized?: boolean): string {
		let content = "";
		let trainerHtml = "";
		for (const choice of hostDisplay.trainers) {
			const trainerSpriteId = Dex.getTrainerSpriteId(choice.trainer);
			if (trainerSpriteId) {
				if (trainerHtml) trainerHtml += "&nbsp;";
				trainerHtml += Dex.getTrainerSprite(trainerSpriteId);
			}
		}

		let staticSprites = false;
		const gifsOrIcons: string[] = [];
		const pokemonIcons = hostDisplay.gifOrIcon === 'icon';
		for (const choice of hostDisplay.pokemon) {
			const pokemon = Dex.getPokemon(choice.pokemon);
			if (!pokemon || (!pokemonIcons && !Dex.hasModelData(pokemon, choice.generation))) {
				continue;
			}

			if (!staticSprites && choice.generation !== 'xy' && choice.generation !== 'bw') staticSprites = true;

			gifsOrIcons.push(pokemonIcons ? Dex.getPokemonIcon(pokemon) + pokemon.name :
				Dex.getPokemonModel(pokemon, choice.generation, undefined, choice.shiny));
		}

		if (!trainerHtml && !gifsOrIcons.length) {
			content += "&nbsp;";
		}

		if (trainerHtml) {
			content += trainerHtml;
			if (gifsOrIcons.length) content += "<br />";
		}

		content += gifsOrIcons.join(pokemonIcons ? ", " : staticSprites ? "" : "&nbsp;&nbsp;&nbsp;");

		const centered = hostDisplay.trainers.length > 0 || !pokemonIcons;

		let html = '';
		if (centered) html += "<center>";
		html += this.getCustomBoxDiv(content, hostDisplay);
		if (centered) html += "</center>";
		html += Client.getUserAttributionHtml((randomized ? "Randomized by " : "") + host);

		return html;
	}

	updateGameCatalog(room: Room): void {
		if (!Config.githubApiCredentials || !('gist' in Config.githubApiCredentials) || !Config.gameCatalogGists ||
			!(room.id in Config.gameCatalogGists)) return;

		const commandCharacter = Config.commandCharacter;
		const allowsScriptedGames = Config.allowScriptedGames && Config.allowScriptedGames.includes(room.id);
		const allowsUserHostedGames = Config.allowUserHostedGames && Config.allowUserHostedGames.includes(room.id);
		const allowsGameAchievements = Config.allowGameAchievements && Config.allowGameAchievements.includes(room.id);

		if (!allowsScriptedGames && !allowsUserHostedGames) return;

		let scriptedGamesDocument: string[] = ["# " + room.title + " Scripted Games",
			"This document contains information on all scripted games that can be played in the " + room.title + " room."];
		let userHostedGamesDocument: string[] = ["# " + room.title + " User-Hosted Games",
			"This document contains information on all user-hosted games that can be played in the " + room.title + " room."];

		if (allowsUserHostedGames) {
			const userHostCommands: string[] = ["## User-host commands",
				"Player management:",
				"* <code>" + commandCharacter + "apl [player a], [player b], [...]</code> - add the specified player(s) to the game",
				"* <code>" + commandCharacter + "rpl [player a], [player b], [...]</code> - remove the specified player(s) from the game",
				"* <code>" + commandCharacter + "pl</code> - display the player list",
				"* <code>" + commandCharacter + "shufflepl</code> - shuffle and display the player list",
				"* <code>" + commandCharacter + "clearpl</code> - clear the player list",

				"\nTeam management:",
				"* <code>" + commandCharacter + "splitpl [#], [team a], [team b]</code> - split the player list into [#] teams with " +
					"team names if specified",
				"* <code>" + commandCharacter + "unsplitpl</code> - remove the previously set teams",
				"* <code>" + commandCharacter + "atpl [team], [player a], [player b], [...]</code> - add or move the specified " +
					"player(s) to the specified team",

				"\nPoints management:",
				"* <code>" + commandCharacter + "apt [...], [#]</code> - give [#] points to the specified player(s) or team(s)",
				"* <code>" + commandCharacter + "rpt [...], [#]</code> - remove [#] points from the specified player(s) or team(s)",
				"* <code>" + commandCharacter + "aptall [#]</code> - give [#] points to all players",
				"* <code>" + commandCharacter + "rptall [#]</code> - remove [#] points from all players",
				"* <code>" + commandCharacter + "mpt [player a], [player b], [#]</code> - move [#] or all of [player a]'s points " +
					"to [player b]",

				"\nGame management:",
				"* <code>" + commandCharacter + "sgtimer [#], [minutes]</code> - set a timer for the game to start in [#] minutes",
				"* <code>" + commandCharacter + "gtimer [#], [minutes or seconds]</code> - set a timer for [#] minutes or seconds " +
					"if specified",
				"* <code>" + commandCharacter + "randgtimer [seconds], [min], [max]</code> - set random timer between [min] and " +
					"[max] minutes or seconds if specified",
				"* <code>" + commandCharacter + "gtimer off</code> - turn off the previously set timer",
				"* <code>" + commandCharacter + "store [message or command]</code> - store a single message or command to be used " +
					"throughout the game",
				"* <code>" + commandCharacter + "storem [key], [message or command]</code> - store one of many messages or commands " +
					"to be used throughout the game using the specified key",
				"* <code>" + commandCharacter + "stored [key]</code> - display a stored message or use a stored command, optionally " +
					"the message matching the specified key",
				"* <code>" + commandCharacter + "twist [twist]</code> - set or view the twist for the game",
				"* <code>" + commandCharacter + "gcap [#]</code> - set or view the player cap for the game",
				"* <code>" + commandCharacter + "scorecap [#]</code> - set or view the score cap for the game",
				"* <code>" + commandCharacter + "savewinner [player a], [player b], [...]</code> - set the specified player(s) as " +
					"the winner(s) and continue the game",
				"* <code>" + commandCharacter + "winner [player a], [player b], [...]</code> - set the specified player(s) as the " +
					"winner(s) and end the game",

				"\nIn-game data generators:",
				"* <code>" + commandCharacter + "rability [#]</code> - generate up to 6 abilities",
				"* <code>" + commandCharacter + "ritem [#]</code> - generate up to 6 items",
				"* <code>" + commandCharacter + "rmove [#]</code> - generate up to 6 moves",
				"* <code>" + commandCharacter + "rpoke [#]</code> - generate up to 6 Pokemon",
				"* <code>" + commandCharacter + "rtype</code> - generate a single or dual typing",
				"* <code>" + commandCharacter + "rextype</code> - generate a single or dual typing of an existing Pokemon",
				"* <code>" + commandCharacter + "rcolor</code> - generate a Pokedex color",
				"* <code>" + commandCharacter + "regg</code> - generate an egg group",
				"* <code>" + commandCharacter + "rnature</code> - generate a nature",
				"* <code>" + commandCharacter + "rcat</code> - generate a Pokedex category",

				"\nOther generators:",
				"* <code>" + commandCharacter + "ranswer [game]</code> - in PMs, generate a hint and answer for the specified game",
				"* <code>" + commandCharacter + "rbadge [region]</code> - generate a badge, optionally from the specified region",
				"* <code>" + commandCharacter + "rchar [region/character type]</code> - generate a character, optionally from the " +
					"specified region and/or of the specified type",
				"* <code>" + commandCharacter + "rloc [region/location type]</code> - generate a location, optionally from the " +
					"specified region and/or of the specified type",
				"* <code>" + commandCharacter + "rletter</code> - generate a letter",
				"* <code>" + commandCharacter + "rpick [option 1], [option 2], [...]</code> - generate one of the specified options",
				"* <code>" + commandCharacter + "rorder [option 1], [option 2], [...]</code> - shuffle the specified options",

				"\nPS commands:",
				"* <code>" + commandCharacter + "starthangman [room], [answer], [hint]</code> - in PMs, start a PS hangman game",
				"* <code>" + commandCharacter + "endhangman [room]</code> - in PMs, end the current PS hangman game",
				"* <code>" + commandCharacter + "roll [arguments]</code> - use !roll with the specified arguments",
				"* <code>" + commandCharacter + "dt [arguments]</code> - use !dt with the specified arguments",

				"\nDisplay sprites:",
				"* <code>" + commandCharacter + "showgif [room], [pokemon 1], [pokemon 2], [...]</code> - in PMs, display up to 5 " +
					"Pokemon gifs",
				"* <code>" + commandCharacter + "showbwgif [room], [pokemon 1], [pokemon 2], [...]</code> - in PMs, display up to 5 " +
					"BW Pokemon gifs",
				"* <code>" + commandCharacter + "showrandgif [room], [typing], [#]</code> - in PMs, display up to 5 random Pokemon " +
					"gifs, optionally matching the specified typing",
				"* <code>" + commandCharacter + "showrandbwgif [room], [typing], [#]</code> - in PMs, display up to 5 random BW " +
					"Pokemon gifs, optionally matching the specified typing",
				"* <code>" + commandCharacter + "showicon [room], [pokemon 1], [pokemon 2], [...]</code> - in PMs, display up to " +
					"30 Pokemon icons",
				"* <code>" + commandCharacter + "showrandicon [room], [type], [#]</code> - in PMs, display up to 30 random Pokemon " +
					"icons, optionally matching the specified typing",
				"* <code>" + commandCharacter + "showtrainer [room], [trainer 1], [trainer 2], [...]</code> - in PMs, display up to " +
					"5 trainer sprites",
			];

			userHostedGamesDocument = userHostedGamesDocument.concat(userHostCommands);
		}

		let allowChallengeGames = false;
		if (Config.allowChallengeGames) {
			if (Config.allowChallengeGames.includes(room.id)) {
				allowChallengeGames = true;
			} else if (Config.subRooms && room.id in Config.subRooms) {
				for (const subRoom of Config.subRooms[room.id]) {
					if (Config.allowChallengeGames.includes(subRoom)) {
						allowChallengeGames = true;
						break;
					}
				}
			}
		}

		if (allowChallengeGames) {
			const oneVsOneGames: string[] = ["## One vs. one challenges", "Commands:",
				"* <code>" + commandCharacter + "1v1c [user], [game]</code> - challenge [user] to a game of [game] (see list below)",
				"* <code>" + commandCharacter + "a1v1c</code> - accept a challenge",
				"* <code>" + commandCharacter + "r1v1c</code> - reject a challenge",
				"* <code>" + commandCharacter + "c1v1c</code> - cancel a challenge",
				"* <code>" + commandCharacter + "ccdown [room], 1v1</code> - check your one vs. one challenge cooldown time for " +
					"[room] in PMs",
				"\n\nCompatible games:",
			];

			const botChallengeGames: string[] = ["## Bot challenges", "Commands:",
				"* <code>" + commandCharacter + "botch [game]</code> or <code>" + commandCharacter + "botch [options], [game]</code> " +
					"- challenge " + Users.self.name + " to a game of [game] (see list below)",
				"* <code>" + commandCharacter + "ccdown [room], bot</code> - check your bot challenge cooldown time for " +
					"[room] in PMs",
				"\n\nCompatible games:",
			];

			const keys = Object.keys(this.formats);
			keys.sort();
			for (const key of keys) {
				const format = this.getExistingFormat(key);
				if (format.disabled || format.tournamentGame || format.searchChallenge) continue;
				if (format.challengeSettings) {
					if (format.challengeSettings.onevsone && format.challengeSettings.onevsone.enabled &&
						(!format.challengeSettings.onevsone.requiredFreejoin || format.freejoin ||
						format.defaultOptions.includes('freejoin'))) {
						oneVsOneGames.push("* " + format.name + "\n");
					}

					if (format.challengeSettings.botchallenge && format.challengeSettings.botchallenge.enabled &&
						(!format.challengeSettings.botchallenge.requiredFreejoin || format.freejoin ||
						format.defaultOptions.includes('freejoin'))) {
						let name = format.name;
						if (format.challengeSettings.botchallenge.requiredFreejoin) name += " (freejoin)";
						botChallengeGames.push("* " + name + "\n");
					}
				}
			}

			scriptedGamesDocument = scriptedGamesDocument.concat(oneVsOneGames);
			scriptedGamesDocument = scriptedGamesDocument.concat(botChallengeGames);
		}

		const defaultCategory = "Uncategorized";
		if (allowsScriptedGames) {
			const categories: Dict<string[]> = {};
			const formatKeys = Object.keys(this.formats);
			formatKeys.sort();

			const formats: IGameFormat[] = [];
			for (const key of formatKeys) {
				const format = this.getExistingFormat(key);
				if (format.disabled || format.tournamentGame || format.searchChallenge) continue;
				formats.push(format);
			}

			const modes: Dict<string[]> = {};
			const modeKeys = Object.keys(this.modes);
			modeKeys.sort();

			for (const key of modeKeys) {
				const mode = this.modes[key];
				const games: string[] = [];
				for (const format of formats) {
					if (format.modes && format.modes.includes(mode.id)) {
						games.push(Tools.toMarkdownAnchor(format.name, format.mascot ? "-" : ""));
					}
				}

				modes[mode.name] = ["### " + mode.name, "**Description**: " + mode.description,
					"\n**Playable games**: " + games.join(", ")];
			}

			for (const format of formats) {
				const info: string[] = [];

				let mascot: IPokemon | undefined;
				if (format.mascot) {
					mascot = Dex.getExistingPokemon(format.mascot);
				} else if (format.mascots) {
					mascot = Dex.getExistingPokemon(format.mascots[0]);
				}

				let mascotIcon = '';
				if (mascot) {
					let num = '' + mascot.num;
					while (num.length < 3) {
						num = '0' + num;
					}
					mascotIcon = '![' + mascot.name + '](https://www.serebii.net/pokedex-swsh/icon/' + num + '.png) ';
				}
				info.push("### " + mascotIcon + format.name);
				info.push(format.description + "\n");

				if (format.commandDescriptions) {
					info.push("**Commands**:");
					for (const command of format.commandDescriptions) {
						info.push("* <code>" + command + "</code>");
					}
					info.push("\n");
				}

				if (allowsGameAchievements && format.class.achievements) {
					const achievements: string[] = [];
					for (const achievementKey in format.class.achievements) {
						achievements.push(Tools.toMarkdownAnchor(format.class.achievements[achievementKey].name));
					}
					info.push("**Achievements**: " + Tools.joinList(achievements));
					info.push("\n");
				}

				const playingDifficulty = Config.scriptedGameDifficulties && format.id in Config.scriptedGameDifficulties ?
					Config.scriptedGameDifficulties[format.id] : "medium";
				info.push("**Playing difficulty**: " + playingDifficulty + (format.scriptedOnly ? " (scripted only)" : "") + "\n");

				if (!format.scriptedOnly) {
					const hostingDifficulty = Config.userHostedGameHostDifficulties && format.id in Config.userHostedGameHostDifficulties ?
						Config.userHostedGameHostDifficulties[format.id] : "medium";
					info.push("**Hosting difficulty**: " + hostingDifficulty + " | ");

					const userHostedPlayingDifficulty = Config.userHostedGamePlayerDifficulties &&
						format.id in Config.userHostedGamePlayerDifficulties ? Config.userHostedGamePlayerDifficulties[format.id] :
						"medium";
					info.push("**User-hosted playing difficulty**: " + userHostedPlayingDifficulty + "\n");
				}

				info.push("\n");
				info.push("---");

				const category = format.category ? categoryNames[format.category] : defaultCategory;
				if (!(category in categories)) categories[category] = [];
				categories[category] = categories[category].concat(info);
			}

			let scriptedGames: string[] = ["## Scripted games", "(listed by category)"];
			const categoryKeys = Object.keys(categories);
			const defaultCategoryIndex = categoryKeys.indexOf(defaultCategory);
			if (defaultCategoryIndex !== -1) {
				categoryKeys.splice(defaultCategoryIndex, 1);
				categoryKeys.push(defaultCategory);
			}

			for (const key of categoryKeys) {
				scriptedGames.push("## " + key);
				scriptedGames = scriptedGames.concat(categories[key]);
				scriptedGames.push("\n");
			}

			scriptedGames.push("## Modes");
			for (const key in modes) {
				scriptedGames = scriptedGames.concat(modes[key]);
				scriptedGames.push("\n");
			}
			scriptedGamesDocument = scriptedGamesDocument.concat(scriptedGames);
		}

		if (allowsGameAchievements) {
			const internalFormatKeys = Object.keys(this.internalFormats) as InternalGame[];
			internalFormatKeys.sort();

			const formatKeys = Object.keys(this.formats);
			formatKeys.sort();

			const achievements: string[] = ["## Scripted game achievements"];
			const achievementKeys = Object.keys(this.achievements);
			achievementKeys.sort();

			for (const achievementKey of achievementKeys) {
				const achievement = this.achievements[achievementKey];
				achievements.push("### " + achievement.name);
				achievements.push("**Description**: " + achievement.description + "\n");

				const games: string[] = [];
				for (const formatKey of formatKeys) {
					const format = this.getExistingFormat(formatKey);
					if (format.class.achievements && achievementKey in format.class.achievements) {
						games.push(Tools.toMarkdownAnchor(format.name, format.mascot ? "-" : ""));
					}
				}
				for (const formatKey of internalFormatKeys) {
					const format = this.getExistingInternalFormat(formatKey);
					if (format.class.achievements && achievementKey in format.class.achievements) games.push(format.name);
				}

				achievements.push("**Unlockable in**: " + Tools.joinList(games) + "\n");
				achievements.push("\n");
				achievements.push("---");
			}

			scriptedGamesDocument = scriptedGamesDocument.concat(achievements);
		}

		if (allowsUserHostedGames) {
			const userHostedGames: string[] = ["## User-hosted games"];
			for (const i in this.userHostedFormats) {
				const format = this.getExistingUserHostedFormat(i);
				userHostedGames.push("### " + format.name);
				userHostedGames.push(format.description + "\n");

				const hostingDifficulty = Config.userHostedGameHostDifficulties && format.id in Config.userHostedGameHostDifficulties ?
					Config.userHostedGameHostDifficulties[format.id] : "medium";
				userHostedGames.push("**Hosting difficulty**: " + hostingDifficulty + " | ");

				const playingDifficulty = Config.userHostedGamePlayerDifficulties && format.id in Config.userHostedGamePlayerDifficulties ?
					Config.userHostedGamePlayerDifficulties[format.id] : "medium";
				userHostedGames.push("**Playing difficulty**: " + playingDifficulty + "\n");

				userHostedGames.push("\n");
				userHostedGames.push("---");
			}

			userHostedGamesDocument = userHostedGamesDocument.concat(userHostedGames);
		}

		const scriptedGamesContent = scriptedGamesDocument.join("\n").trim();
		const userHostedGamesContent = userHostedGamesDocument.join("\n").trim();

		const lastUpdateCache = scriptedGamesContent + userHostedGamesContent;
		if (room.id in this.lastCatalogUpdates && this.lastCatalogUpdates[room.id] === lastUpdateCache) return;
		this.lastCatalogUpdates[room.id] = lastUpdateCache;

		const files: Dict<{filename: string; content: string}> = {};
		if (allowsScriptedGames && Config.gameCatalogGists[room.id].files.scripted) {
			files[Config.gameCatalogGists[room.id].files.scripted!] = {
				filename: Config.gameCatalogGists[room.id].files.scripted!,
				content: scriptedGamesContent,
			};
		}

		if (allowsUserHostedGames && Config.gameCatalogGists[room.id].files.userHosted) {
			files[Config.gameCatalogGists[room.id].files.userHosted!] = {
				filename: Config.gameCatalogGists[room.id].files.userHosted!,
				content: userHostedGamesContent,
			};
		}

		Tools.editGist(Config.githubApiCredentials.gist.username, Config.githubApiCredentials.gist.token,
			Config.gameCatalogGists[room.id].id, Config.gameCatalogGists[room.id].description, files);
	}

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	private onReload(previous: Games): void {
		if (previous.scheduledGameTimers) {
			for (const i in previous.scheduledGameTimers) {
				clearTimeout(previous.scheduledGameTimers[i]);
				// @ts-expect-error
				previous.scheduledGameTimers[i] = undefined;
			}
		}

		if (previous.autoCreateTimers) {
			for (const i in previous.autoCreateTimers) {
				clearTimeout(previous.autoCreateTimers[i]);
				// @ts-expect-error
				previous.autoCreateTimers[i] = undefined;
			}

			for (const i in previous.autoCreateTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.autoCreateTimerData[i];
					let timer = data.endTime - Date.now();
					if (timer < 5000) timer = 5000;
					this.setAutoCreateTimer(room, data.type, timer);
				}
			}
		}

		if (previous.gameCooldownMessageTimers) {
			for (const i in previous.gameCooldownMessageTimers) {
				clearTimeout(previous.gameCooldownMessageTimers[i]);
				// @ts-expect-error
				previous.gameCooldownMessageTimers[i] = undefined;
			}

			for (const i in previous.gameCooldownMessageTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.gameCooldownMessageTimerData[i];
					let timer = data.endTime - Date.now();
					if (timer < 5000) timer = 5000;
					this.setGameCooldownMessageTimer(room, data.minigameCooldownMinutes, timer);
				}
			}
		}

		if (previous.lastCatalogUpdates) Object.assign(this.lastCatalogUpdates, previous.lastCatalogUpdates);
		if (previous.lastGames) Object.assign(this.lastGames, previous.lastGames);
		if (previous.lastMinigames) Object.assign(this.lastMinigames, previous.lastMinigames);
		if (previous.lastChallengeTimes) Object.assign(this.lastChallengeTimes, previous.lastChallengeTimes);
		if (previous.lastScriptedGames) Object.assign(this.lastScriptedGames, previous.lastScriptedGames);
		if (previous.lastUserHostedGames) Object.assign(this.lastUserHostedGames, previous.lastUserHostedGames);
		if (previous.lastUserHostTimes) Object.assign(this.lastUserHostTimes, previous.lastUserHostTimes);
		if (previous.lastUserHostFormatTimes) Object.assign(this.lastUserHostFormatTimes, previous.lastUserHostFormatTimes);
		if (previous.skippedScriptedCooldowns) Object.assign(this.skippedScriptedCooldowns, previous.skippedScriptedCooldowns);

		if (previous.lastWinners) {
			for (const i in previous.lastWinners) {
				this.lastWinners[i] = previous.lastWinners[i].slice();
			}
		}

		if (previous.nextVoteBans) {
			for (const i in previous.nextVoteBans) {
				this.nextVoteBans[i] = previous.nextVoteBans[i].slice();
			}
		}

		for (const formatModule of previous.formatModules) {
			Tools.unrefProperties(formatModule);
		}
		Tools.unrefProperties(previous.userHosted);

		for (const i in previous.workers) {
			// @ts-expect-error
			Tools.unrefProperties(previous.workers[i]);
		}

		Tools.unrefProperties(previous.abilitiesLists);
		Tools.unrefProperties(previous.itemsLists);
		Tools.unrefProperties(previous.movesLists);
		Tools.unrefProperties(previous.nationalDexPokemonLists);
		Tools.unrefProperties(previous.pokemonLists);
		Tools.unrefProperties(previous);

		this.loadFormats();
		this.loadSchedules();

		const serverId = Client.getServerId();
		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (serverId in this.schedules && room.id in this.schedules[serverId] && (!(room.id in this.nextOfficialGames) ||
			now < this.nextOfficialGames[room.id].time)) {
				this.setOfficialGame(room);
			}
		});

		if (previous.scheduledGameTimerData) {
			for (const i in previous.scheduledGameTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.scheduledGameTimerData[i];
					const format = this.getFormat(data.formatid);
					if (!Array.isArray(format)) {
						this.setCreateGameTimer(room, data.startTime, format, data.official);
					}
				}
			}
		}

		if (Config.gameCatalogGists) {
			for (const i in Config.gameCatalogGists) {
				const room = Rooms.get(i);
				if (room) this.updateGameCatalog(room);
			}
		}
	}
	/* eslint-enable */

	private loadFileAchievements(file: DeepImmutable<IGameFile>): void {
		if (!file.class.achievements) return;
		for (const key in file.class.achievements) {
			const achievement = file.class.achievements[key];
			if (Tools.toId(achievement.name) !== key) {
				throw new Error(file.name + "'s achievement " + achievement.name + " needs to have the key '" +
					Tools.toId(achievement.name) + "'");
			}
			if (key in this.achievements) {
				if (this.achievements[key].name !== achievement.name) {
					throw new Error(file.name + "'s achievement '" + key + "' has the name '" + this.achievements[key].name +
						"' in another game.");
				}
				if (this.achievements[key].description !== achievement.description) {
					throw new Error(file.name + "'s achievement '" + key + "' has the description '" + this.achievements[key].description +
						"' in another game.");
				}
				continue;
			}
			this.achievements[key] = achievement;
		}
	}

	private clearAutoCreateTimer(room: Room): void {
		if (room.id in this.autoCreateTimers) {
			clearTimeout(this.autoCreateTimers[room.id]);
			delete this.autoCreateTimers[room.id];
		}

		delete this.autoCreateTimerData[room.id];
	}
}

export const instantiate = (): void => {
	let oldGames = global.Games as Games | undefined;

	global.Games = new Games();

	if (oldGames) {
		// @ts-expect-error
		global.Games.onReload(oldGames);
		oldGames = undefined;
	}
};
