import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCommandDefinitions, IGameFile, IGameFormat } from "../../types/games";

const timeLimit = 30 * 1000;

interface IPlayerVote {
	format: string;
	anonymous: boolean;
}

export class Vote extends ScriptedGame {
	bannedFormats: string[] = [];
	canVote: boolean | undefined;
	chosenFormat: string = '';
	chosenVoter: string = '';
	currentVotesUhtmlName: string = '';
	endedVoting: boolean = false;
	finalVotesUhtmlName: string = '';
	internalGame: boolean = true;
	botSuggestions: string[] = [];
	updateVotesHtmlTimeout: NodeJS.Timeout | null = null;
	privateVoteUhtmlName: string = '';
	privateVotesHtmlTimeouts: Dict<NodeJS.Timeout | null> = {};
	votingName: string = '';
	votingNumber: number = 1;
	readonly votes = new Map<Player, IPlayerVote>();

	// hack for onSignups()
	declare readonly room: Room;

	updateVotesHtml(callback?: () => void, signups?: boolean): void {
		const ended = this.canVote === false;

		const formatNames: Dict<string[]> = {};
		this.votes.forEach((vote, player) => {
			const format = Games.getExistingFormat(vote.format);
			const name = format.nameWithOptions;
			if (!(name in formatNames)) formatNames[name] = [];
			formatNames[name].push(vote.anonymous ? "[Anonymous]" : "<username>" + player.name + "</username>");
		});

		let html = "<div class='infobox'><center>";
		let uhtmlName: string;
		if (ended) {
			uhtmlName = this.finalVotesUhtmlName;

			html += "<h3>Voting for the next scripted game has ended!</h3><b>Final votes</b>:";
			const formats = Object.keys(formatNames).sort((a, b) => formatNames[b].length - formatNames[a].length);
			const formatsByVotes: Dict<string[]> = {};
			for (const format of formats) {
				const votes = formatNames[format].length;
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
			uhtmlName = this.currentVotesUhtmlName;

			const formats = Object.keys(formatNames);

			html += "<h3>Current votes</h3>";
			if (formats.length) {
				const currentVotes: string[] = [];
				for (const format of formats) {
					const votes = formatNames[format].length;
					currentVotes.push(format + (votes > 1 ? " (" + votes + ")" : "") + ": " + formatNames[format].join(", "));
				}
				html += currentVotes.join(" | ");
			} else {
				html += "&nbsp;(none)";
			}
		}

		html += "</center></div>";

		if (callback) {
			this.onUhtml(uhtmlName, html, () => {
				callback();
			});
		}

		if (ended || signups) {
			this.sayUhtml(uhtmlName, html);
		} else {
			this.sayUhtmlChange(uhtmlName, html);
		}
	}

	getLeastPlayedFormat(): string {
		const formats = Games.getLeastPlayedFormats(this.room);
		for (const leastPlayedFormat of formats) {
			if (this.isValidFormat(leastPlayedFormat)) {
				return leastPlayedFormat.name;
			}
		}

		return "";
	}

	isValidFormat(format: IGameFormat): boolean {
		if (!this.bannedFormats.includes(format.name) && Games.canCreateGame(this.room, format) === true) return true;
		return false;
	}

	getPmVoteButton(voteCommand: string, inputTarget: string, text: string, buttonStyle?: string): string {
		return Client.getQuietPmButton(this.room, Config.commandCharacter + voteCommand + " " + inputTarget, text, false, buttonStyle);
	}

	sendPrivateVoteHtml(player: Player, format: IGameFormat, pm: boolean, anonymous: boolean): void {
		if (player.id in this.privateVotesHtmlTimeouts) return;

		const variants: IGameFormat[] = [];

		const hasFreejoinVariant = format.defaultOptions.includes('freejoin');
		if (hasFreejoinVariant && !format.options.freejoin) {
			const inputTarget = format.inputTarget + ", freejoin";
			const variant = Games.getFormat(inputTarget);
			if (!Array.isArray(variant) && this.isValidFormat(variant)) {
				variants.push(variant);
			}
		}

		if (!format.variant && format.variants) {
			for (const variantData of format.variants) {
				const variant = Games.getFormat(format.inputTarget + ", " + variantData.variantAliases[0]);
				if (Array.isArray(variant)) continue;

				if (this.isValidFormat(variant)) {
					variants.push(variant);
				}

				if (hasFreejoinVariant) {
					const freejoinVariant = Games.getFormat(format.inputTarget + ", " + variantData.variantAliases[0] + ", freejoin");
					if (!Array.isArray(freejoinVariant) && freejoinVariant.nameWithOptions !== variant.nameWithOptions &&
						this.isValidFormat(freejoinVariant)) {
						variants.push(freejoinVariant);
					}
				}
			}
		}

		const voteCommand = anonymous ? 'pmvote' : pm ? 'vote' : 'buttonvote';

		let variantsHtml = "";
		if (variants.length) {
			variantsHtml += "<details><summary><b>Votable variants</b></summary>";
			for (const variant of variants) {
				variantsHtml += this.getPmVoteButton(voteCommand, variant.inputTarget, variant.nameWithOptions);
			}
			variantsHtml += "</details>";
		}

		let modesHtml = "";
		if (!format.mode && format.modes) {
			const modes: IGameFormat[] = [];
			for (const modeId of format.modes) {
				const mode = Games.getFormat(format.inputTarget + ", " + modeId);
				if (!Array.isArray(mode) && this.isValidFormat(mode)) modes.push(mode);
			}

			if (modes.length) {
				modesHtml += "<details><summary><b>Votable modes</b></summary>";
				for (const mode of modes) {
					modesHtml += this.getPmVoteButton(voteCommand, mode.inputTarget, mode.nameWithOptions);
				}
				modesHtml += "</details>";
			}
		}

		let html = "You have voted for <b>" + format.nameWithOptions + "</b>!";
		if (variantsHtml || modesHtml) {
			html += "<br /><br />";
			html += variantsHtml;
			if (variantsHtml && modesHtml) html += "<br />";
			html += modesHtml;
		}

		if (pm) {
			if (player.sentPrivateHtml) player.clearPrivateUhtml(this.privateVoteUhtmlName);
			player.sayUhtml(html, this.privateVoteUhtmlName);
		} else {
			player.sayPrivateUhtml(html, this.privateVoteUhtmlName);
		}

		this.privateVotesHtmlTimeouts[player.id] = setTimeout(() => {
			delete this.privateVotesHtmlTimeouts[player.id];
			const currentFormat = Games.getExistingFormat(this.votes.get(player)!.format);
			if (currentFormat.nameWithOptions !== format.nameWithOptions) this.sendPrivateVoteHtml(player, currentFormat, pm, anonymous);
		}, Client.getSendThrottle() * 4);
	}

	getHighlightPhrase(): string {
		return Games.getScriptedGameVoteHighlight();
	}

	onSignups(): void {
		this.currentVotesUhtmlName = this.uhtmlBaseName + '-current-votes';
		this.finalVotesUhtmlName = this.uhtmlBaseName + '-final-votes';
		this.privateVoteUhtmlName = this.uhtmlBaseName + '-private-vote';
		this.bannedFormats = Games.getNextVoteBans(this.room);

		const votableFormats: string[] = [];
		for (const i in Games.getFormats()) {
			const format = Games.getExistingFormat(i);
			if (this.isValidFormat(format)) {
				votableFormats.push(format.name);
			}
		}

		if (!votableFormats.length) {
			this.say("There are no currently votable games.");
			this.deallocate(true);
			return;
		}

		const possibleBotPicks = this.shuffle(votableFormats);
		this.botSuggestions = [];
		for (let i = 0; i < 3; i++) {
			if (!possibleBotPicks[i]) break;
			this.botSuggestions.push(possibleBotPicks[i]);
		}

		const database = Storage.getDatabase(this.room);
		let votingNumber = 1;
		if (database.scriptedGameCounts && this.id in database.scriptedGameCounts) votingNumber = database.scriptedGameCounts[this.id];
		this.votingName = "Scripted Game Voting #" + votingNumber;
		this.votingNumber = votingNumber;

		let html = "<center><h3>" + this.votingName + "</h3>Vote for the next scripted game with the command <code>" +
			Config.commandCharacter + "vote [name]</code>!";
		html += '<br /><button class="button" name="parseCommand" value="/highlight roomadd ' +
				this.getHighlightPhrase() + '">Enable voting highlights</button> | <button class="button" name="parseCommand" ' +
				'value="/highlight roomdelete ' + this.getHighlightPhrase() + '">Disable voting highlights</button><br /><br />';

		const voteCommand = 'buttonvote';
		if (this.botSuggestions.length) {
			html += "<b>" + Users.self.name + "'s suggestions:</b><br />";

			const buttons: string[] = [];
			for (const pick of this.botSuggestions) {
				buttons.push(this.getPmVoteButton(voteCommand, pick, pick));
			}
			html += buttons.join(" | ");
			html += "<br />";
		}

		const leastPlayedFormat = this.getLeastPlayedFormat();
		if (leastPlayedFormat) {
			html += this.getPmVoteButton(voteCommand, leastPlayedFormat, "Least played game") + " | ";
		}

		html += this.getPmVoteButton(voteCommand, "random", "Random game");
		html += "<br /><br />";

		html += "<details><summary>Current votable games</summary>";
		for (const format of votableFormats) {
			html += this.getPmVoteButton(voteCommand, format, format);
		}
		html += "</details></center>";

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

		if (pastGames.length) {
			html += "<br /><b>Past games (cannot be voted for)</b>: " + Tools.joinList(pastGames);
		}

		this.onHtml(html, () => {
			this.canVote = true;
			this.timeout = setTimeout(() => this.endVoting(), timeLimit);
		});
		this.sayHtml(html);
		this.updateVotesHtml(undefined, true);

		this.notifyRankSignups = true;
		this.room.notifyRank("all", this.room.title + " game vote", "Help decide the next scripted game!", this.getHighlightPhrase());
	}

	endVoting(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.canVote = false;
		this.updateVotesHtml(() => {
			this.timeout = setTimeout(() => {
				const votes: {format: string, anonymous: boolean, player: Player}[] = [];
				this.votes.forEach((vote, player) => {
					votes.push({format: vote.format, anonymous: vote.anonymous, player});
				});

				let anonymous = false;
				let voter: string = '';
				let format: string;
				if (votes.length) {
					const chosen = this.sampleOne(votes);
					anonymous = chosen.anonymous;
					format = chosen.format;
					voter = chosen.player.name;
				} else {
					if (!this.botSuggestions.length) {
						this.say("A random game could not be chosen.");
						this.forceEnd(Users.self);
						return;
					}
					format = this.sampleOne(this.botSuggestions);
				}

				this.chosenFormat = format;
				if (!anonymous) this.chosenVoter = voter;
				this.end();
			}, 3000);
		});
	}

	onForceEnd(): void {
		this.sayUhtmlChange(this.currentVotesUhtmlName, "<div class='infobox'><center><h3>Voting for the next scripted game was forcibly " +
			"ended!</h3></center></div>");
	}

	onAfterDeallocate(forceEnd: boolean): void {
		if (!forceEnd && this.chosenFormat) {
			CommandParser.parse(this.room, Users.self, Config.commandCharacter +
				(this.chosenVoter ? "createpickedskippedcooldowngame " + this.chosenVoter + "," : "createskippedcooldowngame") + " " +
				this.chosenFormat, Date.now());
		}
	}
}

const commands: GameCommandDefinitions<Vote> = {
	vote: {
		command(target, room, user, cmd) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const anonymous = cmd === 'pmvote';
			if (anonymous && !this.isPm(room, user)) {
				player.sayPrivateHtml("You must use this command in PMs.");
				return false;
			}

			const targetId = Tools.toId(target);
			let format: IGameFormat | undefined;
			if (targetId === 'random' || targetId === 'randomgame') {
				const formats = Tools.shuffle(Games.getFormatList());
				for (const randomFormat of formats) {
					if (this.isValidFormat(randomFormat)) {
						format = randomFormat;
						break;
					}
				}

				if (!format) {
					player.sayPrivateHtml("A random game could not be chosen.");
					return false;
				}
			} else {
				if (targetId === 'leastplayed' || targetId === 'lpgame') {
					target = this.getLeastPlayedFormat();
					if (!target) {
						player.sayPrivateHtml("There is no valid least played game at this time.");
						return false;
					}
				}

				const targetFormat = Games.getFormat(target, true);
				if (Array.isArray(targetFormat)) {
					player.sayPrivateHtml(CommandParser.getErrorText(targetFormat));
					return false;
				}

				if (targetFormat.tournamentGame) {
					player.sayPrivateHtml("Tournament formats cannot be chosen. Please vote for a different game!");
					return false;
				}

				format = targetFormat;
			}

			if (this.bannedFormats.includes(format.name)) {
				player.sayPrivateHtml(format.name + " cannot be voted for until after the next game.");
				return false;
			}

			const canCreateGame = Games.canCreateGame(this.room, format);
			if (canCreateGame !== true) {
				player.sayPrivateHtml(canCreateGame + " Please vote for a different game!");
				return false;
			}

			this.votes.set(player, {format: format.inputTarget, anonymous});

			this.sendPrivateVoteHtml(player, format, cmd === 'buttonvote' ? false : this.isPm(room, user), anonymous);

			if (!this.updateVotesHtmlTimeout) {
				this.updateVotesHtmlTimeout = setTimeout(() => {
					this.updateVotesHtmlTimeout = null;
					if (this.canVote) this.updateVotesHtml();
				}, this.getSignupsUpdateDelay());
			}

			return true;
		},
		aliases: ['suggest', 'pmvote', 'buttonvote'],
		pmGameCommand: true,
	},
};

export const game: IGameFile<Vote> = {
	class: Vote,
	commands,
	description: "Help decide the next scripted game!",
	freejoin: true,
	name: "Vote",
};
