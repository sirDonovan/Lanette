import type { Room } from "./rooms";
import type { BaseLoadedCommands, CommandErrorArray, CommandDefinitions, LoadedCommands } from "./types/command-parser";
import type { User } from "./users";

export class CommandContext {
	runningMultipleTargets: boolean | null = null;

	readonly originalCommand: string;
	readonly pm: boolean;
	readonly room: Room | User;
	readonly target: string;
	readonly user: User;

	constructor(originalCommand: string, target: string, room: Room | User, user: User) {
		this.originalCommand = originalCommand;
		this.target = target;
		this.room = room;
		this.user = user;

		this.pm = room === user;
	}

	say(message: string, dontPrepare?: boolean, dontCheckFilter?: boolean): void {
		this.room.say(message, {dontPrepare, dontCheckFilter});
	}

	sayCommand(message: string, dontCheckFilter?: boolean): void {
		this.room.sayCommand(message, dontCheckFilter);
	}

	sayHtml(html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmHtml(this.user, html);
		} else {
			this.room.sayHtml(html);
		}
	}

	sayUhtml(uhtmlName: string, html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmUhtml(this.user, uhtmlName, html);
		} else {
			this.room.sayUhtml(uhtmlName, html);
		}
	}

	sayUhtmlChange(uhtmlName: string, html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmUhtmlChange(this.user, uhtmlName, html);
		} else {
			this.room.sayUhtmlChange(uhtmlName, html);
		}
	}

	sayError(error: CommandErrorArray): void {
		this.say(global.CommandParser.getErrorText(error));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async run(newCommand?: string, newTarget?: string): Promise<any> {
		let command = this.originalCommand;
		if (newCommand) {
			command = Tools.toId(newCommand);
			if (!(command in Commands)) throw new Error(this.originalCommand + " ran non-existent command '" + newCommand + '"');
		}
		if (Commands[command].developerOnly && !this.user.isDeveloper() && this.user !== Users.self) return;
		if (this.pm) {
			if (Commands[command].chatOnly) return;
		} else {
			if (Commands[command].pmOnly) return;
		}
		const target = newTarget !== undefined ? newTarget : this.target;

		if (Commands[command].asyncCommand) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return await Commands[command].asyncCommand!.call(this, target, this.room, this.user, command);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return Commands[command].command!.call(this, target, this.room, this.user, command);
		}
	}

	async runMultipleTargets(delimiter: string): Promise<void> {
		if (!delimiter) return;
		const parts = this.target.split(delimiter);
		const lastMultipleTarget = parts.length - 1;
		this.runningMultipleTargets = true;
		for (let i = 0; i < parts.length; i++) {
			if (i === lastMultipleTarget) this.runningMultipleTargets = false;
			await this.run(this.originalCommand, parts[i].trim());
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	isPm(room: Room | User): room is User {
		return this.pm;
	}

	sanitizeResponse(response: string, allowedCommands?: string[]): string {
		response = response.trim();

		const serverCommand = response.startsWith('!');
		while (response.startsWith('/') || response.startsWith('!')) {
			response = response.substr(1).trim();
		}

		if (serverCommand && allowedCommands && allowedCommands.includes(Tools.toId(response.split(" ")[0]))) {
			return '!' + response;
		}
		return response;
	}
}

export class CommandParser {
	loadCommands<ThisContext, ReturnType>(commands: CommandDefinitions<ThisContext, ReturnType>): LoadedCommands<ThisContext, ReturnType> {
		const dict: LoadedCommands<ThisContext, ReturnType> = {};
		const allAliases: LoadedCommands<ThisContext, ReturnType> = {};
		for (const i in commands) {
			const commandId = Tools.toId(i);
			if (commandId in dict) throw new Error("Command '" + i + "' is defined in more than 1 location");

			const command = Tools.deepClone(commands[i]);
			if (command.chatOnly && command.pmOnly) throw new Error("Command '" + i + "' cannot be both chat-only and pm-only");
			if (command.chatOnly && command.pmGameCommand) {
				throw new Error("Command '" + i + "' cannot be both chat-only and a pm game command");
			}
			if (command.aliases) {
				const aliases = command.aliases.slice();
				delete command.aliases;
				for (const alias of aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in dict) throw new Error("Command " + i + "'s alias '" + alias + "' is already a command");
					if (aliasId in allAliases) throw new Error("Command " + i + "'s alias '" + alias + "' is an alias for another command");
					allAliases[aliasId] = command;
				}
			}

			dict[commandId] = command;
		}

		for (const i in allAliases) {
			dict[i] = allAliases[i];
		}

		return dict;
	}

	loadBaseCommands(commands: CommandDefinitions<CommandContext>): BaseLoadedCommands {
		const allPluginCommands: CommandDefinitions<CommandContext> = {};
		if (Plugins) {
			for (const plugin of Plugins) {
				if (plugin.commands) {
					for (const i in plugin.commands) {
						if (i in allPluginCommands) throw new Error("Plugin command '" + i + "' is defined in more than 1 plugin file.");
					}

					Object.assign(allPluginCommands, plugin.commands);
				}
			}
		}

		return Object.assign(Object.create(null),
			Object.assign(this.loadCommands(commands), this.loadCommands(allPluginCommands))) as BaseLoadedCommands;
	}

	isCommandMessage(message: string): boolean {
		return Config.commandCharacter ? message.startsWith(Config.commandCharacter) : false;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async parse(room: Room | User, user: User, message: string): Promise<any> {
		if (!this.isCommandMessage(message)) return;
		message = message.substr(1);
		let command: string;
		let target: string;
		const spaceIndex = message.indexOf(' ');
		if (spaceIndex === -1) {
			command = message;
			target = '';
		} else {
			command = message.substr(0, spaceIndex);
			target = message.substr(spaceIndex + 1).trim();
		}
		command = Tools.toId(command);
		if (!(command in Commands)) {
			if (room.game) {
				// send PM for wrong game command
				await room.game.tryCommand(target, room, user, command);
			}
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return await new CommandContext(command, target, room, user).run();
	}

	getErrorText(error: CommandErrorArray): string {
		if (error[0] === 'invalidBotRoom') {
			if (error[1]) return "'" + error[1].trim() + "' is not one of " + Users.self.name + "'s rooms.";
			return "You must specify one of " + Users.self.name + "'s rooms.";
		} else if (error[0] === 'invalidAbility') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid ability.";
			return "You must specify a valid ability.";
		} else if (error[0] === 'invalidFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid format.";
			return "You must specify a valid format.";
		} else if (error[0] === 'invalidGameFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid game format.";
			return "You must specify a valid game format.";
		} else if (error[0] === 'invalidItem') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid item.";
			return "You must specify a valid item.";
		} else if (error[0] === 'invalidMove') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid move.";
			return "You must specify a valid move.";
		} else if (error[0] === 'invalidPokemon') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid Pokemon.";
			return "You must specify a valid Pokemon.";
		} else if (error[0] === 'invalidTournamentFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid tournament format.";
			return "You must specify a valid tournament format.";
		} else if (error[0] === 'invalidUserHostedGameFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid user-hosted game format.";
			return "You must specify a valid user-hosted game format.";
		} else if (error[0] === 'invalidType') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid type.";
			return "You must specify a valid type.";
		} else if (error[0] === 'invalidGameOption') {
			return "'" + error[1].trim() + "' is not a valid game variant or option.";
		} else if (error[0] === 'tooManyGameModes') {
			return "You must specify only 1 game mode.";
		} else if (error[0] === 'tooManyGameVariants') {
			return "You must specify only 1 game variant.";
		} else if (error[0] === 'emptyUserHostedGameQueue') {
			return "The host queue is empty.";
		} else if (error[0] === 'noPmHtmlRoom') {
			return "You must be in " + error[1].trim() + " to use this command in PMs.";
		} else if (error[0] === 'missingBotRankForFeatures') {
			return Users.self.name + " requires Bot rank (*) to use " + error[1].trim() + " features.";
		} else if (error[0] === 'disabledTournamentFeatures') {
			return "Tournament features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledGameFeatures') {
			return "Scripted game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledTournamentGameFeatures') {
			return "Scripted tournament game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledUserHostedGameFeatures') {
			return "User-hosted game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledUserHostedTournamentFeatures') {
			return "User-hosted tournament features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'noRoomEventInformation') {
			return error[1].trim() + " does not currently have any event information stored.";
		} else if (error[0] === 'invalidRoomEvent') {
			return "You must specify one of " + error[1].trim() + "'s events.";
		} else if (error[0] === 'disabledGameFormat') {
			return error[1].trim() + " is currently disabled.";
		} else if (error[0] === 'invalidUserInRoom') {
			return "You must specify a user currently in the room.";
		} else if (error[0] === 'invalidUsernameLength') {
			return "You must specify a valid username (between 1 and " + Tools.maxUsernameLength + " characters).";
		} else if (error[0] === 'reloadInProgress') {
			return Users.self.name + " is currently updating. Please try again shortly!";
		} else if (error[0] === 'invalidHttpsLink') {
			return "You must specify a valid HTTPS link.";
		} else if (error[0] === 'noPmGameRoom') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			return "You must be in a room that has enabled scripted games and where " + Users.self.name + " has Bot rank (*).";
		}

		return "";
	}
}

export const instantiate = (): void => {
	global.CommandParser = new CommandParser();
};