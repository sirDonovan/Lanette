import fs = require('fs');

import { copyPokemonShowdownShaBase, exec, getInputFolders } from '../../tools';
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
			let result = exec('git pull');
			if (result === false) {
				user.say("An error occurred while running ``git pull``");
				return;
			}

			const privateRepo = getInputFolders()['Lanette-private'].inputPath;
			if (fs.existsSync(privateRepo)) {
				const currentDirecory = process.cwd();
				process.chdir(privateRepo);

				result = exec('git pull');
				if (result === false) {
					user.say("An error occurred while running ``git pull`` in private repo");
				}

				process.chdir(currentDirecory);
			}
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
	syncpokemonshowdownsha: {
		command() {
			copyPokemonShowdownShaBase();
			this.say("Synced pokemon-showdown-sha.txt file.");
		},
		aliases: ['syncpssha'],
		developerOnly: true,
		description: ["syncs pokemon-showdown-sha.txt with the latest base file"],
	},
};
