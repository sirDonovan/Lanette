import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCommandDefinitions, IGameFile, IGameFormat } from "../../types/games";

const timeLimit = 30 * 1000;

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
	sentVariantsAndModes = new Set<Player>();
	variantsAndModesUhtmlName: string = '';
	votingName: string = '';
	votingNumber: number = 1;
	readonly votes = new Map<Player, string>();

	// hack for onSignups()
	room!: Room;

	updateVotesHtml(callback?: () => void, uhtmlAuto?: boolean): void {
		const ended = this.canVote === false;

		const formatNames: Dict<string[]> = {};
		this.votes.forEach((formatid, player) => {
			const format = Games.getExistingFormat(formatid);
			const name = format.nameWithOptions;
			if (!(name in formatNames)) formatNames[name] = [];
			formatNames[name].push("<username>" + player.name + "</username>");
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
			if (!formats.length) return;

			html += "<h3>Current votes</h3>";
			for (const format of formats) {
				const votes = formatNames[format].length;
				html += format + (votes > 1 ? " (" + votes + ")" : "") + ": " + formatNames[format].join(", ");
				html += "<br />";
			}
		}

		html += "</center></div>";

		this.onUhtml(uhtmlName, html, () => {
			if (callback) callback();
		});

		if (uhtmlAuto) {
			this.sayUhtmlAuto(uhtmlName, html);
		} else if (ended) {
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

	getPmVoteButton(inputTarget: string, text: string): string {
		return Client.getQuietPmButton(this.room, Config.commandCharacter + "pmvote " + inputTarget, text);
	}

	sendVariantsAndModes(player: Player, format: IGameFormat): void {
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
				if (!format.options.freejoin) {
					const variant = Games.getFormat(format.inputTarget + ", " + variantData.variantAliases[0]);
					if (!Array.isArray(variant) && this.isValidFormat(variant)) {
						variants.push(variant);
					}
				}
				if (hasFreejoinVariant) {
					const freejoinVariant = Games.getFormat(format.inputTarget + ", " + variantData.variantAliases[0] + ", freejoin");
					if (!Array.isArray(freejoinVariant) && this.isValidFormat(freejoinVariant)) {
						variants.push(freejoinVariant);
					}
				}
			}
		}

		let variantsHtml = "";
		if (variants.length) {
			variantsHtml += "<details><summary>Votable " + format.nameWithOptions + " variants</summary>";
			for (const variant of variants) {
				variantsHtml += this.getPmVoteButton(variant.inputTarget, variant.nameWithOptions);
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
				modesHtml += "<details><summary>Votable " + format.nameWithOptions + " modes</summary>";
				for (const mode of modes) {
					modesHtml += this.getPmVoteButton(mode.inputTarget, mode.nameWithOptions);
				}
				modesHtml += "</details>";
			}
		}

		if (variantsHtml || modesHtml) {
			let html = "<div class='infobox'>";
			html += variantsHtml;
			if (variantsHtml && modesHtml) html += "<br />";
			html += modesHtml;
			html += "</div>";

			player.sayUhtml(html, this.variantsAndModesUhtmlName);
			this.sentVariantsAndModes.add(player);
		} else {
			if (this.sentVariantsAndModes.has(player)) {
				player.sayUhtml("", this.variantsAndModesUhtmlName);
				this.sentVariantsAndModes.delete(player);
			}
		}
	}

	getHighlightPhrase(): string {
		return Games.getScriptedGameVoteHighlight();
	}

	onSignups(): void {
		this.currentVotesUhtmlName = this.uhtmlBaseName + '-current-votes';
		this.finalVotesUhtmlName = this.uhtmlBaseName + '-final-votes';
		this.variantsAndModesUhtmlName = this.uhtmlBaseName + '-variants-modes';
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

		if (this.botSuggestions.length) {
			html += "<b>" + Users.self.name + "'s suggestions:</b><br />";

			const buttons: string[] = [];
			for (const pick of this.botSuggestions) {
				buttons.push(this.getPmVoteButton(pick, pick));
			}
			html += buttons.join(" | ");
			html += "<br />";
		}

		const leastPlayedFormat = this.getLeastPlayedFormat();
		if (leastPlayedFormat) {
			html += this.getPmVoteButton(leastPlayedFormat, "Least played game") + " | ";
		}

		html += this.getPmVoteButton("random", "Random game");
		html += "<br /><br />";

		html += "<details><summary>Current votable games</summary>";
		for (const format of votableFormats) {
			html += this.getPmVoteButton(format, format);
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
			const updateTimer = timeLimit / 2;
			this.timeout = setTimeout(() => {
				this.updateVotesHtml(undefined, true);

				this.timeout = setTimeout(() => this.endVoting(), updateTimer);
			}, updateTimer);
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
				const votes: {format: string, player: Player}[] = [];
				this.votes.forEach((format, player) => {
					votes.push({format, player});
				});

				let voter: string = '';
				let format: string;
				if (votes.length) {
					const chosen = this.sampleOne(votes);
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
				this.chosenVoter = voter;
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
			CommandParser.parse(this.room, Users.self, Config.commandCharacter + "createpickedskippedcooldowngame " +
				(this.chosenVoter ? this.chosenVoter + ", " : "") + this.chosenFormat, Date.now());
		}
	}
}

const commands: GameCommandDefinitions<Vote> = {
	vote: {
		command(target, room, user) {
			if (!this.canVote) return false;
			const player = this.createPlayer(user) || this.players[user.id];
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
					user.say("A random game could not be chosen.");
					return false;
				}
			} else {
				if (targetId === 'leastplayed' || targetId === 'lpgame') {
					target = this.getLeastPlayedFormat();
					if (!target) {
						user.say("There is no valid least played game at this time.");
						return false;
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

			if (this.bannedFormats.includes(format.name)) {
				user.say(format.name + " cannot be voted for until after the next game.");
				return false;
			}

			const canCreateGame = Games.canCreateGame(this.room, format);
			if (canCreateGame !== true) {
				user.say(canCreateGame + " Please vote for a different game!");
				return false;
			}

			this.votes.set(player, format.inputTarget);

			this.sendVariantsAndModes(player, format);

			if (!this.updateVotesHtmlTimeout) {
				this.updateVotesHtmlTimeout = setTimeout(() => {
					this.updateVotesHtmlTimeout = null;
					if (this.canVote) this.updateVotesHtml();
				}, this.getSignupsUpdateDelay());
			}

			return true;
		},
		aliases: ['suggest'],
	},
	pmvote: {
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
