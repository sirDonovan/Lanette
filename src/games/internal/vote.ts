import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { IGameFile } from "../../types/games";

const timeLimit = 30 * 1000;

export class Vote extends Game {
	internalGame: boolean = true;
	picks: string[] = [];
	uhtmlName: string = '';
	readonly votes = new Map<Player, string>();

	// hack for onSignups()
	room!: Room;

	onSignups() {
		const database = Storage.getDatabase(this.room);
		const pastGames: string[] = [];
		if (database.pastGames && database.pastGames.length) {
			for (let i = 0; i < database.pastGames.length; i++) {
				const format = Games.getFormat(database.pastGames[i].inputTarget);
				if (Array.isArray(format)) {
					pastGames.push(database.pastGames[i].name);
				} else {
					pastGames.push(format.name);
				}
			}
		}

		const formats: string[] = [];
		let possiblePicks: string[] = [];
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			if (format.disabled) continue;
			formats.push(format.name);
			if (Games.canCreateGame(this.room, format) === true) possiblePicks.push(format.name);
		}

		possiblePicks = this.shuffle(possiblePicks);
		this.picks = [];
		for (let i = 0; i < 3; i++) {
			if (!possiblePicks[i]) break;
			this.picks.push(possiblePicks[i]);
		}

		let html = "<div class='infobox'><center><h3>Vote for the next scripted game!</h3>Use the command <code>" + Config.commandCharacter + "vote [game]</code>";
		html += "<br /><details><summary>Games list</summary>" + formats.sort().join(", ") + "</details>";
		if (pastGames.length) html += "<br /><details><summary>Past games (cannot be voted for)</summary>" + pastGames.join(", ") + "</details>";
		if (this.picks.length) {
			html += "<br /><b>" + Users.self.name + "'s picks:</b><br />";

			const buttons: string[] = [];
			for (let i = 0; i < this.picks.length; i++) {
				buttons.push('<button class="button" name="send" value="' + Config.commandCharacter + 'vote ' + this.picks[i] + '">' + this.picks[i] + '</button>');
			}
			html += buttons.join(" | ");
		}
		html += "</center></div>";

		this.uhtmlName = this.uhtmlBaseName + '-voting';
		this.sayUhtml(this.uhtmlName, html);
		this.notifyRankSignups = true;
		this.sayCommand("/notifyrank all, " + this.room.title + " game vote,Help decide the next scripted game!," + Games.scriptedGameVoteHighlight, true);
		this.timeout = setTimeout(() => this.end(), timeLimit);
	}

	onAfterDeallocate(forceEnd: boolean) {
		this.sayUhtmlChange(this.uhtmlName, "<div class='infobox'><center><h3>Voting for the next scripted game has ended!</h3></center></div>");
		if (forceEnd) return;

		const formats = Array.from(this.votes.values());
		let format: string;
		if (formats.length) {
			format = this.sampleOne(formats);
		} else {
			if (!this.picks.length) {
				this.say("A random game could not be chosen.");
				return;
			}
			format = this.sampleOne(this.picks);
		}

		CommandParser.parse(this.room, Users.self, Config.commandCharacter + "creategame " + format);
	}
}

const commands: Dict<ICommandDefinition<Vote>> = {
	vote: {
		command(target, room, user) {
			const player = this.players[user.id] || this.createPlayer(user);
			const format = Games.getFormat(target, true);
			if (Array.isArray(format)) {
				user.say(CommandParser.getErrorText(format));
				return false;
			}

			const canCreateGame = Games.canCreateGame(this.room, format);
			if (canCreateGame !== true) {
				user.say(canCreateGame + " Please vote for a different game!");
				return false;
			}

			this.votes.set(player, format.inputTarget);
			user.say("Your vote for " + format.name + " has been cast!");
			return true;
		},
		aliases: ['suggest'],
	},
};

export const game: IGameFile<Vote> = {
	class: Vote,
	commands,
	description: "Help decide the next scripted game!",
	freejoin: true,
	name: "Vote",
};
