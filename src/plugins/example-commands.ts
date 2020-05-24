import type { ICommandDefinition } from "../command-parser";

/* eslint-disable @typescript-eslint/explicit-function-return-type */

// commands are defined the same way as in src/commands.ts
const commandsDict: Dict<ICommandDefinition> = {
	pluginexample: {
		command(target, room, user) {
			this.say("This is an example plugin command.");
		},
		developerOnly: true,
	},
};

export const commands = commandsDict;

/* eslint-enable */