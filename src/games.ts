import fs = require('fs');
import path = require('path');

import { CommandErrorArray, ICommandDefinition } from './command-parser';
import { UserHosted } from './games/internal/user-hosted';
import { PRNG, PRNGSeed } from './prng';
import { DefaultGameOption, Game, IGameOptionValues } from "./room-game";
import { Room } from "./rooms";
import { IGameFile, IGameFileComputed, IGameFormat, IGameFormatComputed, IGameMode, IGameModeFile, IGameTemplateFile, IGameVariant, IInternalGames, InternalGameKey, IUserHostedComputed, IUserHostedFile, IUserHostedFormat, IUserHostedFormatComputed, UserHostedCustomizable } from './types/games';
import { IWorker } from './types/global-types';
import { User } from './users';

const gamesDirectory = path.join(__dirname, 'games');
// tslint:disable-next-line no-var-requires
const userHosted = require(path.join(gamesDirectory, "internal", "user-hosted.js")).game as IUserHostedFile;
const internalGamePaths: IInternalGames = {
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

	readonly aliases: Dict<string> = {};
	autoCreateTimers: Dict<NodeJS.Timer> = {};
	readonly commands: typeof sharedCommands = Object.assign(Object.create(null), sharedCommands);
	readonly formats: Dict<IGameFileComputed> = {};
	// @ts-ignore - set in loadFormats()
	readonly internalFormats: KeyedDict<IInternalGames, IGameFileComputed> = {};
	lastGames: Dict<number> = {};
	lastScriptedGames: Dict<number> = {};
	lastUserHostedGames: Dict<number> = {};
	lastUserHostTimes: Dict<Dict<number>> = {};
	readonly minigameCommandNames: Dict<{aliases: string[], format: string}> = {};
	readonly modes: Dict<IGameMode> = {};
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
		const copied = Object.assign({}, template, game);
		if (template.commands && !game.commands) copied.commands = Tools.deepClone(copied.commands);

		return copied;
	}

	loadFormats() {
		const internalGameKeys = Object.keys(internalGamePaths) as (keyof IInternalGames)[];
		for (let i = 0; i < internalGameKeys.length; i++) {
			const file = require(internalGamePaths[internalGameKeys[i]]).game as IGameFile;
			const id = Tools.toId(file.name);
			let commands;
			if (file.commands) {
				commands = CommandParser.loadCommands(file.commands);
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
			if (file.commands) commands = CommandParser.loadCommands(file.commands);
			this.formats[id] = Object.assign({}, file, {commands, id});
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (let i = 0; i < modeFiles.length; i++) {
			if (!modeFiles[i].endsWith('.js')) continue;
			const file = require(path.join(modesDirectory, modeFiles[i])).mode as IGameModeFile;
			const id = Tools.toId(file.name);
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
						format.variants[i].variantAliases = format.variants[i].variantAliases!.map(x => Tools.toId(x));
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

			if (format.modes) {
				for (let i = 0; i < format.modes.length; i++) {
					format.modes[i] = Tools.toId(format.modes[i]);
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
				command(target, room, user, command) {
					if (this.isPm(room)) {
						if (user.game) user.game.tryCommand(target, user, user, command);
						user.rooms.forEach((value, room) => {
							if (room.game) room.game.tryCommand(target, user, user, command);
						});
					} else {
						if (room.game) room.game.tryCommand(target, room, user, command);
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
					if (format.minigameDescription) this.say("**" + format.name + "**: " + format.minigameDescription);
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
			if (formatData.modes && formatData.modes.includes(targetId)) {
				if (mode) return ['tooManyGameModes'];
				mode = this.modes[targetId];
				continue;
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

		const format = Object.assign(formatData, formatComputed, {customizableOptions, defaultOptions});
		Game.setOptions(format, mode, variant);

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
		};

		return Object.assign(formatData, formatComputed);
	}

	getExistingUserHostedFormat(target: string): IUserHostedFormat {
		const format = this.getUserHostedFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
	}

	getInternalFormat(id: InternalGameKey): IGameFormat {
		const formatData = this.internalFormats[id];
		const formatComputed: IGameFormatComputed = {
			effectType: "GameFormat",
			inputOptions: {},
			inputTarget: id,
			nameWithOptions: '',
		};
		return Object.assign({}, formatData, formatComputed, {customizableOptions: formatData.customizableOptions || {}, defaultOptions: formatData.defaultOptions || []});
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
			if (room.game.options.points) room.game.options.points = 1;
		}

		return room.game;
	}

	createUserHostedGame(room: Room, format: IUserHostedFormat, host: User | string): UserHosted {
		if (room.id in this.autoCreateTimers) clearTimeout(this.autoCreateTimers[room.id]);

		room.userHostedGame = new format.class(room);
		room.userHostedGame.initialize((format as unknown) as IGameFormat);
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
}
