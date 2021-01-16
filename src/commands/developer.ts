// eslint-disable-next-line @typescript-eslint/naming-convention
import child_process = require('child_process');

import type { BaseCommandDefinitions } from "../types/command-parser";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const commands: BaseCommandDefinitions = {
	eval: {
		command(target, room, user) { // eslint-disable-line @typescript-eslint/no-unused-vars
			try {
				this.say(eval(target));
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
			// eslint-disable-next-line @typescript-eslint/naming-convention
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

/* eslint-enable */