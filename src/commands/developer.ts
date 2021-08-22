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
				}
				this.say(result as string);
			} catch (e) {
				this.say((e as Error).message);
				console.log((e as Error).stack);
			}
		},
		aliases: ['js'],
		developerOnly: true,
	},
	gitpull: {
		command() {
			child_process.exec('git pull', {}, err => {
				if (err) {
					this.say("An error occurred while running ``git pull``: " + err.message);
				} else {
					this.say("Successfully ran ``git pull``.");
				}
			});
		},
		developerOnly: true,
	},
	reload: {
		command(target, room, user) {
			if (!target) return;
			if (__reloadInProgress) return this.say("You must wait for the current reload to finish.");

			void __reloadModules(user.name, target.split(","));
		},
		aliases: ['hotpatch'],
		developerOnly: true,
	},
};
