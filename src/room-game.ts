import { ICommandDefinition } from "./command-parser";
import { IPokemonCopy } from "./dex";
import { IGameFormat } from "./games";
import { Activity, Player } from "./room-activity";
import { User } from "./users";

const baseCommands: Dict<ICommandDefinition<Game>> = {
	summary: {
		command(target, room, user) {
			if (!(user.id in this.players)) return;
			const player = this.players[user.id];
			if (this.getPlayerSummary) {
				this.getPlayerSummary(this.players[user.id]);
			} else {
				let summary = '';
				if (this.points) summary += "Your points: " + (this.points.get(player) || 0) + "<br />";
				if (summary) player.sayHtml(summary);
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

	mascot?: IPokemonCopy;
	points?: Map<Player, number>;

	initialize(format: IGameFormat) {
		this.name = format.name;
		this.id = format.id;

		if (format.commands) Object.assign(this.commands, format.commands);
		if (format.mascot) {
			this.mascot = Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			this.mascot = Dex.getPokemonCopy(Tools.sampleOne(format.mascots));
		}

		// TODO: add HTML box once client data is added
		// TODO: free-join games
		this.room.say("Hosting a scriptedgame of " + this.name + "! Use ``.jg`` to join.");
	}

	deallocate() {
		this.room.game = null;
	}

	forceEnd(user: User) {
		if (this.timeout) clearTimeout(this.timeout);
		this.say("The " + this.name + " " + this.activityType + " was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user);
		this.deallocate();
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
