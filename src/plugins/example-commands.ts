import type { CommandContext } from "../command-parser";
import type { CommandDefinitions } from "../types/command-parser";

// commands are defined the same way as in src/commands.ts

const commandsDict: CommandDefinitions<CommandContext> = {
	pluginexample: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars
		command(target, room, user) {
			this.say("This is an example plugin command.");
		},
		developerOnly: true,
	},
};

export const commands = commandsDict;
