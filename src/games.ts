import fs = require('fs');
import path = require('path');
import { ICommandDefinition } from './command-parser';
import { commands, Game } from "./room-game";
import { Room } from "./rooms";

interface IGameClass<T> {
	new(room: Room): T;
}

export interface IGameFile<T extends Game = Game> {
	class: IGameClass<T>;
	description: string;
	name: string;

	aliases?: string[];
	commands?: Dict<ICommandDefinition<T>>;
	mascot?: string;
	mascots?: string[];
}

export interface IGameFormat extends IGameFile {
	id: string;
}

export class Games {
	aliasesCache = {} as Dict<string>;
	commandNames = Object.keys(commands);
	commands = commands;
	formatsCache = {} as Dict<IGameFormat>;
	loadedFormats = false;

	get aliases(): Dict<string> {
		if (!this.loadedFormats) this.loadFormats();
		return this.aliasesCache;
	}

	get formats(): Dict<IGameFormat> {
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

	getFormat(target: string): IGameFormat | false {
		const id = Tools.toId(target);
		if (id in this.aliases) return this.getFormat(this.aliases[id]);
		if (!(id in this.formats)) return false;
		return this.formats[id];
	}

	createGame(room: Room, format: IGameFormat) {
		const game = new format.class(room);
		game.initialize(format);

		room.game = game;
	}
}
