import child_process = require('child_process');

import type { BaseCommandDefinitions } from "../types/command-parser";

export const commands: BaseCommandDefinitions = {
	eval: {
		command(target, room, user) { // eslint-disable-line @typescript-eslint/no-unused-vars
			try {
				let result = eval(target) as unknown;
				if (result === null) {
					result = "null";
				} else if (result === undefined) {
					result = "undefined";
				} else if (typeof result === 'string' && !result) {
					result = '""';
				} else if (typeof result === 'number' && !result) {
					result = '0';
				} else if (typeof result === 'boolean' && !result) {
					result = 'false';
				}
				this.say(result as string);
			} catch (e) {
				this.say((e as Error).message);
				console.log((e as Error).stack);
			}
		},
		aliases: ['js'],
		developerOnly: true,
		syntax: ["[expression]"],
		description: ["evaluates the given expression and displays the result"],
	},
	gitpull: {
		command(target, room, user) {
			child_process.exec('git pull', {}, err => {
				const latestUser = Users.get(user.name);
				if (err) {
					if (latestUser) latestUser.say("An error occurred while running ``git pull``: " + err.message);
				} else {
					if (latestUser) latestUser.say("Successfully ran ``git pull``.");
				}
			});
		},
		developerOnly: true,
		description: ["fetches the latest code from the source GitHub repository"],
	},
	reload: {
		command(target, room, user) {
			if (!target) return;
			if (__reloadInProgress) return this.say("You must wait for the current reload to finish.");

			void __reloadModules(user.name, target.split(","));
		},
		aliases: ['hotpatch'],
		developerOnly: true,
		syntax: ["[module(s)]"],
		description: ["reloads the given module(s)"],
	},
};
