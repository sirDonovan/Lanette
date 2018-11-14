import { Command } from "./command-parser";
import { Room } from "./rooms";
import { User } from "./users";

interface ICommandDefinition {
	command: (this: Command, target: string, room: Room, user: User, alias: string) => void;
	aliases?: string[];
}

const baseCommands: Dict<ICommandDefinition> = {
	eval: {
		command(target, room, user) {
			if (!user.isDeveloper()) return;
			try {
				// tslint:disable-next-line no-eval
				const result = eval(target);
				this.say(result);
			} catch (e) {
				this.say(e.message);
			}
		},
		aliases: ['js'],
	},
};

const commands: Dict<Pick<ICommandDefinition, Exclude<keyof ICommandDefinition, "aliases">>> = {};
for (const i in baseCommands) {
	const command = baseCommands[i];
	if (command.aliases) {
		const aliases = command.aliases.slice();
		delete command.aliases;
		for (let i = 0; i < aliases.length; i++) {
			commands[Tools.toId(aliases[i])] = command;
		}
	}
	commands[i] = command;
}

export = commands;
