import fs = require('fs');
import path = require('path');

import { CommandErrorArray, ICommandDefinition } from './command-parser';
import { UserHosted } from './games/internal/user-hosted';
import { PRNG, PRNGSeed } from './prng';
import { DefaultGameOption, Game, IGameOptionValues } from "./room-game";
import { Room } from "./rooms";
import { GameCommandReturnType, IGameFile, IGameFormat, IGameFormatComputed, IGameFormatData, IGameMode, IGameModeFile, IGameTemplateFile, IGameVariant, IInternalGames, InternalGameKey, IUserHostedComputed, IUserHostedFile, IUserHostedFormat, IUserHostedFormatComputed, UserHostedCustomizable } from './types/games';
import { IWorker } from './types/global-types';
import { IAbility, IAbilityCopy, IItem, IItemCopy, IMove, IMoveCopy, IPokemon, IPokemonCopy } from './types/in-game-data-types';
import { User } from './users';

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
	readonly userHostedAliases: Dict<string> = {};
	readonly userHostedFormats: Dict<IUserHostedComputed> = {};
	readonly workers: IWorker[] = [];

	onReload(previous: Partial<Games>) {
		if (previous.autoCreateTimers) this.autoCreateTimers = previous.autoCreateTimers;
		if (previous.lastGames) this.lastGames = previous.lastGames;
		if (previous.lastScriptedGames) this.lastScriptedGames = previous.lastScriptedGames;
		if (previous.lastUserHostedGames) this.lastUserHostedGames = previous.lastUserHostedGames;
		if (previous.lastUserHostTimes) this.lastUserHostTimes = previous.lastUserHostTimes;
	}

	unrefWorkers() {
		for (let i = 0; i < this.workers.length; i++) {
			this.workers[i].unref();
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

		const gameFiles = fs.readdirSync(gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const file = require(path.join(gamesDirectory, gameFiles[i])).game as IGameFile;
			const id = Tools.toId(file.name);
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
			let modes;
			if (file.modes) modes = file.modes.map(x => Tools.toId(x));
			this.formats[id] = Object.assign({}, file, {commands, id, modes, variants});
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (let i = 0; i < modeFiles.length; i++) {
			if (!modeFiles[i].endsWith('.js')) continue;
			const file = require(path.join(modesDirectory, modeFiles[i])).mode as IGameModeFile;
			const id = Tools.toId(file.name);
			if (file.aliases) {
				for (let i = 0; i < file.aliases.length; i++) {
					this.modeAliases[Tools.toId(file.aliases[i])] = id;
				}
			}
			this.modes[id] = Object.assign({id}, file);
		}

		for (let i = 0; i < userHosted.formats.length; i++) {
			const format = userHosted.formats[i];
			const id = Tools.toId(format.name);

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					this.userHostedAliases[Tools.toId(format.aliases[i])] = format.name;
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
					this.aliases[id] = format.name;
					idsToAlias.push(id);
				}
			}

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					this.aliases[alias] = format.name;
					idsToAlias.push(alias);
				}
			}

			if (format.commands) {
				for (const i in format.commands) {
					if (!(i in this.commands)) this.commands[i] = format.commands[i];
				}
			}

			if (format.minigameCommand) {
				this.minigameCommandNames[Tools.toId(format.minigameCommand)] = {aliases: format.minigameCommandAliases ? format.minigameCommandAliases.map(x => Tools.toId(x)) : [], format: format.name};
			}

			if (format.variants) {
				for (let i = 0; i < format.variants.length; i++) {
					const id = Tools.toId(format.variants[i].name);
					if (!(id in this.aliases)) this.aliases[id] = format.name + "," + format.variants[i].variant;
					let variantIds: string[] = [Tools.toId(format.variants[i].variant)];
					if (format.variants[i].variantAliases) {
						variantIds = variantIds.concat(format.variants[i].variantAliases!);
					}

					for (let j = 0; j < idsToAlias.length; j++) {
						for (let k = 0; k < variantIds.length; k++) {
							const alias = variantIds[k] + idsToAlias[j];
							if (!(alias in this.aliases)) this.aliases[alias] = format.name + "," + format.variants[i].variant;
						}
					}
				}
			}

			if (format.workers) {
				for (let i = 0; i < format.workers.length; i++) {
					if (!this.workers.includes(format.workers[i])) this.workers.push(format.workers[i]);
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
					if (this.isPm(room)) {
						if (user.game) await user.game.tryCommand(target, user, user, command);
						user.rooms.forEach(async (value, room) => {
							if (room.game) await room.game.tryCommand(target, user, user, command);
						});
					} else {
						if (room.game) await room.game.tryCommand(target, room, user, command);
					}
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
					if (variant.mode) {
						if (mode) return ['tooManyGameModes'];
						mode = this.modes[Tools.toId(variant.mode)];
					}
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
