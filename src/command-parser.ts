import { Room } from "./rooms";
import { User } from "./users";

export interface ICommandDefinition<T = undefined> {
	command: (this: T extends undefined ? Command : T, target: string, room: Room | User, user: User, alias: string) => void;
	aliases?: string[];
	readonly chatOnly?: boolean;
	readonly developerOnly?: boolean;
	readonly globalGameCommand?: boolean;
	readonly pmGameCommand?: boolean;
	readonly pmOnly?: boolean;
}

export type CommandsDict<T = undefined> = Dict<Pick<ICommandDefinition<T>, Exclude<keyof ICommandDefinition<T>, "aliases">>>;

export class Command {
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

	say(message: string) {
		this.room.say(message);
	}

	sayCommand(message: string) {
		this.room.sayCommand(message);
	}

	sayHtml(html: string, pmHtmlRoom: Room) {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmHtml(this.user, html);
		} else {
			this.room.sayHtml(html);
		}
	}

	run(newCommand?: string, newTarget?: string) {
		let command = this.originalCommand;
		if (newCommand) {
			command = Tools.toId(newCommand);
			if (!(command in Commands)) throw new Error(this.originalCommand + " ran non-existent command '" + newCommand + '"');
		}
		if (Commands[command].developerOnly && !this.user.isDeveloper()) return;
		if (this.pm) {
			if (Commands[command].chatOnly) return;
		} else {
			if (Commands[command].pmOnly) return;
		}
		const target = newTarget !== undefined ? newTarget : this.target;
		Commands[command].command.call(this, target, this.room, this.user, command);
	}

	runMultipleTargets(delimiter: string) {
		if (!delimiter) return;
		const parts = this.target.split(delimiter);
		const lastMultipleTarget = parts.length - 1;
		this.runningMultipleTargets = true;
		for (let i = 0; i < parts.length; i++) {
			if (i === lastMultipleTarget) this.runningMultipleTargets = false;
			this.run(this.originalCommand, parts[i].trim());
		}
	}

	isPm(room: Room | User): room is User {
		return this.pm;
	}

	canPmHtml(room: Room): boolean {
		if (!this.user.rooms.has(room)) {
			this.say("You must be in the room to use this command.");
			return false;
		}
		return true;
	}
}

export class CommandParser {
	loadCommands<T = undefined>(commands: Dict<ICommandDefinition<T>>): CommandsDict<T> {
		const dict: CommandsDict<T> = {};
		for (const i in commands) {
			const command = Object.assign({}, commands[i]);
			if (command.chatOnly && command.pmOnly) throw new Error(i + " cannot be both a chat-only and a pm-only command");
			if (command.chatOnly && command.pmGameCommand) throw new Error(i + " cannot be both a chat-only and a pm game command");
			if (command.aliases) {
				const aliases = command.aliases.slice();
				delete command.aliases;
				for (let i = 0; i < aliases.length; i++) {
					dict[Tools.toId(aliases[i])] = command;
				}
			}
			dict[Tools.toId(i)] = command;
		}

		return dict;
	}

	loadBaseCommands<T = undefined>(commands: Dict<ICommandDefinition<T>>): CommandsDict<T> {
		return Object.assign(Object.create(null), this.loadCommands(commands));
	}

	/** Returns true if the message contains a command */
	parse(room: Room | User, user: User, message: string): boolean {
		if (message.charAt(0) !== Config.commandCharacter) return false;
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
		if (!(command in Commands)) return false;

		(new Command(command, target, room, user)).run();
		return true;
	}
}
