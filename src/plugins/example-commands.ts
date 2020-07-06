import type { Command } from "../command-parser";
import type { ICommandDefinition } from "../types/command-parser";

/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types */

// commands are defined the same way as in src/commands.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commandsDict: Dict<ICommandDefinition<Command, any>> = {
	pluginexample: {
		command(target, room, user) {
			this.say("This is an example plugin command.");
		},
		developerOnly: true,
	},
};

export const commands = commandsDict;

/* eslint-enable */