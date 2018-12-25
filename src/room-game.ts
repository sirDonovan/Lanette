import { ICommandDefinition } from "./command-parser";
import { IGameFormat } from "./games";
import { Activity, Player } from "./room-activity";

const baseCommands: Dict<ICommandDefinition<Game>> = {
	summary: {
		command(target, room, user) {
			if (!this.started || !(user.id in this.players)) return;
			if (this.getPlayerSummary) {
				this.getPlayerSummary(this.players[user.id]);
			} else {
				// TODO: generic summary (points/lives/etc)
			}
		},
		globalGameCommand: true,
		pmOnly: true,
	},
};

export const commands = CommandParser.loadCommands(baseCommands);

const globalGameCommands: Dict<ICommandDefinition<Game>> = {};
for (const i in commands) {
	if (commands[i].globalGameCommand) globalGameCommands[i] = commands[i];
}

export class Game extends Activity {
	activityType = 'game';
	commands = Object.assign({}, globalGameCommands);
	parentGame = null as Game | null;
	round = 0;
	winners = new Map<Player, number>();

	initialize(format: IGameFormat) {
		this.name = format.name;
		this.id = format.id;

		if (format.commands) Object.assign(this.commands, format.commands);

		// TODO: add HTML box once client data is added
		// TODO: free-join games
		this.room.say("Hosting a scriptedgame of " + this.name + "! Use ``.jg`` to join.");
	}

	deallocate() {
		this.room.game = null;
	}

	nextRound() {
		if (this.timeout) clearTimeout(this.timeout);
		this.round++;
		if (this.onNextRound) this.onNextRound();
	}

	end() {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.deallocate();
	}

	getPlayerSummary?(player: Player): void;
	onNextRound?(): void;
}
