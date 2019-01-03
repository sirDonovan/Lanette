import fs = require('fs');
import path = require('path');
import { ICommandDefinition } from './command-parser';
import { commands, Game } from "./room-game";
import { Room } from "./rooms";
import { User } from './users';

interface IGameClass<T> {
	new(room: Room): T;
	loadData?(room: Room): void;
}

export interface IGameFile<T extends Game = Game> {
	class: IGameClass<T>;
	description: string;
	name: string;

	aliases?: string[];
	commands?: Dict<ICommandDefinition<T>>;
	commandDescriptions?: string[];
	freejoin?: boolean;
	mascot?: string;
	mascots?: string[];
	variants?: IGameVariant[];
}

interface IGameVariant {
	name: string;
	variant: string;

	description?: string;
}

export interface IGameFileComputed extends IGameFile {
	id: string;
}

export interface IGameFormatComputed {
	inputOptions: Dict<number>;

	variant?: IGameVariant;
}

export interface IGameFormat extends IGameFileComputed, IGameFormatComputed {}

export class Games {
	aliasesCache: Dict<string> = {};
	commandNames: string[] = Object.keys(commands);
	commands = commands;
	formatsCache: Dict<IGameFileComputed> = {};
	loadedFormats: boolean = false;

	get aliases(): Dict<string> {
		if (!this.loadedFormats) this.loadFormats();
		return this.aliasesCache;
	}

	get formats(): Dict<IGameFileComputed> {
		if (!this.loadedFormats) this.loadFormats();
		return this.formatsCache;
	}

	loadFormats() {
		this.aliasesCache = {};
		this.commandNames = Object.keys(commands);
		this.formatsCache = {};

		const gamesDirectory = path.join(__dirname, '/games');
		const gameFiles = fs.readdirSync(gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const file = require(gamesDirectory + '/' + gameFiles[i]).game as IGameFile;
			const id = Tools.toId(file.name);
			this.formatsCache[id] = Object.assign({id}, file);
		}

		for (const i in this.formatsCache) {
			const format = this.formatsCache[i];
			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.formatsCache) throw new Error(format.name + "'s alias '" + alias + "' is the name of another game");
					if (alias in this.aliasesCache) throw new Error(format.name + "'s alias '" + alias + "' is already used by " + this.aliasesCache[alias]);
					this.aliasesCache[alias] = format.name;
				}
			}

			if (format.commands) {
				format.commands = CommandParser.loadCommands(format.commands);
				for (const i in format.commands) {
					if (!this.commandNames.includes(i)) this.commandNames.push(i);
				}
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
	}

	/**
	 * Returns a copy of the format
	 */
	getFormat(target: string, user?: User): IGameFormat | false {
		const targets = target.split(",");
		const id = Tools.toId(targets[0]);
		targets.shift();
		if (id in this.aliases) return this.getFormat(this.aliases[id] + (targets.length ? "," + targets.join(",") : ""), user);
		if (!(id in this.formats)) {
			if (user) user.say("'" + target + "' is not a valid game format.");
			return false;
		}
		const formatData = this.formats[id];
		const inputOptions: Dict<number> = {};
		let variant: IGameVariant | undefined;
		for (let i = 0, len = targets.length; i < len; i++) {
			const targetId = Tools.toId(targets[i]);
			if (!targetId) continue;
			if (formatData.variants) {
				let matchingVariant: IGameVariant | undefined;
				for (let i = 0; i < formatData.variants.length; i++) {
					if (Tools.toId(formatData.variants[i].variant) === targetId) {
						matchingVariant = formatData.variants[i];
						break;
					}
				}
				if (matchingVariant) {
					if (variant) {
						if (user) user.say("You can only specify 1 game variant.");
						return false;
					}
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
					if (firstSpaceIndex === -1) continue;
					const lastSpaceIndex = option.lastIndexOf(" ");
					name = option.substr(0, firstSpaceIndex);
					if (Tools.isNumber(name)) {
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

			if (!name || isNaN(optionNumber)) {
				if (user) user.say("'" + option + "' is not a valid variation or option.");
				return false;
			}

			if (name === 'firstto') name = 'points';
			inputOptions[name] = optionNumber;
		}
		const formatComputed: IGameFormatComputed = {
			inputOptions,
			variant,
		};
		return Object.assign({}, formatData, formatComputed);
	}

	createGame(room: Room, format: IGameFormat): Game {
		if (format.class.loadData) format.class.loadData(room);
		room.game = new format.class(room);
		room.game.initialize(format);

		return room.game;
	}
}
