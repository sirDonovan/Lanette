import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { IGameFile, IGameFormat } from "../../types/games";

const timeLimit = 30 * 1000;

export class Vote extends Game {
	customSignups: boolean = true;
	randomFormats: IGameFormat[] = [];
	uhtmlName: string = '';
	readonly votes = new Map<Player, IGameFormat>();

	// hack for onSignups()
	room!: Room;

	onSignups() {
		this.randomFormats = Games.getRandomFormats(this.room, 3);
		this.uhtmlName = this.uhtmlBaseName + '-voting';
		let html = "<div class='infobox'><center><h2>Vote for the next scripted game!</h2>Use the command <code>" + Config.commandCharacter + "vote [game]</code><br /><br /><b>" + Users.self.name + "'s picks:</b><br />";
		const buttons: string[] = [];
		for (let i = 0; i < this.randomFormats.length; i++) {
			buttons.push('<button class="button" name="send" value="' + Config.commandCharacter + 'vote ' + this.randomFormats[i].name + '">' + this.randomFormats[i].name + '</button>');
		}
		html += buttons.join(" | ");
		html += "</center></div>";
		this.sayUhtml(this.uhtmlName, html);
		this.notifyRankSignups = true;
		this.sayCommand("/notifyrank all, " + this.room.title + " game vote,Help decide the next scripted game!,Hosting a scriptedgamevote", true);
		this.timeout = setTimeout(() => this.end(), timeLimit);
	}

	onAfterDeallocate(forceEnd: boolean) {
		if (forceEnd) return;
		const formats = Array.from(this.votes.values());
		let format: IGameFormat;
		if (formats.length) {
			format = this.sampleOne(formats);
		} else {
			format = this.sampleOne(this.randomFormats);
		}

		this.sayUhtml(this.uhtmlName, "<div class='infobox'><center><h2>Voting for the next scripted game has ended!</h2></center></div>");
		CommandParser.parse(this.room, Users.self, Config.commandCharacter + "creategame " + format.inputTarget);
	}
}

const commands: Dict<ICommandDefinition<Vote>> = {
	vote: {
		command(target, room, user) {
			const player = this.players[user.id] || this.createPlayer(user);
			const format = Games.getFormat(target, user);
			if (Array.isArray(format)) {
				user.say(CommandParser.getErrorText(format));
				return false;
			}
			this.votes.set(player, format);
			user.say("Your vote for " + format.name + " has been cast!");
			return true;
		},
		aliases: ['suggest'],
	},
};

export const game: IGameFile<Vote> = {
	class: Vote,
	commands,
	description: "",
	freejoin: true,
	name: "",
};
