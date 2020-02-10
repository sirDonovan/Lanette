import fs = require('fs');
import path = require('path');

import { CommandErrorArray, ICommandDefinition } from './command-parser';
import { UserHosted } from './games/internal/user-hosted';
import { PRNG, PRNGSeed } from './prng';
import { DefaultGameOption, Game, IGameOptionValues } from "./room-game";
import { Room } from "./rooms";
import { GameCommandReturnType, IGameFile, IGameFormat, IGameFormatComputed, IGameFormatData, IGameMode, IGameModeFile, IGameTemplateFile, IGameVariant, IInternalGames, InternalGameKey, IUserHostedComputed, IUserHostedFile, IUserHostedFormat, IUserHostedFormatComputed, UserHostedCustomizable } from './types/games';
import { IAbility, IAbilityCopy, IItem, IItemCopy, IMove, IMoveCopy, IPokemon, IPokemonCopy } from './types/in-game-data-types';
import { IPastGame } from './types/storage';
import { User } from './users';
import { ParametersWorker } from './workers/parameters';
import { PortmanteausWorker } from './workers/portmanteaus';

const DEFAULT_CATEGORY_COOLDOWN = 3;

const gamesDirectory = path.join(__dirname, 'games');
// tslint:disable-next-line no-var-requires
const userHosted = require(path.join(gamesDirectory, "internal", "user-hosted.js")).game as IUserHostedFile;
const internalGamePaths: IInternalGames = {
	eggtoss: path.join(gamesDirectory, "internal", "egg-toss.js"),
	vote: path.join(gamesDirectory, "internal", "vote.js"),
};

const sharedCommandDefinitions: Dict<ICommandDefinition<Game>> = {
	summary: {
		command(target, room, user) {
			if (!(user.id in this.players)) return false;
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
};

const sharedCommands = CommandParser.loadCommands(sharedCommandDefinitions);

interface IGamesWorkers {
	parameters: ParametersWorker;
	portmanteaus: PortmanteausWorker;
}

export class Games {
	// exported constants
	readonly sharedCommands: typeof sharedCommands = sharedCommands;
	readonly gamesDirectory: typeof gamesDirectory = gamesDirectory;
	readonly userHosted: typeof userHosted = userHosted;
	readonly scriptedGameHighlight: string = "Hosting a scriptedgame of";
	readonly userHostedGameHighlight: string = "is hosting a hostgame of";
	readonly scriptedGameVoteHighlight: string = "Hosting a scriptedgamevote";

	readonly aliases: Dict<string> = {};
	autoCreateTimers: Dict<NodeJS.Timer> = {};
	readonly commands: typeof sharedCommands = Object.assign(Object.create(null), sharedCommands);
	readonly formats: Dict<DeepReadonly<IGameFormatData>> = {};
	// @ts-ignore - set in loadFormats()
	readonly internalFormats: KeyedDict<IInternalGames, DeepReadonly<IGameFormatData>> = {};
	lastGames: Dict<number> = {};
	lastScriptedGames: Dict<number> = {};
	lastUserHostedGames: Dict<number> = {};
	lastUserHostTimes: Dict<Dict<number>> = {};
	readonly maxMoveAvailability: number = 500;
	readonly minigameCommandNames: Dict<{aliases: string[], format: string}> = {};
	readonly modes: Dict<IGameMode> = {};
	readonly modeAliases: Dict<string> = {};
	reloadInProgress: boolean = false;
	uhtmlScriptedCounts: Dict<number> = {};
	uhtmlUserHostedCounts: Dict<number> = {};
	readonly userHostedAliases: Dict<string> = {};
	readonly userHostedFormats: Dict<IUserHostedComputed> = {};
	readonly workers: IGamesWorkers = {
		parameters: new ParametersWorker(),
		portmanteaus: new PortmanteausWorker(),
	};

	onReload(previous: Partial<Games>) {
		if (previous.autoCreateTimers) this.autoCreateTimers = previous.autoCreateTimers;
		if (previous.lastGames) this.lastGames = previous.lastGames;
		if (previous.lastScriptedGames) this.lastScriptedGames = previous.lastScriptedGames;
		if (previous.lastUserHostedGames) this.lastUserHostedGames = previous.lastUserHostedGames;
		if (previous.lastUserHostTimes) this.lastUserHostTimes = previous.lastUserHostTimes;
		if (previous.uhtmlScriptedCounts) this.uhtmlScriptedCounts = previous.uhtmlScriptedCounts;
		if (previous.uhtmlUserHostedCounts) this.uhtmlUserHostedCounts = previous.uhtmlUserHostedCounts;

		this.loadFormats();
	}

	unrefWorkers() {
		const workers = Object.keys(this.workers) as (keyof IGamesWorkers)[];
		for (let i = 0; i < workers.length; i++) {
			this.workers[workers[i]].unref();
		}
	}

	copyTemplateProperties<T extends Game, U extends Game>(template: IGameTemplateFile<T>, game: IGameFile<U>): IGameFile<U> {
		return Object.assign(Tools.deepClone(template), game);
	}

	loadFormats() {
		const internalGameKeys = Object.keys(internalGamePaths) as (keyof IInternalGames)[];
		for (let i = 0; i < internalGameKeys.length; i++) {
			const file = require(internalGamePaths[internalGameKeys[i]]).game as IGameFile;
			const id = Tools.toId(file.name);
			let commands;
			if (file.commands) {
				commands = CommandParser.loadCommands<Game, GameCommandReturnType>(Tools.deepClone(file.commands));
				for (const i in commands) {
					if (!(i in this.commands)) this.commands[i] = commands[i];
				}
			}
			this.internalFormats[internalGameKeys[i]] = Object.assign({}, file, {commands, id});
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (let i = 0; i < modeFiles.length; i++) {
			if (!modeFiles[i].endsWith('.js')) continue;
			const file = require(path.join(modesDirectory, modeFiles[i])).mode as IGameModeFile;
			const id = Tools.toId(file.name);
			if (id in this.modes) throw new Error("The name '" + file.name + "' is already used by another mode.");
			if (file.aliases) {
				for (let i = 0; i < file.aliases.length; i++) {
					const alias = Tools.toId(file.aliases[i]);
					if (alias in this.modeAliases) throw new Error(file.name + " mode's alias '" + file.aliases[i] + " is already used by " + this.modes[this.modeAliases[alias]].name + ".");
					this.modeAliases[alias] = id;
				}
			}
			this.modes[id] = Object.assign({}, file, {id});
		}

		const gameFiles = fs.readdirSync(gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const file = require(path.join(gamesDirectory, gameFiles[i])).game as IGameFile;
			const id = Tools.toId(file.name);
			if (id in this.formats) throw new Error("The name '" + file.name + "' is already used by another game.");
			let commands;
			if (file.commands) commands = CommandParser.loadCommands<Game, GameCommandReturnType>(Tools.deepClone(file.commands));
			let variants;
			if (file.variants) {
				variants = Tools.deepClone(file.variants);
				for (let i = 0; i < variants.length; i++) {
					if (variants[i].variantAliases) {
						variants[i].variantAliases = variants[i].variantAliases!.map(x => Tools.toId(x));
					}
				}
			}
			let modes: string[] | undefined;
			if (file.modes) {
				modes = [];
				for (let i = 0; i < file.modes.length; i++) {
					const mode = Tools.toId(file.modes[i]);
					if (!(mode in this.modes)) throw new Error(file.name + "'s mode '" + file.modes[i] + "' is not a valid mode.");
					modes.push(mode);
				}
			}
			this.formats[id] = Object.assign({}, file, {commands, id, modes, variants});
		}

		for (let i = 0; i < userHosted.formats.length; i++) {
			const format = userHosted.formats[i];
			const id = Tools.toId(format.name);
			if (id in this.userHostedFormats) throw new Error("The name '" + format.name + "' is already used by another user-hosted format.");

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.userHostedFormats) throw new Error(format.name + "'s alias '" + format.aliases[i] + "' is the name of another user-hosted format.");
					if (alias in this.userHostedAliases) throw new Error(format.name + "'s alias '" + format.aliases[i] + "' is already an alias for " + this.userHostedAliases[alias] + ".");
					this.userHostedAliases[alias] = format.name;
				}
			}

			this.userHostedFormats[id] = Object.assign({}, format, {
				class: userHosted.class,
				id,
			});
		}

		for (const i in this.formats) {
			const format = this.formats[i];
			const idsToAlias: string[] = [format.id];
			if (format.formerNames) {
				for (let i = 0; i < format.formerNames.length; i++) {
					const id = Tools.toId(format.formerNames[i]);
					if (id in this.formats) throw new Error(format.name + "'s former name '" + format.formerNames[i] + "' is already used by another game.");
					if (id in this.aliases) throw new Error(format.name + "'s former name '" + format.formerNames[i] + "' is already an alias for " + this.aliases[id] + ".");
					this.aliases[id] = format.name;
					idsToAlias.push(id);
				}
			}

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.aliases) throw new Error(format.name + "'s alias '" + format.aliases[i] + "' is already an alias for " + this.aliases[alias] + ".");
					this.aliases[alias] = format.name;
					idsToAlias.push(alias);
				}
			}

			if (format.commands) {
				for (const i in format.commands) {
					if (i in BaseCommands) throw new Error(format.name + " command '" + i + "' already exists as a regular command.");
					if (!(i in this.commands)) this.commands[i] = format.commands[i];
				}
			}

			if (format.minigameCommand) {
				const command = Tools.toId(format.minigameCommand);
				if (command in this.minigameCommandNames) throw new Error(format.name + "'s minigame command '" + format.minigameCommand + "' is already a minigame command for " + this.minigameCommandNames[command].format + ".");
				this.minigameCommandNames[command] = {aliases: format.minigameCommandAliases ? format.minigameCommandAliases.map(x => Tools.toId(x)) : [], format: format.name};
			}

			if (format.variants) {
				for (let i = 0; i < format.variants.length; i++) {
					const id = Tools.toId(format.variants[i].name);
					if (id in this.aliases) throw new Error(format.name + "'s variant '" + format.variants[i].name + "' is already an alias for " + this.aliases[id] + ".");
					this.aliases[id] = format.name + "," + format.variants[i].variant;
					let variantIds: string[] = [Tools.toId(format.variants[i].variant)];
					if (format.variants[i].variantAliases) {
						variantIds = variantIds.concat(format.variants[i].variantAliases!);
					}

					for (let j = 0; j < idsToAlias.length; j++) {
						for (let k = 0; k < variantIds.length; k++) {
							const alias = variantIds[k] + idsToAlias[j];
							if (alias in this.aliases) throw new Error(format.name + "'s variant " + format.variants[i].name + " variant alias '" + variantIds[k] + "' clashes with the alias for " + this.aliases[alias] + ".");
							if (!(alias in this.aliases)) this.aliases[alias] = format.name + "," + format.variants[i].variant;
						}
					}
				}
			}
		}

		for (const i in this.modes) {
			const mode = this.modes[i];
			if (mode.commands) {
				for (const i in mode.commands) {
					if (!(i in this.commands)) this.commands[i] = mode.commands[i];
				}
			}
		}

		this.loadFormatCommands();
	}

	loadFormatCommands() {
		for (const i in this.commands) {
			Commands[i] = {
				async asyncCommand(target, room, user, command) {
					let returnedResult: boolean = false;
					if (this.isPm(room)) {
						if (user.game) {
							const result = await user.game.tryCommand(target, user, user, command);
							if (result) returnedResult = result;
						}
						user.rooms.forEach(async (value, room) => {
							if (room.game) {
								const result = await room.game.tryCommand(target, user, user, command);
								if (result) returnedResult = result;
							}
						});
					} else {
						if (room.game) {
							const result = await room.game.tryCommand(target, room, user, command);
							if (result) returnedResult = result;
						}
					}

					return returnedResult;
				},
			};
		}

		for (const name in this.minigameCommandNames) {
			const formatName = this.minigameCommandNames[name].format;
			Commands[name] = {
				command(target, room, user, command) {
					let pmRoom: Room | undefined;
					if (this.isPm(room)) {
						user.rooms.forEach((rank, room) => {
							if (!pmRoom && ((Config.allowScriptedGames && Config.allowScriptedGames.includes(room.id)) || (Config.allowUserHostedGames && Config.allowUserHostedGames.includes(room.id))) &&
								Users.self.hasRank(room, 'bot')) pmRoom = room;
						});
						if (!pmRoom) return this.say("You must be in a room that has enabled scripted games and where " + Users.self.name + " has Bot rank (*).");
					} else {
						if (!user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
						if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) return this.sayError(['disabledGameFeatures', room.title]);
						if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
						const remainingGameCooldown = global.Games.getRemainingGameCooldown(room, true);
						if (remainingGameCooldown > 1000) {
							const durationString = Tools.toDurationString(remainingGameCooldown);
							this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the minigame cooldown remaining.");
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
			for (let i = 0; i < this.minigameCommandNames[name].aliases.length; i++) {
				Commands[this.minigameCommandNames[name].aliases[i]] = Commands[name];
			}
		}
	}

	/**
	 * Returns a copy of the format
	 */
	getFormat(target: string, checkDisabled?: boolean): IGameFormat | CommandErrorArray {
		const inputTarget = target;
		const targets = target.split(",");
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
		for (let i = 0; i < targets.length; i++) {
			const targetId = Tools.toId(targets[i]);
			if (!targetId) continue;
			if (formatData.modes) {
				const modeId = targetId in this.modeAliases ? this.modeAliases[targetId] : targetId;
				if (formatData.modes.includes(modeId)) {
					if (mode) return ['tooManyGameModes'];
					mode = this.modes[modeId];
					continue;
				}
			}
			if (formatData.variants) {
				let matchingVariant: IGameVariant | undefined;
				for (let i = 0; i < formatData.variants.length; i++) {
					if (Tools.toId(formatData.variants[i].variant) === targetId || (formatData.variants[i].variantAliases && formatData.variants[i].variantAliases!.includes(targetId))) {
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
			const option = targets[i].trim();
			let name = '';
			let optionNumber = 0;
			if (option.includes(":")) {
				const parts = option.split(":");
				name = Tools.toId(parts[0]);
				optionNumber = parseInt(parts[1].trim());
			} else {
				const optionId = Tools.toId(option);
				if (optionId === 'freejoin' || optionId === 'fj') {
					name = 'freejoin';
					optionNumber = 1;
				} else {
					const firstSpaceIndex = option.indexOf(" ");
					if (firstSpaceIndex !== -1) {
						const lastSpaceIndex = option.lastIndexOf(" ");
						name = option.substr(0, firstSpaceIndex);
						if (Tools.isInteger(name)) {
							optionNumber = parseInt(name);
							name = option.substr(firstSpaceIndex + 1);
						} else {
							if (lastSpaceIndex !== firstSpaceIndex) {
								name = option.substr(0, lastSpaceIndex);
								optionNumber = parseInt(option.substr(lastSpaceIndex + 1));
							} else {
								optionNumber = parseInt(option.substr(firstSpaceIndex + 1));
							}
						}
						name = Tools.toId(name);
					}
				}
			}

			if (!name || isNaN(optionNumber)) return ['invalidGameOption', option];

			if (name === 'firstto') name = 'points';
			if (name === 'points' && mode && mode.id === 'team') name = 'teamPoints';
			inputOptions[name] = optionNumber;
		}

		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions,
			inputTarget,
			mode,
			nameWithOptions: '',
			variant,
		};

		let customizableOptions: Dict<IGameOptionValues>;
		if (variant && variant.customizableOptions) {
			customizableOptions = variant.customizableOptions;
		} else {
			customizableOptions = formatData.customizableOptions || {};
		}

		let defaultOptions: DefaultGameOption[];
		if (variant && variant.defaultOptions) {
			defaultOptions = variant.defaultOptions;
		} else {
			defaultOptions = formatData.defaultOptions || [];
		}

		const format = Object.assign(formatData, formatComputed, {customizableOptions, defaultOptions, options: {}});
		format.options = Game.setOptions(format, mode, variant);

		return format;
	}

	getExistingFormat(target: string): IGameFormat {
		const format = this.getFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	/**
	 * Returns a copy of the format
	 */
	getUserHostedFormat(target: string, user?: User): IUserHostedFormat | CommandErrorArray {
		const inputTarget = target;
		const targets = target.split(",");
		const name = targets[0];
		targets.shift();
		const id = Tools.toId(name);
		if (id in this.userHostedAliases) return this.getUserHostedFormat(this.userHostedAliases[id] + (targets.length ? "," + targets.join(",") : ""), user);

		let formatData: IUserHostedComputed | undefined;
		if (id in this.userHostedFormats) {
			formatData = Tools.deepClone(this.userHostedFormats[id]);
		} else {
			const scriptedFormat = this.getFormat(id + (targets.length ? "," + targets.join(",") : ""));
			if (Array.isArray(scriptedFormat)) {
				if (scriptedFormat[0] !== 'invalidGameFormat') return scriptedFormat;
			} else if (!scriptedFormat.scriptedOnly) {
				formatData = Object.assign(Tools.deepClone(scriptedFormat), {
					class: userHosted.class,
					commands: null,
					commandDescriptions: null,
					mode: null,
				});
			}
		}
		if (!formatData) return ['invalidUserHostedGameFormat', name];

		if (formatData.customizableAttributes) {
			for (let i = 0; i < targets.length; i++) {
				const colonIndex = targets[i].indexOf(':');
				if (colonIndex === -1) continue;
				const attribute = Tools.toId(targets[i].substr(0, colonIndex)) as UserHostedCustomizable;
				if (!formatData.customizableAttributes.includes(attribute)) continue;
				const value = targets[i].substr(colonIndex + 1).trim();
				if (attribute === 'link') {
					if (!value.startsWith('https://')) return ['invalidHttpsLink'];
				}
				if (value) formatData[attribute] = value;
			}
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

	getInternalFormat(id: InternalGameKey): IGameFormat {
		const formatData = Tools.deepClone(this.internalFormats[id]);
		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions: {},
			inputTarget: id,
			nameWithOptions: '',
		};
		return Object.assign({}, formatData, formatComputed, {customizableOptions: formatData.customizableOptions || {}, defaultOptions: formatData.defaultOptions || [], options: {}});
	}

	getRandomFormat(room: Room): IGameFormat {
		return this.getRandomFormats(room, 1)[0];
	}

	getRandomFormats(room: Room, amount: number): IGameFormat[] {
		const formats: IGameFormat[] = [];
		const keys = Tools.shuffle(Object.keys(this.formats));
		for (let i = 0; i < keys.length; i++) {
			const format = this.getExistingFormat(keys[i]);
			if (format.disabled) continue;
			formats.push(format);
			if (formats.length === amount) break;
		}
		return formats;
	}

	getRemainingGameCooldown(room: Room, isMinigame?: boolean): number {
		if (Config.gameCooldownTimers && room.id in Config.gameCooldownTimers && room.id in this.lastGames) {
			const now = Date.now();
			let cooldown = Config.gameCooldownTimers[room.id] * 60 * 1000;
			if (isMinigame) cooldown /= 2;
			return cooldown - (now - this.lastGames[room.id]);
		}
		return 0;
	}

	requiresScriptedGame(room: Room): boolean {
		if (Config.disallowRepeatUserHostedGames && Config.disallowRepeatUserHostedGames.includes(room.id) && room.id in this.lastUserHostedGames &&
			(!(room.id in this.lastScriptedGames) || this.lastUserHostedGames[room.id] > this.lastScriptedGames[room.id])) {
			return true;
		}
		return false;
	}

	canCreateGame(room: Room, format: IGameFormat): true | string {
		const database = Storage.getDatabase(room);
		const pastGames = database.pastGames || [];

		if (Config.disallowCreatingPastGames && Config.disallowCreatingPastGames.includes(room.id) && this.isInPastGames(room, format.inputTarget, pastGames)) {
			return format.name + " is on the past games list.";
		}

		if (Config.disallowCreatingPreviousUserHostedGame && Config.disallowCreatingPreviousUserHostedGame.includes(room.id)) {
			const database = Storage.getDatabase(room);
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

		const limitVariants = format.variant && Config.limitGamesByVariant && Config.limitGamesByVariant.includes(room.id) ? true : false;
		const limitModes = format.mode && Config.limitGamesByMode && Config.limitGamesByMode.includes(room.id) ? true : false;
		const limitCategories = format.category && Config.limitGamesByCategory && Config.limitGamesByCategory.includes(room.id) ? true : false;
		let pastGameCategory = false;
		let categoryGamesBetween = 0;

		for (let i = pastGames.length - 1; i >= 0; i--) {
			const pastFormat = this.getFormat(pastGames[i].inputTarget);
			if (Array.isArray(pastFormat)) {
				if (format.category) categoryGamesBetween++;
				continue;
			}

			if (limitVariants && format.variant && pastFormat.variant && format.variant.variant === pastFormat.variant.variant) {
				return "There is another " + format.variant.variant + "-variant game on the past games list.";
			}
			if (limitModes && format.mode && pastFormat.mode && format.mode.id === pastFormat.mode.id) {
				return "There is another " + format.mode.name + "-mode game on the past games list.";
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

		const categoryCooldown = Config.gameCategoryCooldowns && room.id in Config.gameCategoryCooldowns ? Config.gameCategoryCooldowns[room.id] : DEFAULT_CATEGORY_COOLDOWN;
		if (pastGameCategory && categoryGamesBetween < categoryCooldown) {
			const remainingGames = categoryCooldown - categoryGamesBetween;
			return remainingGames + " more game" + (remainingGames > 1 ? "s" : "") + " must be played before another " + format.category + " game.";
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

		for (let i = 0; i < pastGames.length; i++) {
			const pastFormat = this.getFormat(pastGames[i].inputTarget);
			const id = Array.isArray(pastFormat) ? Tools.toId(pastGames[i].name) : pastFormat.id;
			if (formatId === id) return true;
		}

		return false;
	}

	createGame(room: Room | User, format: IGameFormat, pmRoom?: Room, isMinigame?: boolean, initialSeed?: PRNGSeed): Game {
		if (!isMinigame && room.id in this.autoCreateTimers) clearTimeout(this.autoCreateTimers[room.id]);

		if (format.class.loadData) format.class.loadData(room);
		room.game = new format.class(room, pmRoom);
		if (initialSeed) room.game.prng = new PRNG(initialSeed);
		room.game.initialize(format);

		if (isMinigame) {
			room.game.isMiniGame = true;
			if (format.options.points) format.options.points = 1;
		}

		return room.game;
	}

	createUserHostedGame(room: Room, format: IUserHostedFormat, host: User | string): UserHosted {
		if (room.id in this.autoCreateTimers) clearTimeout(this.autoCreateTimers[room.id]);

		room.userHostedGame = new format.class(room);
		room.userHostedGame.initialize(format);
		room.userHostedGame.setHost(host);

		return room.userHostedGame;
	}

	setAutoCreateTimer(room: Room, type: 'scripted' | 'userhosted', timer: number) {
		if (room.id in this.autoCreateTimers) clearTimeout(this.autoCreateTimers[room.id]);
		this.autoCreateTimers[room.id] = setTimeout(() => {
			if (room.game && room.game.isMiniGame) {
				this.setAutoCreateTimer(room, type, 5 * 1000);
				return;
			}
			const database = Storage.getDatabase(room);
			if (type === 'scripted' || !database.userHostedGameQueue || !database.userHostedGameQueue.length) {
				CommandParser.parse(room, Users.self, Config.commandCharacter + "startvote");
			} else if (type === 'userhosted') {
				CommandParser.parse(room, Users.self, Config.commandCharacter + "nexthost");
			}
		}, timer);
	}

	/** Returns a list of standard abilities for games
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean, gen?: string): IAbility[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = dex.getAbilitiesList(filter);
		const list: IAbility[] = [];
		for (let i = 0; i < baseList.length; i++) {
			const ability = baseList[i];
			if (!ability.name) continue;
			list.push(ability);
		}
		return list;
	}

	/** Returns a list of copied standard abilities for games
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesCopyList(filter?: (ability: IAbility) => boolean, gen?: string): IAbilityCopy[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = this.getAbilitiesList(filter, gen);
		const list: IAbilityCopy[] = [];
		for (let i = 0; i < baseList.length; i++) {
			list.push(dex.getAbilityCopy(baseList[i].name));
		}
		return list;
	}

	/** Returns a list of standard items for games
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean, gen?: string): IItem[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = dex.getItemsList(filter);
		const list: IItem[] = [];
		for (let i = 0; i < baseList.length; i++) {
			const item = baseList[i];
			if (!item.name) continue;
			list.push(item);
		}
		return list;
	}

	/** Returns a list of copied standard items for games
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsCopyList(filter?: (item: IItem) => boolean, gen?: string): IItemCopy[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = this.getItemsList(filter);
		const list: IItemCopy[] = [];
		for (let i = 0; i < baseList.length; i++) {
			list.push(dex.getItemCopy(baseList[i].name));
		}
		return list;
	}

	/** Returns a list of standard moves for games
	 *
	 * filterItem: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean, gen?: string): IMove[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = dex.getMovesList(filter);
		const list: IMove[] = [];
		for (let i = 0; i < baseList.length; i++) {
			const move = baseList[i];
			if (!move.name) continue;
			list.push(move);
		}
		return list;
	}

	/** Returns a list of copied standard moves for games
	 *
	 * filterItem: Return `false` to filter `move` out of the list
	 */
	getMovesCopyList(filter?: (move: IMove) => boolean, gen?: string): IMoveCopy[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = this.getMovesList(filter);
		const list: IMoveCopy[] = [];
		for (let i = 0; i < baseList.length; i++) {
			list.push(dex.getMoveCopy(baseList[i].name));
		}
		return list;
	}

	/** Returns a list of standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(filter?: (pokemon: IPokemon) => boolean, gen?: string): IPokemon[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = dex.getPokemonList(filter);
		const list: IPokemon[] = [];
		for (let i = 0; i < baseList.length; i++) {
			const pokemon = baseList[i];
			if (!pokemon.species) continue;
			list.push(pokemon);
		}
		return list;
	}

	/** Returns a list of copied standard Pokemon for games
	 *
	 * filterItem: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(filter?: (pokemon: IPokemon) => boolean, gen?: string): IPokemonCopy[] {
		let dex = Dex;
		if (gen) dex = Dex.getDex(gen);
		const baseList = this.getPokemonList(filter);
		const list: IPokemonCopy[] = [];
		for (let i = 0; i < baseList.length; i++) {
			list.push(dex.getPokemonCopy(baseList[i].name));
		}
		return list;
	}

	isIncludedPokemonTier(tier: string): boolean {
		return tier !== 'Illegal' && tier !== 'Unreleased' && tier.charAt(0) !== '(';
	}
}
