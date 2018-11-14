import { Room } from "./rooms";
import { User } from "./users";

export class Command {
	originalCommand: string;
	room: Room | User;
	target: string;
	user: User;

	constructor(originalCommand: string, target: string, room: Room | User, user: User) {
		this.originalCommand = originalCommand;
		this.target = target;
		this.room = room;
		this.user = user;
	}

	say(message: string) {
		this.room.say(message);
	}

	run(newCommand?: string, newTarget?: string) {
		let command = this.originalCommand;
		if (newCommand) {
			command = Tools.toId(newCommand);
			if (!(command in Commands)) throw new Error(this.originalCommand + " ran non-existent command '" + newCommand + '"');
		}
		const target = newTarget || this.target;
		Commands[command].command.call(this, target, this.room, this.user, command);
	}
}

export class CommandParser {
	parse(room: Room | User, user: User, message: string) {
		if (message.charAt(0) !== Config.commandCharacter) return;
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
		if (!(command in Commands)) return;

		(new Command(command, target, room, user)).run();
	}
}
