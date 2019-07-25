import fs = require('fs');
import path = require('path');
import { CommandErrorArray } from './command-parser';
import { UserHosted } from './games/templates/user-hosted';
import { commands, Game } from "./room-game";
import { Room } from "./rooms";
import { IGameFile, IGameFileComputed, IGameFormat, IGameFormatComputed, IGameMode, IGameModeFile, IGameVariant, IUserHostedComputed, IUserHostedFile, IUserHostedFormat, IUserHostedFormatComputed } from './types/games';
import { User } from './users';

const gamesDirectory = path.join(__dirname, 'games');
// tslint:disable-next-line no-var-requires
const userHosted = require(path.join(gamesDirectory, "templates", "user-hosted.js")).game as IUserHostedFile;

export class Games {
	readonly aliasesCache: Dict<string> = {};
	readonly commandNames: string[] = Object.keys(commands);
	readonly commands = commands;
	readonly formatsCache: Dict<IGameFileComputed> = {};
	lastGames: Dict<number> = {};
	lastScriptedGames: Dict<number> = {};
	lastUserHostedGames: Dict<number> = {};
	loadedFormats: boolean = false;
	readonly minigameCommandNames: Dict<{aliases: string[], format: string}> = {};
	readonly modesCache: Dict<IGameMode> = {};
	readonly userHostedAliasesCache: Dict<string> = {};
	readonly userHostedFormatsCache: Dict<IUserHostedComputed> = {};

	get aliases(): Dict<string> {
		if (!this.loadedFormats) this.loadFormats();
		return this.aliasesCache;
	}

	get formats(): Dict<IGameFileComputed> {
		if (!this.loadedFormats) this.loadFormats();
		return this.formatsCache;
	}

	get modes(): Dict<IGameMode> {
		if (!this.loadedFormats) this.loadFormats();
		return this.modesCache;
	}

	get userHostedAliases(): Dict<string> {
		if (!this.loadedFormats) this.loadFormats();
		return this.userHostedAliasesCache;
	}

	get userHostedFormats(): Dict<IUserHostedComputed> {
		if (!this.loadedFormats) this.loadFormats();
		return this.userHostedFormatsCache;
	}

	onReload(previous: Games) {
		this.lastGames = previous.lastGames;
		this.lastScriptedGames = previous.lastScriptedGames;
		this.lastUserHostedGames = previous.lastUserHostedGames;
	}

	loadFormats() {
		if (this.loadedFormats) return;

		const gameFiles = fs.readdirSync(gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const file = require(gamesDirectory + '/' + gameFiles[i]).game as IGameFile;
			const id = Tools.toId(file.name);
			if (id in this.formatsCache) throw new Error("'" + id + "' is the name of another game");
			this.formatsCache[id] = Object.assign({id}, file);
		}

		const modesDirectory = path.join(gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (let i = 0; i < modeFiles.length; i++) {
			if (!modeFiles[i].endsWith('.js')) continue;
			const file = require(modesDirectory + '/' + modeFiles[i]).mode as IGameModeFile;
			const id = Tools.toId(file.name);
			if (id in this.modesCache) throw new Error("'" + id + "' is the name of another game mode");
			this.modesCache[id] = Object.assign({id}, file);
		}

		for (let i = 0; i < userHosted.formats.length; i++) {
			const format = userHosted.formats[i];
			const id = Tools.toId(format.name);

			if (id in this.userHostedFormatsCache) throw new Error("'" + id + "' is the name of another user-hosted game");

			if (format.formerNames) {
				for (let i = 0; i < format.formerNames.length; i++) {
					const id = Tools.toId(format.formerNames[i]);
					if (id in this.userHostedFormatsCache) throw new Error(this.userHostedFormatsCache[id].name + " is the former name of another game");
					if (id in this.userHostedAliasesCache) throw new Error(this.userHostedAliasesCache[id] + "'s alias '" + id + "' is the former name of another game");
					this.userHostedAliasesCache[id] = format.name;
				}
			}

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.userHostedFormatsCache) throw new Error(format.name + "'s alias '" + alias + "' is the name of another user-hosted game");
					if (alias in this.userHostedAliasesCache) throw new Error(format.name + "'s alias '" + alias + "' is already used by " + this.userHostedAliasesCache[alias]);
					this.userHostedAliasesCache[alias] = format.name;
				}
			}

			this.userHostedFormatsCache[id] = Object.assign({}, format, {
				class: userHosted.class,
				id,
			});
		}

		for (const i in this.formatsCache) {
			const format = this.formatsCache[i];
			const idsToAlias: string[] = [format.id];
			if (format.formerNames) {
				for (let i = 0; i < format.formerNames.length; i++) {
					const id = Tools.toId(format.formerNames[i]);
					if (id in this.formatsCache) throw new Error(this.formatsCache[id].name + " is the former name of another game");
					if (id in this.aliasesCache) throw new Error(this.aliasesCache[id] + "'s alias '" + id + "' is the former name of another game");
					this.aliasesCache[id] = format.name;
					idsToAlias.push(id);
				}
			}

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.formatsCache) throw new Error(format.name + "'s alias '" + alias + "' is the name of another game");
					if (alias in this.aliasesCache) throw new Error(format.name + "'s alias '" + alias + "' is already used by " + this.aliasesCache[alias]);
					this.aliasesCache[alias] = format.name;
					idsToAlias.push(alias);
				}
			}

			if (format.commands) {
				format.commands = CommandParser.loadCommands(format.commands);
				for (const i in format.commands) {
					if (!this.commandNames.includes(i)) this.commandNames.push(i);
				}
			}

			if (format.minigameCommand) {
				const minigameCommand = Tools.toId(format.minigameCommand);
				if (this.minigameCommandNames.hasOwnProperty(minigameCommand)) throw new Error(format.name + "'s minigame command '" + minigameCommand + "' is already used by " + this.minigameCommandNames[minigameCommand]);
				this.minigameCommandNames[minigameCommand] = {aliases: format.minigameCommandAliases ? format.minigameCommandAliases.map(x => Tools.toId(x)) : [], format: format.name};
			}

			if (format.variants) {
				for (let i = 0; i < format.variants.length; i++) {
					const id = Tools.toId(format.variants[i].name);
					if (id in this.formatsCache) throw new Error("Variant " + format.variants[i].name + " is the name of another game");
					if (id in this.modesCache) throw new Error("Variant " + format.variants[i].name + " is the name of a game mode");
					if (!(id in this.aliasesCache)) this.aliasesCache[id] = format.name + "," + format.variants[i].variant;
					let variantIds: string[] = [Tools.toId(format.variants[i].variant)];
					if (format.variants[i].variantAliases) {
						format.variants[i].variantAliases = format.variants[i].variantAliases!.map(x => Tools.toId(x));
						variantIds = variantIds.concat(format.variants[i].variantAliases!);
					}

					for (let j = 0; j < idsToAlias.length; j++) {
						for (let k = 0; k < variantIds.length; k++) {
							const alias = variantIds[k] + idsToAlias[j];
							if (!(alias in this.aliasesCache)) this.aliasesCache[alias] = format.name + "," + format.variants[i].variant;
						}
					}
				}
			}

			if (format.modes) {
				for (let i = 0; i < format.modes.length; i++) {
					const id = Tools.toId(format.modes[i]);
					if (!(id in this.modesCache)) throw new Error("'" + format.modes[i] + "' is not a valid mode");
					format.modes[i] = id;
				}
			}
		}

		for (const i in this.modesCache) {
			const mode = this.modesCache[i];
			if (mode.commands) {
				for (const i in mode.commands) {
					if (!this.commandNames.includes(i)) this.commandNames.push(i);
				}
			}
		}

		for (const name in this.minigameCommandNames) {
			if (this.commandNames.includes(name)) throw new Error("Minigame command '" + name + "' is a regular command for another game");
			for (let i = 0; i < this.minigameCommandNames[name].aliases.length; i++) {
				const alias = this.minigameCommandNames[name].aliases[i];
				if (this.commandNames.includes(alias)) throw new Error("Minigame command alias '" + alias + "' (" + name + ") is a regular command for another game");
			}
		}

		this.loadedFormats = true;
		this.loadFormatCommands();
	}

	loadFormatCommands() {
		for (let i = 0; i < this.commandNames.length; i++) {
			const commandName = this.commandNames[i];
			Commands[commandName] = {
				command(target, room, user, command) {
					if (this.isPm(room)) {
						if (user.game && commandName in user.game.commands) {
							user.game.commands[commandName].command.call(room.game, target, user, user, command);
						}
						user.rooms.forEach((value, room) => {
							if (room.game && commandName in room.game.commands && (room.game.commands[commandName].pmOnly || room.game.commands[commandName].pmGameCommand)) {
								room.game.commands[commandName].command.call(room.game, target, user, user, command);
							}
						});
					} else {
						if (room.game) {
							if (commandName in room.game.commands && !room.game.commands[commandName].pmOnly) {
								room.game.commands[commandName].command.call(room.game, target, room, user, command);
							}
						}
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
					const format = global.Games.getFormat(formatName + (target ? "," + target : ""), user);
					if (Array.isArray(format)) return this.sayError(format);
					delete format.inputOptions.points;
					const game = global.Games.createGame(room, format, pmRoom);
					game.isMiniGame = true;
					if (game.options.points) game.options.points = 1;
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
	getFormat(target: string, user?: User): IGameFormat | CommandErrorArray {
		const targets = target.split(",");
		const name = targets[0];
		targets.shift();
		const id = Tools.toId(name);
		if (id in this.aliases) return this.getFormat(this.aliases[id] + (targets.length ? "," + targets.join(",") : ""), user);
		if (!(id in this.formats)) return ['invalidGameFormat', name];
		const formatData = this.formats[id];
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
			mode,
			variant,
		};
		return Object.assign({}, formatData, formatComputed);
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
		const targets = target.split(",");
		const name = targets[0];
		targets.shift();
		const id = Tools.toId(name);
		if (id in this.userHostedAliases) return this.getUserHostedFormat(this.userHostedAliases[id] + (targets.length ? "," + targets.join(",") : ""), user);
		let formatData: IUserHostedComputed | undefined;
		if (id in this.userHostedFormats) {
			formatData = this.userHostedFormats[id];
		} else {
			const scriptedFormat = this.getFormat(id + (targets.length ? "," + targets.join(",") : ""));
			if (Array.isArray(scriptedFormat)) {
				if (scriptedFormat[0] !== 'invalidGameFormat') return scriptedFormat;
			} else if (!scriptedFormat.scriptedOnly) {
				formatData = Object.assign({}, scriptedFormat, {
					class: userHosted.class,
					commands: null,
					commandDescriptions: null,
					mode: null,
				});
			}
		}
		if (!formatData) return ['invalidUserHostedGameFormat', name];

		const formatComputed: IUserHostedFormatComputed = {
			effectType: "UserHostedFormat",
			inputOptions: {},
		};
		return Object.assign({}, formatData, formatComputed);
	}

	getExistingUserHostedFormat(target: string): IUserHostedFormat {
		const format = this.getUserHostedFormat(target);
		if (Array.isArray(format)) throw new Error(format.join(": "));
		return format;
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

	createGame(room: Room | User, format: IGameFormat, pmRoom?: Room): Game {
		if (format.class.loadData) format.class.loadData(room);
		room.game = new format.class(room, pmRoom);
		room.game.initialize(format);

		return room.game;
	}

	createUserHostedGame(room: Room, format: IUserHostedFormat, host: User | string): UserHosted {
		room.userHostedGame = new format.class(room);
		room.userHostedGame.setHost(host);
		room.userHostedGame.initialize((format as unknown) as IGameFormat);

		return room.userHostedGame;
	}
}
