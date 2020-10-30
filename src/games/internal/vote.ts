import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCommandDefinitions, IGameFile, IGameFormat } from "../../types/games";

const timeLimit = 30 * 1000;

export class Vote extends ScriptedGame {
	canVote: boolean | undefined;
	chosenFormat: string = '';
	endedVoting: boolean = false;
	internalGame: boolean = true;
	picks: string[] = [];
	updateVotesHtmlTimeout: NodeJS.Timeout | null = null;
	votesUhtmlName: string = '';
	readonly votes = new Map<Player, string>();

	// hack for onSignups()
	room!: Room;

	updateVotesHtml(callback?: () => void, uhtmlAuto?: boolean): void {
		let html = "<div class='infobox'><center>";
		const ended = this.canVote === false;

		const formatCounts: Dict<number> = {};
		this.votes.forEach((formatid) => {
			const format = Games.getExistingFormat(formatid);
			const name = format.nameWithOptions;
			if (!(name in formatCounts)) formatCounts[name] = 0;
			formatCounts[name]++;
		});

		if (ended) {
			html += "<h3>Voting for the next scripted game has ended!</h3><b>Final votes</b>:";
			const formats = Object.keys(formatCounts).sort((a, b) => formatCounts[b] - formatCounts[a]);
			const formatsByVotes: Dict<string[]> = {};
			for (const format of formats) {
				const votes = formatCounts[format];
				if (!(votes in formatsByVotes)) formatsByVotes[votes] = [];
				formatsByVotes[votes].push(format);
			}

			const sortedVotes = Object.keys(formatsByVotes).map(x => parseInt(x)).sort((a, b) => b - a);
			for (const vote of sortedVotes) {
				let percentage = "" + ((vote / this.votes.size) * 100);
				if (percentage.length > 4) percentage = percentage.substr(0, 4);
				html += "<br /><b>" + vote + " vote" + (vote > 1 ? "s" : "") + "</b> <i>(" + percentage + "% chance" +
					(formatsByVotes[vote].length > 1 ? " each" : "") + ")</i>: " + formatsByVotes[vote].join(", ");
			}
		} else {
			const votesHtml = Object.keys(formatCounts).map(x => x + " <i>(" + formatCounts[x] + " vote" +
				(formatCounts[x] > 1 ? "s" : "") + ")</i>").join(", ");
			html += "<b>Current votes</b>:" + (votesHtml ? "<br />" + votesHtml : " (none)");
		}

		html += "</center></div>";

		this.onUhtml(this.votesUhtmlName, html, () => {
			if (callback) callback();
		});

		if (uhtmlAuto) {
			this.sayUhtmlAuto(this.votesUhtmlName, html);
		} else if (ended) {
			this.sayUhtml(this.votesUhtmlName, html);
		} else {
			this.sayUhtmlChange(this.votesUhtmlName, html);
		}
	}

	onSignups(): void {
		this.votesUhtmlName = this.uhtmlBaseName + '-votes';

		const database = Storage.getDatabase(this.room);
		const pastGames: string[] = [];
		if (database.pastGames && database.pastGames.length) {
			for (const pastGame of database.pastGames) {
				const format = Games.getFormat(pastGame.inputTarget);
				if (Array.isArray(format)) {
					pastGames.push(pastGame.name);
				} else {
					pastGames.push(format.nameWithOptions);
				}
			}
		}

		const formats: string[] = [];
		let possiblePicks: string[] = [];
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			if (format.disabled || format.tournamentGame) continue;
			formats.push(format.name);
			if (Games.canCreateGame(this.room, format) === true) possiblePicks.push(format.name);
		}

		possiblePicks = this.shuffle(possiblePicks);
		this.picks = [];
		for (let i = 0; i < 3; i++) {
			if (!possiblePicks[i]) break;
			this.picks.push(possiblePicks[i]);
		}

		let html = "<center><h3>Vote for the next scripted game with <code>" + Config.commandCharacter + "vote [game]</code></h3>";

		if (this.picks.length) {
			html += "<b>" + Users.self.name + "'s picks:</b><br />";

			const buttons: string[] = [];
			for (const pick of this.picks) {
				buttons.push(Client.getPmSelfButton(Config.commandCharacter + "pmvote " + pick, pick));
			}
			html += buttons.join(" | ");
			html += "<br /><br />";
		}

		html += "<details><summary>Click to see all games</summary>" + formats.sort().join(", ") + "</details></center>";
		if (pastGames.length) {
			html += "<br /><b>Past games (cannot be voted for)</b>: " + Tools.joinList(pastGames);
		}

		this.onHtml(html, () => {
			this.canVote = true;
			const updateTimer = timeLimit / 2;
			this.timeout = setTimeout(() => {
				this.updateVotesHtml(undefined, true);

				this.timeout = setTimeout(() => this.endVoting(), updateTimer);
			}, updateTimer);
		});
		this.sayHtml(html);
		this.updateVotesHtml(undefined, true);

		this.notifyRankSignups = true;
		this.sayCommand("/notifyrank all, " + this.room.title + " game vote,Help decide the next scripted game!," +
			Games.scriptedGameVoteHighlight, true);
	}

	endVoting(): void {
		this.canVote = false;
		this.updateVotesHtml(() => {
			this.timeout = setTimeout(() => {
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
			}, 3000);
		});
	}

	onForceEnd(): void {
		this.sayUhtmlChange(this.votesUhtmlName, "<div class='infobox'><center><h3>Voting for the next scripted game was forcibly " +
			"ended!</h3></center></div>");
	}

	onAfterDeallocate(forceEnd: boolean): void {
		if (!forceEnd && this.chosenFormat) {
			void CommandParser.parse(this.room, Users.self, Config.commandCharacter + "creategame " + this.chosenFormat);
		}
	}
}

const commands: GameCommandDefinitions<Vote> = {
	vote: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canVote) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			const targetId = Tools.toId(target);
			let format: IGameFormat | undefined;
			if (targetId === 'random' || targetId === 'randomgame') {
				const formats = Tools.shuffle(Games.getFormatList());
				for (const randomFormat of formats) {
					if (Games.canCreateGame(this.room, randomFormat) === true) {
						format = randomFormat;
						break;
					}
				}

				if (!format) {
					user.say("A random game could not be chosen.");
					return false;
				}
			} else {
				if (targetId === 'leastplayed' || targetId === 'lpgame') {
					const formats = Games.getLeastPlayedFormats(this.room);
					for (const leastPlayedFormat of formats) {
						if (Games.canCreateGame(this.room, leastPlayedFormat) === true) {
							target = leastPlayedFormat.name;
							break;
						}
					}
				}

				const targetFormat = Games.getFormat(target, true);
				if (Array.isArray(targetFormat)) {
					user.say(CommandParser.getErrorText(targetFormat));
					return false;
				}

				if (targetFormat.tournamentGame) {
					user.say("Tournament formats cannot be chosen. Please vote for a different game!");
					return false;
				}

				format = targetFormat;
			}

			const canCreateGame = Games.canCreateGame(this.room, format);
			if (canCreateGame !== true) {
				user.say(canCreateGame + " Please vote for a different game!");
				return false;
			}

			this.votes.set(player, format.inputTarget);
			user.say("Your vote for " + format.nameWithOptions + " has been cast!");

			if (!this.updateVotesHtmlTimeout) {
				this.updateVotesHtmlTimeout = setTimeout(() => {
					this.updateVotesHtmlTimeout = null;
					if (this.canVote) this.updateVotesHtml();
				}, 500);
			}

			return true;
		},
		aliases: ['suggest'],
	},
	pmvote: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canVote) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			player.useCommand('vote', target);
			return true;
		},
		pmOnly: true,
	},
};

export const game: IGameFile<Vote> = {
	class: Vote,
	commands,
	description: "Help decide the next scripted game!",
	freejoin: true,
	name: "Vote",
};
