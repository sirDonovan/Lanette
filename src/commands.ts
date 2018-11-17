import { ICommandDefinition } from "./command-parser";

const commands: Dict<ICommandDefinition> = {
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

export = commands;
