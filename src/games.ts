import fs = require('fs');
import path = require('path');

import type { PRNGSeed } from './lib/prng';
import { ScriptedGame } from './room-game-scripted';
import type { UserHostedGame } from './room-game-user-hosted';
import type { Room } from "./rooms";
import type { CommandErrorArray } from "./types/command-parser";
import type {
	AutoCreateTimerType, DefaultGameOption, GameCategory, GameCommandDefinitions, GameCommandReturnType, GameMode, IGameAchievement,
	IGameFile, IGameFormat, IGameFormatComputed, IGameMode, IGameModeFile, IGameOptionValues, IGamesWorkers, IGameTemplateFile,
	IGameVariant, IInternalGames, InternalGameKey, IUserHostedComputed, IUserHostedFormat, IUserHostedFormatComputed, LoadedGameCommands,
	LoadedGameFile, UserHostedCustomizable
} from './types/games';
import type { IAbility, IAbilityCopy, IItem, IItemCopy, IMove, IMoveCopy, IPokemon, IPokemonCopy } from './types/pokemon-showdown';
import type { IGameHostBox, IGameScriptedBox, IPastGame } from './types/storage';
import type { User } from './users';
import { ParametersWorker } from './workers/parameters';
import { PortmanteausWorker } from './workers/portmanteaus';

const DEFAULT_CATEGORY_COOLDOWN = 3;
const IMMUNE_MATCHUP_SCORE = 0.001;

const gamesDirectory = path.join(__dirname, 'games');
const internalGamePaths: IInternalGames = {
	eggtoss: path.join(gamesDirectory, "internal", "egg-toss.js"),
	headtohead: path.join(gamesDirectory, "internal", "head-to-head.js"),
	onevsone: path.join(gamesDirectory, "internal", "one-vs-one.js"),
	vote: path.join(gamesDirectory, "internal", "vote.js"),
};

const categoryNames: KeyedDict<GameCategory, string> = {
	'board': 'Board',
	'board-property': 'Board (property)',
	'card': 'Card',
	'card-high-low': 'Card (high-low)',
	'card-matching': 'Card (matching)',
	'chain': 'Chain',
	'elimination-tournament': 'Elimination tournament',
	'identification': 'Identification',
	'knowledge': 'Knowledge',
	'luck': 'Luck',
	'map': 'Map',
	'puzzle': 'Puzzle',
	'reaction': 'Reaction',
	'speed': 'Speed',
	'strategy': 'Strategy',
	'visual': 'Visual',
};

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
		pmOnly: true,
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

export class Games {
	// exported constants
	readonly gamesDirectory: typeof gamesDirectory = gamesDirectory;
	readonly scriptedGameHighlight: string = "Hosting a scriptedgame of";
	readonly userHostedGameHighlight: string = "is hosting a hostgame of";
	readonly scriptedGameVoteHighlight: string = "Hosting a scriptedgamevote";

	readonly achievements: Dict<IGameAchievement> = {};
	readonly aliases: Dict<string> = {};
	autoCreateTimers: Dict<NodeJS.Timer> = {};
	autoCreateTimerData: Dict<{endTime: number, type: AutoCreateTimerType}> = {};
	readonly formats: Dict<LoadedGameFile> = {};
	readonly freejoinFormatTargets: string[] = [];
	gameCooldownMessageTimers: Dict<NodeJS.Timer> = {};
	gameCooldownMessageTimerData: Dict<{endTime: number, minigameCooldownMinutes: number}> = {};
	// @ts-expect-error - set in loadFormats()
	readonly internalFormats: KeyedDict<InternalGameKey, LoadedGameFile> = {};
	lastCatalogUpdates: Dict<string> = {};
	lastGames: Dict<number> = {};
	lastMinigames: Dict<number> = {};
	lastOneVsOneChallengeTimes: Dict<Dict<number>> = {};
	lastScriptedGames: Dict<number> = {};
	lastUserHostedGames: Dict<number> = {};
	lastUserHostTimes: Dict<Dict<number>> = {};
	lastUserHostFormatTimes: Dict<Dict<number>> = {};
	readonly maxMoveAvailability: number = 500;
	readonly minigameBits: number = 25;
	readonly minigameCommandNames: Dict<{aliases: string[]; format: string}> = {};
	readonly modes: Dict<IGameMode> = {};
	readonly modeAliases: Dict<string> = {};
	nextVoteBans: Dict<string[]> = {};
	reloadInProgress: boolean = false;
	readonly userHostedAliases: Dict<string> = {};
	readonly userHostedFormats: Dict<IUserHostedComputed> = {};
	readonly workers: IGamesWorkers = {
		parameters: new ParametersWorker(),
		portmanteaus: new PortmanteausWorker(),
	};

	readonly commands: LoadedGameCommands;
	readonly sharedCommands: LoadedGameCommands;

	// set in loadFormats()
	readonly userHosted!: typeof import('./room-game-user-hosted').game;

	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	private abilitiesLists: Dict<readonly IAbility[]> = Object.create(null);
	private itemsLists: Dict<readonly IItem[]> = Object.create(null);
	private movesLists: Dict<readonly IMove[]> = Object.create(null);
	private pokemonLists: Dict<readonly IPokemon[]> = Object.create(null);
	/* eslint-enable */

	constructor() {
		const sharedCommands = CommandParser.loadCommandDefinitions(sharedCommandDefinitions);
		this.sharedCommands = sharedCommands;
		this.commands = Object.assign(Object.create(null), sharedCommands) as GameCommandDefinitions;
	}

	onReload(previous: Partial<Games>): void {
		if (previous.autoCreateTimers) {
			for (const i in previous.autoCreateTimers) {
				clearTimeout(previous.autoCreateTimers[i]);
				delete previous.autoCreateTimers[i];
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
				delete previous.gameCooldownMessageTimers[i];
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
		if (previous.lastOneVsOneChallengeTimes) Object.assign(this.lastOneVsOneChallengeTimes, previous.lastOneVsOneChallengeTimes);
		if (previous.lastScriptedGames) Object.assign(this.lastScriptedGames, previous.lastScriptedGames);
		if (previous.lastUserHostedGames) Object.assign(this.lastUserHostedGames, previous.lastUserHostedGames);
		if (previous.lastUserHostTimes) Object.assign(this.lastUserHostTimes, previous.lastUserHostTimes);
		if (previous.lastUserHostFormatTimes) Object.assign(this.lastUserHostFormatTimes, previous.lastUserHostFormatTimes);

		if (previous.nextVoteBans) {
			for (const i in previous.nextVoteBans) {
				this.nextVoteBans[i] = previous.nextVoteBans[i].slice();
			}
		}

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}

		this.loadFormats();
		if (Config.gameCatalogGists) {
			for (const i in Config.gameCatalogGists) {
				const room = Rooms.get(i);
				if (room) this.updateGameCatalog(room);
			}
		}
	}

	unrefWorkers(): void {
		const workers = Object.keys(this.workers) as (keyof IGamesWorkers)[];
		for (const worker of workers) {
			this.workers[worker].unref();
			delete this.workers[worker];
		}
	}

	copyTemplateProperties<T extends ScriptedGame, U extends ScriptedGame>(template: IGameTemplateFile<T>, game: IGameFile<U>):
		IGameFile<U> {
		return Object.assign(Tools.deepClone(template), game);
	}

	loadFileAchievements(file: DeepImmutable<IGameFile>): void {
		if (!file.class.achievements) return;
		for (const key in file.class.achievements) {
			const achievement = file.class.achievements[key]!;
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

	loadFormats(): void {
		// @ts-expect-error
		this.userHosted = (require(path.join(Tools.builtFolder, "room-game-user-hosted.js")) as // eslint-disable-line @typescript-eslint/no-var-requires
			typeof import('./room-game-user-hosted')).game;

		const internalGameKeys = Object.keys(internalGamePaths) as (keyof IInternalGames)[];
		for (const key of internalGameKeys) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
			const file = require(internalGamePaths[key]).game as DeepImmutable<IGameFile> | undefined;
			if (!file) throw new Error("No game exported from " + internalGamePaths[key]);

			let commands;
			if (file.commands) {
				commands = CommandParser.loadCommandDefinitions<ScriptedGame, GameCommandReturnType>(Tools.deepClone(file.commands));
				for (const i in commands) {
					if (i in BaseCommands) {
						throw new Error("Internal game " + file.name + " command '" + i + "' already exists as a regular command.");
					}
					if (!(i in this.commands)) this.commands[i] = commands[i];
				}
			}

			if (file.class.achievements) this.loadFileAchievements(file);

			this.internalFormats[key] = Object.assign({}, file, {commands, id: Tools.toId(file.name)});
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (const fileName of modeFiles) {
			if (!fileName.endsWith('.js')) continue;
			const modePath = path.join(modesDirectory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
			const file = require(modePath).mode as DeepImmutable<IGameModeFile> | undefined;
			if (!file) throw new Error("No mode exported from " + modePath);

			const id = Tools.toId(file.name);
			if (id in this.modes) throw new Error("The name '" + file.name + "' is already used by another mode.");

			if (file.commands) {
				for (const i in file.commands) {
					if (i in BaseCommands) {
						throw new Error("Mode " + file.name + " command '" + i + "' already exists as a regular command.");
					}
					if (!(i in this.commands)) this.commands[i] = file.commands[i];
				}
			}

			if (file.aliases) {
				for (const alias of file.aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in this.modeAliases) {
						throw new Error(file.name + " mode's alias '" + alias + " is already used by " +
							this.modes[this.modeAliases[aliasId]].name + ".");
					}
					this.modeAliases[aliasId] = id;
				}
			}

			this.modes[id] = Object.assign({}, file as IGameMode, {id});
		}

		const gameFiles = fs.readdirSync(gamesDirectory);
		for (const fileName of gameFiles) {
			if (!fileName.endsWith('.js')) continue;
			const gamePath = path.join(gamesDirectory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
			const file = require(gamePath).game as DeepImmutable<IGameFile> | undefined;
			if (!file) throw new Error("No game exported from " + gamePath);

			const id = Tools.toId(file.name);
			if (id in this.formats) throw new Error("The name '" + file.name + "' is already used by another game.");

			let commands;
			if (file.commands) {
				commands = CommandParser.loadCommandDefinitions<ScriptedGame, GameCommandReturnType>(Tools.deepClone(file.commands));
			}

			let variants;
			if (file.variants) {
				variants = Tools.deepClone(file.variants);
				for (const variant of variants) {
					variant.variantAliases = variant.variantAliases.map(x => Tools.toId(x));
				}
			}

			let modes: string[] | undefined;
			if (file.modes) {
				modes = [];
				for (const mode of file.modes) {
					const modeId = Tools.toId(mode);
					if (!(modeId in this.modes)) throw new Error(file.name + "'s mode '" + mode + "' is not a valid mode.");
					modes.push(modeId);
				}
			}

			if (file.class.achievements) this.loadFileAchievements(file);

			this.formats[id] = Object.assign({}, file, {commands, id, modes, variants});
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
									throw new Error(format.name + "'s mode alias '" + modeAlias + "' clashes " +
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
							user.rooms.forEach((value, userRoom) => {
								if (userRoom.game) {
									const result = userRoom.game.tryCommand(target, user, user, command, timestamp);
									if (result) returnedResult = result;
								}
							});
						}
					} else {
						if (room.game) {
							const result = room.game.tryCommand(target, room, user, command, timestamp);
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
						if (!user.hasRank(room, 'voice') || room.game || room.userHostedGame || !Config.allowScriptedGames ||
							!Config.allowScriptedGames.includes(room.id)) return;
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
					if (global.Games.reloadInProgress) return this.sayError(['reloadInProgress']);
					delete format.inputOptions.points;
					const game = global.Games.createGame(room, format, pmRoom, true);
					game.signups();
				},
			};

			for (const alias of this.minigameCommandNames[name].aliases) {
				if (alias in BaseCommands) throw new Error(formatName + " minigame command alias '" + alias + "' is already a command.");
				Commands[alias] = Commands[name];
			}
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
		const inputOptions: Dict<number> = {};
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
			let optionNumber = 0;
			if (option.includes(":")) {
				const parts = option.split(":");
				optionName = Tools.toId(parts[0]);
				optionNumber = parseInt(parts[1].trim());
			} else {
				const optionId = Tools.toId(option);
				if (optionId === 'freejoin' || optionId === 'fj') {
					optionName = 'freejoin';
					optionNumber = 1;
				} else {
					const firstSpaceIndex = option.indexOf(" ");
					if (firstSpaceIndex !== -1) {
						const lastSpaceIndex = option.lastIndexOf(" ");
						optionName = option.substr(0, firstSpaceIndex);
						if (Tools.isInteger(optionName)) {
							optionNumber = parseInt(optionName);
							optionName = option.substr(firstSpaceIndex + 1);
						} else {
							if (lastSpaceIndex !== firstSpaceIndex) {
								optionName = option.substr(0, lastSpaceIndex);
								optionNumber = parseInt(option.substr(lastSpaceIndex + 1));
							} else {
								optionNumber = parseInt(option.substr(firstSpaceIndex + 1));
							}
						}
						optionName = Tools.toId(optionName);
					}
				}
			}

			if (!optionName || isNaN(optionNumber)) return ['invalidGameOption', option];

			if (optionName === 'firstto') optionName = 'points';
			if (optionName === 'points' && mode && mode.id === 'team') optionName = 'teamPoints';
			inputOptions[optionName] = optionNumber;
		}

		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions,
			inputTarget,
			mode,
			nameWithOptions: '',
			variant,
		};

		let customizableOptions: Dict<IGameOptionValues> = formatData.customizableOptions || {};
		let defaultOptions: DefaultGameOption[] = formatData.defaultOptions || [];
		let noOneVsOne: boolean = formatData.noOneVsOne || false;
		if (variant) {
			if (variant.customizableOptions) customizableOptions = variant.customizableOptions;
			if (variant.defaultOptions) defaultOptions = variant.defaultOptions;
			if (noOneVsOne && variant.noOneVsOne === false) noOneVsOne = false;
		}

		const format = Object.assign(formatData, formatComputed,
			{customizableOptions, defaultOptions, noOneVsOne, options: {}}) as IGameFormat;
		format.options = ScriptedGame.setOptions(format, mode, variant);

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
			if (format.disabled || format.tournamentGame || (filter && !filter(format))) continue;
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

	getLeastPlayedFormats(room: Room): IGameFormat[] {
		const database = Storage.getDatabase(room);
		const lastGameFormatTimes = database.lastGameFormatTimes || {};

		return this.getFormatList().sort((a, b) => {
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
			inputOptions: {},
			inputTarget,
			nameWithOptions: '',
			options: {},
		};

		return Object.assign(formatData, formatComputed);
	}

	getExistingUserHostedFormat(target: string): IUserHostedFormat {
		const format = this.getUserHostedFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	getInternalFormat(id: InternalGameKey): IGameFormat | CommandErrorArray {
		if (this.internalFormats[id].disabled) return ['disabledGameFormat', this.internalFormats[id].name];

		const formatData = Tools.deepClone(this.internalFormats[id]);
		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions: {},
			inputTarget: id,
			nameWithOptions: '',
		};

		const format = Object.assign({}, formatData, formatComputed, {customizableOptions: formatData.customizableOptions || {},
			defaultOptions: formatData.defaultOptions || []}) as IGameFormat;
		format.options = ScriptedGame.setOptions(format, undefined, undefined);

		return format;
	}

	getExistingInternalFormat(id: InternalGameKey): IGameFormat {
		const format = this.getInternalFormat(id);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
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

	requiresScriptedGame(room: Room): boolean {
		if (Config.disallowRepeatUserHostedGames && Config.disallowRepeatUserHostedGames.includes(room.id) &&
			room.id in this.lastUserHostedGames && (!(room.id in this.lastScriptedGames) ||
			this.lastUserHostedGames[room.id] > this.lastScriptedGames[room.id])) {
			return true;
		}
		return false;
	}

	canCreateGame(room: Room, format: IGameFormat): true | string {
		if (format.disabled) return CommandParser.getErrorText(['disabledGameFormat', format.name]);

		if (format.tournamentGame && (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id))) {
			return CommandParser.getErrorText(['disabledTournamentGameFeatures', room.title]);
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

			if (limitModes && format.mode && pastFormat.mode && format.mode.id === pastFormat.mode.id) {
				pastGameMode = format.mode.name;
				break;
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

		const categoryCooldown = Config.gameCategoryCooldowns && room.id in Config.gameCategoryCooldowns ?
			Config.gameCategoryCooldowns[room.id] : DEFAULT_CATEGORY_COOLDOWN;
		if (pastGameCategory && categoryGamesBetween < categoryCooldown) {
			const remainingGames = categoryCooldown - categoryGamesBetween;
			return remainingGames + " more game" + (remainingGames > 1 ? "s" : "") + " must be played before another " + format.category +
				" game.";
		}

		if (pastGameMode) {
			return "There is another " + pastGameMode + "-mode game on the past games list.";
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

	createGame(room: Room | User, format: IGameFormat, pmRoom?: Room, isMinigame?: boolean, initialSeed?: PRNGSeed): ScriptedGame {
		if (!isMinigame) this.clearAutoCreateTimer(room as Room);

		if (format.class.loadData && !format.class.loadedData) {
			if (format.nonTrivialLoadData) {
				room.say("Loading data for " + Users.self.name + "'s first " + format.name + " game since updating...");
			}
			format.class.loadData(room);
			format.class.loadedData = true;
		}

		room.game = new format.class(room, pmRoom, initialSeed);
		if (isMinigame) room.game.isMiniGame = true;
		room.game.initialize(format);

		if (isMinigame) {
			if (format.options.points) format.options.points = 1;
			if (!format.freejoin && 'freejoin' in format.customizableOptions) format.options.freejoin = 1;
		}

		return room.game;
	}

	createChildGame(format: IGameFormat, parentGame: ScriptedGame): ScriptedGame {
		const childGame = this.createGame(parentGame.room, format, parentGame.pmRoom, false, parentGame.prng.seed.slice() as PRNGSeed);
		childGame.canLateJoin = false;
		childGame.parentGame = parentGame;

		parentGame.room.game = childGame;
		return childGame;
	}

	createUserHostedGame(room: Room, format: IUserHostedFormat, host: User | string): UserHostedGame {
		this.clearAutoCreateTimer(room);

		room.userHostedGame = new format.class(room);
		room.userHostedGame.initialize(format);
		room.userHostedGame.setHost(host);

		if (!(room.id in this.lastUserHostTimes)) this.lastUserHostTimes[room.id] = {};
		if (typeof host === 'string') {
			this.lastUserHostTimes[room.id][Tools.toId(host)] = Date.now();
		} else {
			this.lastUserHostTimes[room.id][host.id] = Date.now();
		}

		return room.userHostedGame;
	}

	disableFormat(format: IGameFormat): void {
		if (format.id in this.formats) {
			// @ts-expect-error
			this.formats[format.id].disabled = true;
		}
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
			if (global.Games.reloadInProgress || (room.game && room.game.isMiniGame)) {
				this.setAutoCreateTimer(room, type, 5 * 1000);
				return;
			}

			delete this.autoCreateTimerData[room.id];
			const database = Storage.getDatabase(room);
			const now = Date.now();
			if (type === 'tournament') {
				CommandParser.parse(room, Users.self, Config.commandCharacter + "createrandomtournamentgame", now);
			} else if (type === 'scripted' || !database.userHostedGameQueue || !database.userHostedGameQueue.length) {
				CommandParser.parse(room, Users.self, Config.commandCharacter + "startvote", now);
			} else if (type === 'userhosted') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				CommandParser.parse(room, Users.self, Config.commandCharacter + "nexthost", now);
			}
		}, timer);
	}

	clearAutoCreateTimer(room: Room): void {
		if (room.id in this.autoCreateTimers) clearTimeout(this.autoCreateTimers[room.id]);
		delete this.autoCreateTimerData[room.id];
	}

	setGameCooldownMessageTimer(room: Room, minigameCooldownMinutes: number, timer?: number): void {
		if (!timer) timer = minigameCooldownMinutes * 60 * 1000;

		this.gameCooldownMessageTimerData[room.id] = {endTime: Date.now() + timer, minigameCooldownMinutes};
		this.gameCooldownMessageTimers[room.id] = setTimeout(() => {
			delete this.gameCooldownMessageTimerData[room.id];
			delete this.gameCooldownMessageTimers[room.id];
			room.say("There " + (minigameCooldownMinutes === 1 ? "is **1 minute**" : "are **" + minigameCooldownMinutes +
				" minutes**") + " of the game cooldown remaining so minigames can now be played!");
		}, timer);
	}

	/** Returns a list of standard abilities for games
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean, gen?: number): readonly IAbility[] {
		if (!gen) gen = Dex.gen;
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
		if (!gen) gen = Dex.gen;
		const dex = Dex.getDex('gen' + gen);
		return this.getAbilitiesList(filter, gen).map(x => dex.getAbilityCopy(x));
	}

	/** Returns a list of standard items for games
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean, gen?: number): readonly IItem[] {
		if (!gen) gen = Dex.gen;
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
		if (!gen) gen = Dex.gen;
		const dex = Dex.getDex('gen' + gen);
		return this.getItemsList(filter, gen).map(x => dex.getItemCopy(x));
	}

	/** Returns a list of standard moves for games
	 *
	 * filterItem: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean, gen?: number): readonly IMove[] {
		if (!gen) gen = Dex.gen;
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
		if (!gen) gen = Dex.gen;
		const dex = Dex.getDex('gen' + gen);
		return this.getMovesList(filter, gen).map(x => dex.getMoveCopy(x));
	}

	/** Returns a list of standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(filter?: (pokemon: IPokemon) => boolean, gen?: number): readonly IPokemon[] {
		if (!gen) gen = Dex.gen;
		const mod = 'gen' + gen;
		if (!Object.prototype.hasOwnProperty.call(this.pokemonLists, mod)) {
			const baseList = Dex.getDex(mod).getPokemonList();
			const list: IPokemon[] = [];
			for (const pokemon of baseList) {
				if (!pokemon.name) continue;
				list.push(pokemon);
			}
			this.pokemonLists[mod] = list;
		}

		if (!filter) return this.pokemonLists[mod];

		const filteredList: IPokemon[] = [];
		for (const pokemon of this.pokemonLists[mod]) {
			if (!filter(pokemon)) continue;
			filteredList.push(pokemon);
		}

		return filteredList;
	}

	/** Returns a list of copied standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(filter?: (pokemon: IPokemon) => boolean, gen?: number): IPokemonCopy[] {
		if (!gen) gen = Dex.gen;
		const dex = Dex.getDex('gen' + gen);
		return this.getPokemonList(filter, gen).map(x => dex.getPokemonCopy(x));
	}

	getEffectivenessScore(source: string | IMove, target: string | readonly string[] | IPokemon): number {
		if (Dex.isImmune(source, target)) {
			return IMMUNE_MATCHUP_SCORE;
		}

		const effectiveness = Dex.getEffectiveness(source, target);
		if (effectiveness === -2) {
			return 0.25;
		} else if (effectiveness === -1) {
			return 0.5;
		} else if (effectiveness === 1) {
			return 2;
		} else if (effectiveness === 2) {
			return 4;
		}

		return 1;
	}

	getCombinedEffectivenessScore(attacker: IPokemon, defender: string | readonly string[] | IPokemon): number {
		let combinedScore = 1;
		for (const type of attacker.types) {
			const score = this.getEffectivenessScore(type, defender);
			if (score === IMMUNE_MATCHUP_SCORE) {
				combinedScore = IMMUNE_MATCHUP_SCORE;
				break;
			}

			combinedScore *= score;
		}

		return combinedScore;
	}

	getMatchupWinner(attacker: IPokemon, defender: IPokemon): IPokemon | null {
		const matchupScore = this.getCombinedEffectivenessScore(attacker, defender) /
			this.getCombinedEffectivenessScore(defender, attacker);

		if (matchupScore > 1) {
			return attacker;
		}

		if (matchupScore < 1) {
			return defender;
		}

		return null;
	}

	isIncludedPokemonTier(tier: string): boolean {
		return tier !== 'Illegal' && tier !== 'Unreleased' && !tier.startsWith('(');
	}

	getTrainerCardHtml(room: Room, name: string, format?: IGameFormat | IUserHostedFormat): string {
		const id = Tools.toId(name);
		const database = Storage.getDatabase(room);
		if (!database.gameTrainerCards || !(id in database.gameTrainerCards)) return "";

		const trainerCard = database.gameTrainerCards[id];
		const avatarSpriteId = Dex.getTrainerSpriteId(trainerCard.avatar);
		if (!avatarSpriteId) return "";

		let html = '<span class="infobox" style="display: inline-block;width:250px"><center><b><username>' + name + '</username></b>';
		if (format) {
			const bits = Storage.getPoints(room, Storage.gameLeaderboard, name);
			if (bits) {
				html += '&nbsp;&bull;&nbsp;<b>' + bits + ' bits</b>';
			}
		}
		html += "<hr /><span style='display: block;height:115px";
		if (trainerCard.background) {
			html += ";background: " + Tools.hexCodes[trainerCard.background].gradient;
		}
		html += "'>";

		const emptySpan = '<span style="display: inline-block ; height: 30px ; width: 40px"></span>';
		const avatarHtml = Dex.getTrainerSprite(avatarSpriteId);
		if (trainerCard.pokemon.length) {
			if (trainerCard.pokemonGifs) {
				html += Dex.getPokemonGif(Dex.getExistingPokemon(trainerCard.pokemon[0]));
				html += avatarHtml;
				if (trainerCard.pokemon[1]) html += Dex.getPokemonGif(Dex.getExistingPokemon(trainerCard.pokemon[1]));
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
			html += avatarHtml;
		}

		html += "</span>";

		if (format) {
			const currentCache = Storage.getCurrentSourcePointsCache(room, Storage.gameLeaderboard, format.id);
			if (currentCache) {
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
		}

		html += "</center></span>";
		return html;
	}

	getScriptedBoxHtml(room: Room, gameName: string, voter?: string, description?: string, mascot?: IPokemon, shinyMascot?: boolean,
		highlightPhrase?: string, modeHighlightPhrase?: string): string {
		let scriptedBox: IGameScriptedBox | undefined;
		if (voter) {
			const user = Users.get(voter);
			if (user) voter = user.name;

			const id = Tools.toId(voter);
			const database = Storage.getDatabase(room);
			if (database.gameScriptedBoxes && id in database.gameScriptedBoxes) scriptedBox = database.gameScriptedBoxes[id];
		}

		let html = "<center>";
		html += "<span";
		if (scriptedBox && scriptedBox.background) {
			html += " style='display: block;";
			if (Tools.hexCodes[scriptedBox.background].textColor) {
				html += 'color: ' + Tools.hexCodes[scriptedBox.background].textColor + ';';
			} else {
				html += 'color: #000000;';
			}
			html += "background: " + Tools.hexCodes[scriptedBox.background].gradient + "'";
		}
		html += ">";

		if (scriptedBox && voter) {
			const icons: string[] = [];
			for (const pokemon of scriptedBox.pokemon) {
				const icon = Dex.getPokemonIcon(Dex.getExistingPokemon(pokemon));
				if (icon) icons.push(icon);
			}

			html += (icons.length ? icons.join("&nbsp;") + " " : "") + "<b>" + voter + "</b>'s pick<br /><br />";
		}

		if (mascot) {
			const gif = Dex.getPokemonGif(mascot, undefined, undefined, shinyMascot);
			if (gif) html += gif;
		}
		html += "<h3>" + gameName + "</h3>";
		if (description) html += description;

		let buttonStyle = '';
		if (scriptedBox && scriptedBox.buttons) {
			if (Tools.hexCodes[scriptedBox.buttons].textColor) {
				buttonStyle += 'color: ' + Tools.hexCodes[scriptedBox.buttons].textColor + ';';
			} else {
				buttonStyle += 'color: #000000;';
			}
			buttonStyle += "background: " + Tools.hexCodes[scriptedBox.buttons].color;
		}

		html += '<br /><br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) html += ' name="parseCommand" value="/highlight roomadd ' + highlightPhrase + '"';
		html += '>Enable game highlights</button>';
		html += '&nbsp;|&nbsp;';
		html += '<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) html += ' name="parseCommand" value="/highlight roomdelete ' + highlightPhrase + '"';
		html += '>Disable game highlights</button>';

		if (modeHighlightPhrase) {
			html += '<br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '') +
				' name="parseCommand" value="/highlight roomadd ' + modeHighlightPhrase + '">Enable mode highlights</button> | ' +
				'<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="parseCommand" ' +
				'value="/highlight roomdelete ' + modeHighlightPhrase + '">Disable mode highlights</button>';
		}

		html += "<br />&nbsp;</span></center>";

		return html;
	}

	getHostBoxHtml(room: Room, host: string, gameName: string, format?: IUserHostedFormat, highlightPhrase?: string): string {
		const id = Tools.toId(host);
		const database = Storage.getDatabase(room);
		let hostBox: IGameHostBox | undefined;
		if (database.gameHostBoxes && id in database.gameHostBoxes) hostBox = database.gameHostBoxes[id];

		let html = "<center>";
		html += "<span";
		if (hostBox && hostBox.background) {
			html += " style='display: block;";
			if (Tools.hexCodes[hostBox.background].textColor) {
				html += 'color: ' + Tools.hexCodes[hostBox.background].textColor + ';';
			} else {
				html += 'color: #000000;';
			}
			html += "background: " + Tools.hexCodes[hostBox.background].gradient + "'";
		}
		html += ">";

		if (hostBox && hostBox.pokemon.length) {
			const gifs: string[] = [];
			for (let i = 0; i < hostBox.pokemon.length; i++) {
				const gif = Dex.getPokemonGif(Dex.getExistingPokemon(hostBox.pokemon[i]), undefined, undefined, hostBox.shinyPokemon[i]);
				if (gif) gifs.push(gif);
			}

			html += gifs.join("&nbsp;");
		}

		html += "<h3>" + gameName + "</h3>";
		if (format) {
			html += format.description;
		} else {
			html += "The game's description will be displayed here";
		}

		let buttonStyle = '';
		if (hostBox && hostBox.buttons) {
			if (Tools.hexCodes[hostBox.buttons].textColor) {
				buttonStyle += 'color: ' + Tools.hexCodes[hostBox.buttons].textColor + ';';
			} else {
				buttonStyle += 'color: #000000;';
			}
			buttonStyle += "background: " + Tools.hexCodes[hostBox.buttons].color;
		}

		html += '<br /><br /><button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) html += ' name="parseCommand" value="/highlight roomadd ' + highlightPhrase + '"';
		html += '>Enable game highlights</button>';
		html += '&nbsp;|&nbsp;';
		html += '<button class="button"' + (buttonStyle ? ' style="' + buttonStyle + '"' : '');
		if (highlightPhrase) html += ' name="parseCommand" value="/highlight roomdelete ' + highlightPhrase + '"';
		html += '>Disable game highlights</button>';
		html += "<br />&nbsp;</span></center>";

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

		const header = room.title + " Game Catalog";
		let document: string[] = ["# " + header];

		let subHeader = "This document contains information on all ";
		if (allowsScriptedGames && allowsUserHostedGames) {
			subHeader += "scripted and user-hosted";
		} else if (allowsScriptedGames) {
			subHeader += "scripted";
		} else if (allowsUserHostedGames) {
			subHeader += "user-hosted";
		}
		subHeader += " games that can be played in the " + room.title + " room.";
		document.push(subHeader);

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
				"* <code>" + commandCharacter + "store [key], [message or command]</code> - store one of many messages or commands " +
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

			document = document.concat(userHostCommands);
		}

		let allowOneVsOneGames = false;
		if (Config.allowOneVsOneGames) {
			if (Config.allowOneVsOneGames.includes(room.id)) {
				allowOneVsOneGames = true;
			} else if (Config.subRooms && room.id in Config.subRooms) {
				for (const subRoom of Config.subRooms[room.id]) {
					if (Config.allowOneVsOneGames.includes(subRoom)) {
						allowOneVsOneGames = true;
						break;
					}
				}
			}
		}

		if (allowOneVsOneGames) {
			const oneVsOneGames: string[] = ["## One vs. one challenges", "Commands:",
				"* <code>" + commandCharacter + "1v1c [user], [game]</code> - challenge [user] to a game of [game] (see list below)",
				"* <code>" + commandCharacter + "a1v1c</code> - accept a challenge",
				"* <code>" + commandCharacter + "r1v1c</code> - reject a challenge",
				"* <code>" + commandCharacter + "c1v1c</code> - cancel a challenge",
				"* <code>" + commandCharacter + "ccdown [room], 1v1</code> - check your one vs. one challenge cooldown time for " +
					"[room] in PMs",
				"\n\nCompatible games:",
			];
			const keys = Object.keys(this.formats);
			keys.sort();
			for (const key of keys) {
				const format = this.getExistingFormat(key);
				if (format.disabled || format.tournamentGame || format.noOneVsOne) continue;
				oneVsOneGames.push("* " + format.name + "\n");
			}

			document = document.concat(oneVsOneGames);
		}

		const defaultCategory = "Uncategorized";
		if (allowsScriptedGames) {
			const categories: Dict<string[]> = {};
			const formatKeys = Object.keys(this.formats);
			formatKeys.sort();

			const formats: IGameFormat[] = [];
			for (const key of formatKeys) {
				const format = this.getExistingFormat(key);
				if (format.disabled || format.tournamentGame) continue;
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
			categoryKeys.splice(categoryKeys.indexOf(defaultCategory), 1);
			categoryKeys.push(defaultCategory);
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
			document = document.concat(scriptedGames);
		}

		if (allowsGameAchievements) {
			const internalFormatKeys = Object.keys(this.internalFormats) as InternalGameKey[];
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

			document = document.concat(achievements);
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

			document = document.concat(userHostedGames);
		}

		const content = document.join("\n").trim();
		if (room.id in this.lastCatalogUpdates && this.lastCatalogUpdates[room.id] === content) return;
		this.lastCatalogUpdates[room.id] = content;

		const filename = Config.gameCatalogGists[room.id].files[0];

		Tools.editGist(Config.githubApiCredentials.gist.username, Config.githubApiCredentials.gist.token,
			Config.gameCatalogGists[room.id].id, Config.gameCatalogGists[room.id].description, {[filename]: {content, filename}});
	}
}

export const instantiate = (): void => {
	const oldGames = global.Games as Games | undefined;

	global.Games = new Games();

	if (oldGames) {
		global.Games.onReload(oldGames);
	}
};
