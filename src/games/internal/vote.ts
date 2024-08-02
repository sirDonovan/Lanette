import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCategory, GameCommandDefinitions, IGameFile, IGameFormat } from "../../types/games";
import type { IGameCustomBox } from "../../types/storage";

const timeLimit = 30 * 1000;
const VOTE_COMMAND = 'vote';
const PM_VOTE_COMMAND = 'pmvote';
const BUTTON_VOTE_COMMAND = 'buttonvote';
const VOTABLE_GAMES_COMMAND = 'votablegames';
const NAME_SORT_COMMAND = 'namesort';
const CATEGORY_SORT_COMMAND = 'categorysort';
const FAVORITE_CATEGORY_COMMAND = 'favoritecategory';
const UNFAVORITE_CATEGORY_COMMAND = 'unfavoritecategory';

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
	managedPlayers = true;
	botSuggestions: string[] = [];
	updateVotesHtmlTimeout: NodeJS.Timeout | null = null;
	privateVoteUhtmlName: string = '';
	privateVotesHtmlTimeouts: Dict<NodeJS.Timeout | null> = {};
	votableFormats: IGameFormat[] = [];
	votableFormatsUhtmlName: string = '';
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

		let html = "";
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

		html += "<br />&nbsp;";
		html = "<center>" + Games.getCustomBoxDiv(html, this.customBox, undefined, 'signups') + "</center>";

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
		if (!this.bannedFormats.includes(format.name) && !format.searchChallenge && !format.tournamentGame &&
			Games.canCreateGame(this.room, format) === true) return true;
		return false;
	}

	getPmVoteButton(voteCommand: string, inputTarget: string, text: string, customBox?: IGameCustomBox, disabled?: boolean): string {
		return Client.getQuietPmButton(this.room, Config.commandCharacter + voteCommand + " " + Tools.stripHtmlCharacters(inputTarget),
			text, disabled, customBox ? Games.getCustomBoxButtonStyle(customBox) : "");
	}

	getHighlightPhrase(): string {
		return Games.getScriptedGameVoteHighlight();
	}

	async onSignups(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		this.signupsUhtmlName = this.uhtmlBaseName + '-signups';
		this.currentVotesUhtmlName = this.uhtmlBaseName + '-current-votes';
		this.finalVotesUhtmlName = this.uhtmlBaseName + '-final-votes';
		this.privateVoteUhtmlName = this.uhtmlBaseName + '-private-vote';
		this.votableFormatsUhtmlName = this.uhtmlBaseName + '-votable-formats';
		this.bannedFormats = Games.getNextVoteBans(this.room);

		const votableFormats: IGameFormat[] = [];
		for (const i in Games.getFormats()) {
			const format = Games.getExistingFormat(i);
			if (this.isValidFormat(format)) {
				votableFormats.push(format);
			}
		}

		if (!votableFormats.length) {
			this.say("There are no currently votable games.");
			this.deallocate(true);
			return;
		}

		this.votableFormats = votableFormats;

		const possibleBotPicks = this.shuffle(votableFormats);
		this.botSuggestions = [];
		for (let i = 0; i < 3; i++) {
			if (!possibleBotPicks[i]) break;
			this.botSuggestions.push(possibleBotPicks[i].name);
		}

		const database = Storage.getDatabase(this.room);
		let votingNumber = 1;
		if (database.scriptedGameCounts && this.id in database.scriptedGameCounts) votingNumber = database.scriptedGameCounts[this.id];
		this.votingName = "Scripted Game Voting #" + votingNumber;
		this.votingNumber = votingNumber;

		let pokemonIcon = "";
		let boxUser = this.format.minigameCreator;
		if (!boxUser && database.gameVoteBoxes) {
			const lastWinners = Games.getLastWinners(this.room);
			if (lastWinners && lastWinners.length) {
				const shuffled = this.shuffle(lastWinners);
				for (const winner of shuffled) {
					if (Tools.toId(winner) in database.gameVoteBoxes) {
						boxUser = winner;
						break;
					}
				}
			}
		}

		if (boxUser && database.gameVoteBoxes) {
			const id = Tools.toId(boxUser);
			if (id in database.gameVoteBoxes) {
				this.customBox = database.gameVoteBoxes[id];
				if (database.gameVoteBoxes[id].pokemonAvatar) {
					pokemonIcon = Dex.getPokemonIcon(Dex.getPokemon(database.gameVoteBoxes[id].pokemonAvatar));
				}
			}
		}

		let html = "<h3>" + (boxUser && this.customBox ? boxUser + "'s " : "") + this.votingName + pokemonIcon + "</h3>Vote for the " +
			"next scripted game with the command <code>" + Config.commandCharacter + "vote [name]</code>!";
		html += '<br />';
		html += Client.getClientCommandButton("/highlight roomadd " + this.getHighlightPhrase(), "Enable voting highlights", false,
			Games.getCustomBoxButtonStyle(this.customBox));
		html += Client.getClientCommandButton("/highlight roomdelete " + this.getHighlightPhrase(), "Disable voting highlights", false,
			Games.getCustomBoxButtonStyle(this.customBox));
		html += '<br /><br />';

		if (this.botSuggestions.length) {
			html += "<b>" + Users.self.name + "'s suggestions:</b><br />";

			const buttons: string[] = [];
			for (const pick of this.botSuggestions) {
				buttons.push(this.getPmVoteButton(BUTTON_VOTE_COMMAND, pick, pick, this.customBox));
			}
			html += buttons.join(" | ");
			html += "<br />";
		}

		const leastPlayedFormat = this.getLeastPlayedFormat();
		if (leastPlayedFormat) {
			html += this.getPmVoteButton(BUTTON_VOTE_COMMAND, leastPlayedFormat, "Least played game", this.customBox) + " | ";
		}

		html += this.getPmVoteButton(BUTTON_VOTE_COMMAND, "random", "Random game", this.customBox);
		html += " | ";
		html += this.getPmVoteButton(BUTTON_VOTE_COMMAND, "random, freejoin", "Random freejoin game", this.customBox);
		html += "<br /><br />";

		html += this.getQuietPmButton(VOTABLE_GAMES_COMMAND, "View current votable games");

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
			html += "<br /><br /><b>Past games (cannot be voted for)</b>: " + Tools.joinList(pastGames);
		}

		html += "<br />&nbsp;";

		html = "<center>" + Games.getCustomBoxDiv(html, this.customBox) + "</center>";

		this.onUhtml(this.signupsUhtmlName, html, () => {
			this.canVote = true;
			this.setTimeout(() => this.endVoting(), timeLimit);
		});
		this.sayUhtml(this.signupsUhtmlName, html);
		this.updateVotesHtml(undefined, true);

		this.notifyRankSignups = true;
		this.room.notifyRank("all", this.room.title + " game vote", "Help decide the next scripted game!", this.getHighlightPhrase());
	}

	getVoteVariantModeHtml(player: Player, pm: boolean): string {
		const vote = this.votes.get(player)!;
		const format = Games.getExistingFormat(vote.format);
		const customBox = this.getPlayerOrPickedCustomBox(player, true);
		const voteCommand = vote.anonymous ? PM_VOTE_COMMAND : pm ? VOTE_COMMAND : BUTTON_VOTE_COMMAND;

		let variantsHtml = "";
		if (format.variant) {
			variantsHtml += this.getPmVoteButton(voteCommand, format.id + (format.mode ? ", " + format.mode.id : ""),
				"Choose a different variant", customBox);
		} else {
			const hasFreejoinVariant = format.defaultOptions.includes('freejoin');

			const variants: IGameFormat[] = [];
			if (hasFreejoinVariant && !format.resolvedInputProperties.options.freejoin) {
				const inputTarget = format.inputTarget + ", freejoin";
				const variant = Games.getFormat(inputTarget);
				if (!Array.isArray(variant) && this.isValidFormat(variant)) {
					variants.push(variant);
				}
			}

			if (format.variants) {
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

			if (variants.length) {
				const html: string[] = [];
				for (const variant of variants) {
					html.push(this.getPmVoteButton(voteCommand, variant.inputTarget, variant.nameWithOptions, customBox));
				}

				variantsHtml += html.join(" | ");
			}
		}

		let modesHtml = "";
		if (!format.mode && format.modes) {
			const modes: IGameFormat[] = [];
			for (const modeId of format.modes) {
				const mode = Games.getFormat(format.inputTarget + ", " + modeId);
				if (!Array.isArray(mode) && this.isValidFormat(mode)) modes.push(mode);
			}

			if (modes.length) {
				const html: string[] = [];
				for (const mode of modes) {
					html.push(this.getPmVoteButton(voteCommand, mode.inputTarget, mode.nameWithOptions, customBox));
				}

				modesHtml += html.join(" | ");
			}
		} else if (format.mode) {
			modesHtml += this.getPmVoteButton(voteCommand, format.id + (format.variant ? ", " + format.variant.variantAliases[0] : ""),
				"Choose a different mode", customBox);
		}

		let html = "You have voted for <b>" + format.nameWithOptions + "</b>!";
		if (variantsHtml || modesHtml) {
			const both = variantsHtml && modesHtml;
			html += " Consider adding a ";
			if (both) {
				html += "variant and/or mode";
			} else if (variantsHtml) {
				html += "variant";
			} else {
				html += "mode";
			}
			html += " to mix up gameplay:<br /><br />";

			html += variantsHtml;
			if (both) html += "<br /><br />";
			html += modesHtml;

			if (format.variant && format.mode) {
				html += "<br /><br />" + this.getPmVoteButton(voteCommand, format.id, "Clear all", customBox);
			}
		}

		return html;
	}

	sendPmVoteHtml(player: Player): void {
		if (player.id in this.privateVotesHtmlTimeouts) return;

		const vote = this.votes.get(player)!;
		const format = Games.getExistingFormat(vote.format);
		const html = this.getVoteVariantModeHtml(player, true);

		if (player.sentPrivateHtml) player.clearPrivateUhtml(this.privateVoteUhtmlName);
		player.sayUhtml(html, this.privateVoteUhtmlName);

		this.privateVotesHtmlTimeouts[player.id] = setTimeout(() => {
			delete this.privateVotesHtmlTimeouts[player.id];
			const currentFormat = Games.getExistingFormat(this.votes.get(player)!.format);
			if (currentFormat.nameWithOptions !== format.nameWithOptions) this.sendPmVoteHtml(player);
		}, Client.getSendThrottle() * 4);
	}

	getPrivateVoteHtml(player: Player, showVotableGames?: boolean): string {
		const customBox = this.getPlayerOrPickedCustomBox(player, true);
		const database = Storage.getDatabase(this.room);
		if (!database.gameVoteOptions) database.gameVoteOptions = {};
		if (!(player.id in database.gameVoteOptions)) database.gameVoteOptions[player.id] = {};

		const options = database.gameVoteOptions[player.id];
		const vote = this.votes.get(player);
		const sortByCategory = options.sortBy === 'category';

		let html = "";
		html += "<details" + (!vote || showVotableGames ? " open" : "") + "><summary><b>Current votable games</b></summary>";
		html += this.getQuietPmButton(NAME_SORT_COMMAND, "Sort by name", !sortByCategory, player);
		html += " | ";
		html += this.getQuietPmButton(CATEGORY_SORT_COMMAND, "Sort by category", sortByCategory, player);
		html += "<br /><br />";

		if (sortByCategory) {
			const gamesByCateory: Dict<string[]> = {};
			const otherGames: string[] = [];
			for (const format of this.votableFormats) {
				const button = this.getPmVoteButton(BUTTON_VOTE_COMMAND, format.name, format.name, customBox,
					vote ? Games.getExistingFormat(vote.format).id === format.id : false);

				if (format.category) {
					if (!(format.category in gamesByCateory)) gamesByCateory[format.category] = [];
					gamesByCateory[format.category].push(button);
				} else {
					otherGames.push(button);
				}
			}

			const categoryNames = Games.getCategoryNames();
			const keys = Object.keys(gamesByCateory).sort();
			const favoriteCategories: string[] = [];
			const otherCategories: string[] = [];
			for (const category of keys) {
				const favorite = options.favoriteCategories && options.favoriteCategories.includes(category);
				let categoryHtml = "<details" + (favorite ? " open" : "") + "><summary><b>" + categoryNames[category as GameCategory] +
					"</b> ";
				if (favorite) {
					categoryHtml += this.getQuietPmButton(UNFAVORITE_CATEGORY_COMMAND + " " + category, "Unfavorite", false, player);
				} else {
					categoryHtml += this.getQuietPmButton(FAVORITE_CATEGORY_COMMAND + " " + category, "Favorite", false, player);
				}

				categoryHtml += "</summary>";
				categoryHtml += gamesByCateory[category].join(" | ");
				categoryHtml += "</details>";

				if (favorite) {
					favoriteCategories.push(categoryHtml);
				} else {
					otherCategories.push(categoryHtml);
				}
			}

			html += favoriteCategories.join("");
			html += otherCategories.join("");

			if (otherGames.length) {
				html += "<b>Other</b><br />";
				html += otherGames.join(" | ");
			}
		} else {
			const buttons: string[] = [];
			for (const format of this.votableFormats) {
				buttons.push(this.getPmVoteButton(BUTTON_VOTE_COMMAND, format.name, format.name, customBox,
					vote ? Games.getExistingFormat(vote.format).id === format.id : false));
			}

			html += buttons.join(" | ");
		}

		html += "</details>";

		if (vote) {
			html += "<br />" + this.getVoteVariantModeHtml(player, false);
		}

		return html;
	}

	sendPrivateVoteHtml(player: Player, showVotableGames?: boolean): void {
		if (player.id in this.privateVotesHtmlTimeouts) return;

		const html = this.getPrivateVoteHtml(player, showVotableGames);
		player.sayPrivateUhtml(Games.getCustomBoxDiv(html, this.getPlayerOrPickedCustomBox(player, true)), this.votableFormatsUhtmlName);

		this.privateVotesHtmlTimeouts[player.id] = setTimeout(() => {
			delete this.privateVotesHtmlTimeouts[player.id];
			const latestHtml = this.getPrivateVoteHtml(player, showVotableGames);
			if (latestHtml !== html) this.sendPrivateVoteHtml(player, showVotableGames);
		}, Client.getSendThrottle() * 4);
	}

	endVoting(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.canVote = false;
		this.updateVotesHtml(() => {
			this.setTimeout(() => {
				const votes: {formatid: string, anonymous: boolean, player: Player}[] = [];
				this.votes.forEach((vote, player) => {
					votes.push({formatid: vote.format, anonymous: vote.anonymous, player});
				});

				let anonymous = false;
				let voter: string = '';
				let formatid: string;
				if (votes.length) {
					const chosen = this.sampleOne(votes);
					anonymous = chosen.anonymous;
					formatid = chosen.formatid;
					voter = chosen.player.name;
				} else {
					if (!this.botSuggestions.length) {
						this.say("A random game could not be chosen.");
						this.forceEnd(Users.self);
						return;
					}
					formatid = this.sampleOne(this.botSuggestions);
				}

				this.chosenFormat = formatid;
				if (!anonymous) this.chosenVoter = voter;

				const chosenFormat = Games.getExistingFormat(formatid);
				for (const i in this.players) {
					const player = this.players[i];
					const vote = this.votes.get(player);
					if (vote && Games.getExistingFormat(vote.format).id === chosenFormat.id) {
						player.sendRoomHighlight("The game you voted for won!");
					}
				}

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

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.updateVotesHtmlTimeout) {
			clearTimeout(this.updateVotesHtmlTimeout);
			// @ts-expect-error
			this.updateVotesHtmlTimeout = undefined;
		}

		for (const i in this.privateVotesHtmlTimeouts) {
			if (this.privateVotesHtmlTimeouts[i]) {
				clearTimeout(this.privateVotesHtmlTimeouts[i]);
				// @ts-expect-error
				this.privateVotesHtmlTimeouts[i] = undefined;
			}
		}
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.votes.clear();
	}
}

const commands: GameCommandDefinitions<Vote> = {
	[VOTE_COMMAND]: {
		command(target, room, user, cmd) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const anonymous = cmd === PM_VOTE_COMMAND;
			if (anonymous && !this.isPm(room, user)) {
				player.sayPrivateHtml("You must use this command in PMs.");
				return false;
			}

			const targetId = Tools.toId(target);
			let format: IGameFormat | undefined;
			if (targetId === 'random' || targetId === 'randomgame') {
				const formats = this.shuffle(Games.getFormatList());
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
			} else if (targetId === 'randomfj' || targetId === 'randomfreejoin' || targetId === 'randomgamefj' ||
				targetId === 'randomgamefreejoin') {
				const formats = this.shuffle(Games.getFormatList());
				for (const randomFormat of formats) {
					if (!this.isValidFormat(randomFormat)) continue;
					if (randomFormat.freejoin) {
						format = randomFormat;
						break;
					} else if (randomFormat.defaultOptions.includes('freejoin')) {
						format = Games.getExistingFormat(randomFormat.id + ", freejoin");
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
					player.sayPrivateHtml(Tools.stripHtmlCharacters(CommandParser.getErrorText(targetFormat)));
					return false;
				}

				if (targetFormat.searchChallenge) {
					player.sayPrivateHtml("Search challenge formats cannot be chosen. Please vote for a different game!");
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

			if (this.isPm(room, user) && cmd !== BUTTON_VOTE_COMMAND) {
				this.sendPmVoteHtml(player);
			} else {
				this.sendPrivateVoteHtml(player);
			}

			if (!this.updateVotesHtmlTimeout) {
				this.updateVotesHtmlTimeout = setTimeout(() => {
					this.updateVotesHtmlTimeout = null;
					if (this.canVote) this.updateVotesHtml();
				}, this.getSignupsUpdateDelay());
			}

			return true;
		},
		aliases: ['suggest', PM_VOTE_COMMAND, BUTTON_VOTE_COMMAND],
		pmGameCommand: true,
	},
	[VOTABLE_GAMES_COMMAND]: {
		command(target, room, user) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			this.sendPrivateVoteHtml(player, true);
			return true;
		},
		pmGameCommand: true,
	},
	[NAME_SORT_COMMAND]: {
		command(target, room, user) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const database = Storage.getDatabase(this.room);
			if (!database.gameVoteOptions || !(player.id in database.gameVoteOptions)) return false;

			database.gameVoteOptions[player.id].sortBy = 'name';
			this.sendPrivateVoteHtml(player, true);
			return true;
		},
		pmGameCommand: true,
	},
	[CATEGORY_SORT_COMMAND]: {
		command(target, room, user) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const database = Storage.getDatabase(this.room);
			if (!database.gameVoteOptions || !(player.id in database.gameVoteOptions)) return false;

			database.gameVoteOptions[player.id].sortBy = 'category';
			this.sendPrivateVoteHtml(player, true);
			return true;
		},
		pmGameCommand: true,
	},
	[FAVORITE_CATEGORY_COMMAND]: {
		command(target, room, user) {
			if (!this.canVote || !(target in Games.getCategoryNames())) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const database = Storage.getDatabase(this.room);
			if (!database.gameVoteOptions || !(player.id in database.gameVoteOptions)) return false;

			if (!database.gameVoteOptions[player.id].favoriteCategories) {
				database.gameVoteOptions[player.id].favoriteCategories = [];
			} else {
				if (database.gameVoteOptions[player.id].favoriteCategories!.includes(target)) return false;
			}

			database.gameVoteOptions[player.id].favoriteCategories!.push(target);
			this.sendPrivateVoteHtml(player, true);
			return true;
		},
		pmGameCommand: true,
	},
	[UNFAVORITE_CATEGORY_COMMAND]: {
		command(target, room, user) {
			if (!this.canVote) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			const database = Storage.getDatabase(this.room);
			if (!database.gameVoteOptions || !(player.id in database.gameVoteOptions) ||
				!database.gameVoteOptions[player.id].favoriteCategories) return false;

			const index = database.gameVoteOptions[player.id].favoriteCategories!.indexOf(target);
			if (index === -1) return false;

			database.gameVoteOptions[player.id].favoriteCategories!.splice(index, 1);
			this.sendPrivateVoteHtml(player, true);
			return true;
		},
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
