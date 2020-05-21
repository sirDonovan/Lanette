import { ICommandDefinition } from "../command-parser";

/* eslint-disable @typescript-eslint/explicit-function-return-type */

// commands are defined the same way as in src/commands.ts
export const commands: Dict<ICommandDefinition> = {
	pluginexample: {
		command(target, room, user) {
			this.say("This is an example plugin command.");
		},
		developerOnly: true,
	},
};

/* eslint-enable */