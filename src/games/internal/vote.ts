import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { IGameFile } from "../../types/games";

const timeLimit = 30 * 1000;

export class Vote extends Game {
	canVote: boolean = false;
	chosenFormat: string = '';
	gamesUhtml: string = '';
	internalGame: boolean = true;
	picks: string[] = [];
	voteUhtml: string = '';
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
					pastGames.push(format.nameWithOptions);
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

		let voteHtml = "<div class='infobox'><center><h3>Vote for the next scripted game!</h3>Use the command <code>" + Config.commandCharacter + "vote [game]</code>";
		if (this.picks.length) {
			voteHtml += "<br /><br /><b>" + Users.self.name + "'s picks:</b><br />";

			const buttons: string[] = [];
			for (let i = 0; i < this.picks.length; i++) {
				buttons.push('<button class="button" name="send" value="' + Config.commandCharacter + 'vote ' + this.picks[i] + '">' + this.picks[i] + '</button>');
			}
			voteHtml += buttons.join(" | ");
		}
		voteHtml += "</center></div>";
		this.voteUhtml = this.uhtmlBaseName + '-voting';
		this.onUhtml(this.voteUhtml, voteHtml, () => {
			this.canVote = true;
		});
		this.sayUhtml(this.voteUhtml, voteHtml);

		let gamesHtml = "<div class='infobox'><center><details><summary>Click to see all games</summary>" + formats.sort().join(", ") + "</details></center>";
		if (pastGames.length) {
			gamesHtml += "<br /><b>Past games (cannot be voted for)</b>: " + Tools.joinList(pastGames);
		}
		gamesHtml += "</div>";
		this.gamesUhtml = this.uhtmlBaseName + '-games';
		this.onUhtml(this.gamesUhtml, gamesHtml, () => {
			this.timeout = setTimeout(() => this.endVoting(), timeLimit);
		});
		this.sayUhtml(this.gamesUhtml, gamesHtml);

		this.notifyRankSignups = true;
		this.sayCommand("/notifyrank all, " + this.room.title + " game vote,Help decide the next scripted game!," + Games.scriptedGameVoteHighlight, true);
	}

	endVoting() {
		const html = "<div class='infobox'><center><h3>Voting for the next scripted game has ended!</h3></center></div>";
		this.onUhtml(this.voteUhtml, html, () => {
			this.canVote = false;
			const formats = Array.from(this.votes.values());
			let format: string;
			if (formats.length) {
				format = this.sampleOne(formats);
			} else {
				if (!this.picks.length) {
					this.say("A random game could not be chosen.");
					this.forceEnd(Users.self);
					return;
				}
				format = this.sampleOne(this.picks);
			}

			this.chosenFormat = format;
			this.end();
		});
		this.sayUhtml(this.voteUhtml, html);
	}

	onForceEnd() {
		this.sayUhtmlChange(this.voteUhtml, "<div></div>");
	}

	onAfterDeallocate(forceEnd: boolean) {
		if (!forceEnd && this.chosenFormat) CommandParser.parse(this.room, Users.self, Config.commandCharacter + "creategame " + this.chosenFormat);
	}
}

const commands: Dict<ICommandDefinition<Vote>> = {
	vote: {
		command(target, room, user) {
			if (!this.canVote) return false;
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
