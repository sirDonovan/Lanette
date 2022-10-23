import type { BotChallenge } from "../games/internal/bot-challenge";
import type { HeadToHead } from "../games/internal/head-to-head";
import type { OneVsOne } from "../games/internal/one-vs-one";
import type { SweetThief } from "../games/internal/sweet-thief";
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { GameChallengeSettings, IGameFormat } from "../types/games";
import type { GameActionGames, GameActionLocations } from "../types/storage";

const CHALLENGE_GAME_COOLDOWN = 2 * 60 * 60 * 1000;

export const commands: BaseCommandDefinitions = {
	gamecatalog: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(gameRoom.id)) {
				return this.sayError(['disabledGameFeatures', gameRoom.title]);
			}
			if (!Config.gameCatalogGists || !(gameRoom.id in Config.gameCatalogGists) || !Config.githubApiCredentials ||
				!('gist' in Config.githubApiCredentials)) {
				return this.say(gameRoom.title + " does not have a game catalog.");
			}
			this.sayHtml("<a href='https://gist.github.com/" + Config.githubApiCredentials.gist.username + "/" +
				Config.gameCatalogGists[gameRoom.id].id + "'>" + gameRoom.title + " game catalog</a>", gameRoom);
		},
		aliases: ['games'],
		pmSyntax: ['[room]'],
		description: ["links to the games catalog"],
	},
	minigamecatalog: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(gameRoom.id)) {
				return this.sayError(['disabledGameFeatures', gameRoom.title]);
			}

			const minigameCommandNames = Games.getMinigameCommandNames();
			const minigames: string[] = [];
			for (const i in minigameCommandNames) {
				const format = Games.getExistingFormat(minigameCommandNames[i].format);
				if (format.disabled) continue;
				minigames.push("<code>" + Config.commandCharacter + i + "</code> - " + format.name);
			}

			this.sayHtml("<details><summary>" + gameRoom.title + " minigame list</summary>" + minigames.join(", ") + "</details>",
				gameRoom);
		},
		aliases: ['minigames'],
		pmSyntax: ['[room]'],
		description: ["displays the list of playable minigames"],
	},
	gamedescription: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(targets[0]));
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			const allowsScripted = Config.allowScriptedGames && Config.allowScriptedGames.includes(gameRoom.id);
			const allowsSearchChallenge = Config.allowSearchChallenges && Config.allowSearchChallenges.includes(gameRoom.id);
			const allowsTournament = Config.allowTournamentGames && Config.allowTournamentGames.includes(gameRoom.id);
			const allowsUserHosted = Config.allowUserHostedGames && Config.allowUserHostedGames.includes(gameRoom.id);
			if (!allowsScripted && !allowsTournament && !allowsUserHosted) {
				return this.sayError(['disabledGameFeatures', gameRoom.title]);
			}

			const inputTarget = targets.join(',');
			const format = Games.getFormat(inputTarget);
			if (Array.isArray(format)) {
				const userHostedFormat = Games.getUserHostedFormat(inputTarget);
				if (!allowsUserHosted || Array.isArray(userHostedFormat)) {
					this.sayError(['invalidGameFormat', inputTarget]);
					return;
				}
				this.sayHtml("<b>" + userHostedFormat.name + "</b>: " + userHostedFormat.description, gameRoom);
				return;
			}

			if ((format.searchChallenge && !allowsSearchChallenge) || (format.tournamentGame && !allowsTournament) ||
				(!format.tournamentGame && !allowsScripted)) {
				this.sayError(['invalidGameFormat', inputTarget]);
				return;
			}

			this.sayHtml("<b>" + format.nameWithOptions + "</b>: " + format.description, gameRoom);
		},
		aliases: ['gdesc', 'gamedesc'],
		syntax: ['[game]'],
		pmSyntax: ['[room], [game]'],
		description: ["displays the description of the given game"],
	},
	startvote: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);

			if (cmd === 'startskippedcooldownvote') {
				if (user !== Users.self) return;
			} else {
				const remainingGameCooldown = Games.getRemainingGameCooldown(room);
				if (remainingGameCooldown > 1000) {
					const durationString = Tools.toDurationString(remainingGameCooldown);
					this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game " +
						"cooldown remaining.");
					return;
				}
			}

			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			const voteFormat = Games.getInternalFormat('vote');
			if (Array.isArray(voteFormat)) {
				return this.sayError(voteFormat);
			}

			const game = Games.createGame(room, voteFormat);
			if (game) game.signups();
		},
		chatOnly: true,
		aliases: ['sv', 'startskippedcooldownvote'],
		description: ["starts a new scripted game vote"],
	},
	egg: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				this.run('toss');
				return;
			}
			if (!user.hasRank(room, 'voice') || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			const remainingGameCooldown = Games.getRemainingGameCooldown(room, true);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the minigame " +
					"cooldown remaining.");
				return;
			}

			const targetUser = Users.get(target);
			if (!targetUser) return this.sayError(["invalidUserInRoom"]);

			const eggTossFormat = Games.getInternalFormat('eggtoss');
			if (Array.isArray(eggTossFormat)) {
				return this.sayError(eggTossFormat);
			}

			const game = Games.createGame(room, eggTossFormat, {pmRoom: room, minigame: true});
			if (game) {
				game.signups();
				const canEgg = this.run('toss') as boolean;
				if (canEgg) {
					this.say("**" + user.name + "** handed an egg to **" + targetUser.name + "**! Pass it around with ``" +
						Config.commandCharacter + "toss [user]`` before it explodes!");
				} else {
					game.end();
				}
			}
		},
		chatOnly: true,
		syntax: ["[user]"],
		description: ["starts an Egg Toss minigame with the given user as the starting player"],
	},
	hidesweets: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				this.run('steal');
				return;
			}
			if (!user.hasRank(room, 'voice') || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			const remainingGameCooldown = Games.getRemainingGameCooldown(room, true);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the minigame " +
					"cooldown remaining.");
				return;
			}

			const targetUser = Users.get(target);
			if (!targetUser) return this.sayError(["invalidUserInRoom"]);

			if (!targetUser.rooms.has(room)) {
				this.say("You can only hide the sweets with someone currently in the room.");
				return false;
			}
			if (targetUser === user) {
				this.say("You cannot hide the sweets with yourself!");
				return false;
			}
			if (targetUser.away || targetUser.isIdleStatus()) {
				this.say("You cannot hide the sweets with someone who is marked as away.");
				return false;
			}

			const sweetThiefFormat = Games.getInternalFormat('sweetthief');
			if (Array.isArray(sweetThiefFormat)) {
				return this.sayError(sweetThiefFormat);
			}

			sweetThiefFormat.minigameCreator = user.id;

			const game = Games.createGame(room, sweetThiefFormat, {pmRoom: room, minigame: true}) as SweetThief;
			game.signups();
			game.currentHolder = game.createPlayer(targetUser)!;

			this.say("Thievul hid the sweets with **" + game.currentHolder.name + "**! Steal them with ``" +
				Config.commandCharacter + "steal [user]`` before Thievul returns!");
		},
		chatOnly: true,
		syntax: ["[user]"],
		description: ["starts a Sweet Thief minigame with the given user as the starting player"],
	},
	challengecooldown: {
		command: function(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			const gameRoom = targetRoom;

			let cooldown = 0;
			let challengeName = "";
			const lastChallengeTimes = Games.getLastChallengeTimes();
			const challenge = Tools.toId(targets[1]);
			if (challenge === "onevsone" || challenge === "onevone" || challenge === "1vs1" || challenge === "1v1") {
				challengeName = "one vs. one";
				if (gameRoom.id in lastChallengeTimes.onevsone && user.id in lastChallengeTimes.onevsone[gameRoom.id]) {
					cooldown = CHALLENGE_GAME_COOLDOWN - (Date.now() - lastChallengeTimes.onevsone[gameRoom.id][user.id]);
				}
			} else if (challenge === "bot" || challenge === Users.self.id) {
				challengeName = "bot";
				if (gameRoom.id in lastChallengeTimes.botchallenge && user.id in lastChallengeTimes.botchallenge[gameRoom.id]) {
					cooldown = CHALLENGE_GAME_COOLDOWN - (Date.now() - lastChallengeTimes.botchallenge[gameRoom.id][user.id]);
				}
			}

			if (challengeName) {
				if (cooldown <= 1000) {
					user.say("You are free to begin a " + challengeName + " challenge in " + gameRoom.title + "!");
				} else {
					user.say("You can begin a " + challengeName + " challenge in " + gameRoom.title + " in " +
						Tools.toDurationString(cooldown) + ".");
				}
			} else {
				user.say("You must specify a valid challenge type.");
			}
		},
		pmOnly: true,
		aliases: ['ccdown', 'chalcooldown', 'ccooldown'],
		syntax: ["[room], [challenge type]"],
		description: ["displays your remaining cooldown time for the given challenge type"],
	},
	botchallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!Config.allowChallengeGames || !Config.allowChallengeGames.includes(room.id)) {
				user.say("Bot challenges are not allowed in " + room.title + ".");
				return;
			}

			if (!target) {
				user.say("You must PM " + Users.self.name + " the command ``" + Config.commandCharacter + "ccdown " +
					room.title + ", bot`` to check your challenge cooldown time.");
				return;
			}

			if (room.game) {
				user.say("You must wait until the game of " + room.game.name + " ends.");
				return;
			}

			if (room.userHostedGame) {
				user.say("You must wait until the game of " + room.userHostedGame.name + " ends.");
				return;
			}

			if (Games.isReloadInProgress()) {
				user.say(CommandParser.getErrorText(['reloadInProgress']));
				return;
			}

			const lastChallengeTimes = Games.getLastChallengeTimes();
			if (room.id in lastChallengeTimes.botchallenge && user.id in lastChallengeTimes.botchallenge[room.id]) {
				const cooldown = CHALLENGE_GAME_COOLDOWN - (Date.now() - lastChallengeTimes.botchallenge[room.id][user.id]);
				if (cooldown > 1000) {
					user.say("You must wait " + Tools.toDurationString(cooldown) + " before challenging " + Users.self.name + ".");
					return;
				}
			}

			const botChallengeFormat = Games.getInternalFormat("botchallenge");
			if (Array.isArray(botChallengeFormat)) {
				user.say(CommandParser.getErrorText(botChallengeFormat));
				return;
			}

			const targets = target.split(",");
			let options: string[] = [];
			let challengeFormat = Games.getFormat(target, true);
			if (Array.isArray(challengeFormat)) {
				options = targets[0].split("|");
				challengeFormat = Games.getFormat(targets.slice(1).join(","), true);
				if (Array.isArray(challengeFormat)) {
					user.say(CommandParser.getErrorText(challengeFormat));
					return;
				}
			}

			let challengeSettings: GameChallengeSettings | undefined;
			if (challengeFormat.mode) {
				challengeSettings = challengeFormat.mode.challengeSettings;
			} else {
				challengeSettings = challengeFormat.challengeSettings;
			}

			if (!challengeSettings || !challengeSettings.botchallenge || !challengeSettings.botchallenge.enabled) {
				user.say(challengeFormat.nameWithOptions + " does not allow bot challenges.");
				return;
			}

			if (challengeSettings.botchallenge.requiredFreejoin && !challengeFormat.resolvedInputProperties.options.freejoin) {
				user.say(challengeFormat.name + " can only be played as freejoin for bot challenges.");
				return;
			}

			const parsedOptions: Dict<string> = {};
			if (challengeSettings.botchallenge.options) {
				for (const option of options) {
					const parts = option.split(":");
					const id = Tools.toId(parts[0]);
					if (!challengeSettings.botchallenge.options.includes(id)) {
						user.say("'" + id + "' is not an option for " + challengeFormat.nameWithOptions + " bot challenges.");
						return;
					}

					parsedOptions[id] = parts.slice(1).join(":").trim();
				}

				if (challengeSettings.botchallenge.requiredOptions) {
					for (const requiredOption of challengeSettings.botchallenge.requiredOptions) {
						if (!(requiredOption in parsedOptions)) {
							user.say(challengeFormat.nameWithOptions + " requires the option '" + requiredOption + "' for bot challenges.");
							return;
						}
					}
				}
			} else {
				if (options.length) {
					user.say(challengeFormat.nameWithOptions + " does not support any options for bot challenges.");
					return;
				}
			}

			const game = Games.createGame(room, botChallengeFormat) as BotChallenge;
			game.setupChallenge(user, Users.self, challengeFormat, parsedOptions);
		},
		chatOnly: true,
		aliases: ['botch'],
		syntax: ["[game], {option(s)}"],
		description: ["starts a new Bot Challenge with " + Users.self.name + " for the given game"],
	},
	onevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!Config.allowChallengeGames || !Config.allowChallengeGames.includes(room.id)) {
				user.say("One vs. one challenges are not allowed in " + room.title + ".");
				return;
			}

			if (!target) {
				user.say("You must PM " + Users.self.name + " the command ``" + Config.commandCharacter + "ccdown " +
					room.title + ", 1v1`` to check your challenge cooldown time.");
				return;
			}

			if (room.game) {
				user.say("You must wait until the game of " + room.game.name + " ends.");
				return;
			}

			if (room.userHostedGame) {
				user.say("You must wait until the game of " + room.userHostedGame.name + " ends.");
				return;
			}

			if (Games.isReloadInProgress()) {
				user.say(CommandParser.getErrorText(['reloadInProgress']));
				return;
			}

			let hasRoomStaff: boolean | undefined;
			room.users.forEach((rank, otherUser) => {
				if (!hasRoomStaff && otherUser.hasRank(room, 'driver')) hasRoomStaff = true;
			});
			if (!hasRoomStaff) {
				user.say("You must wait for a room driver or higher to join " + room.title + ".");
				return;
			}

			const lastChallengeTimes = Games.getLastChallengeTimes();
			if (room.id in lastChallengeTimes.onevsone && user.id in lastChallengeTimes.onevsone[room.id]) {
				const cooldown = CHALLENGE_GAME_COOLDOWN - (Date.now() - lastChallengeTimes.onevsone[room.id][user.id]);
				if (cooldown > 1000) {
					user.say("You must wait " + Tools.toDurationString(cooldown) + " before challenging another user.");
					return;
				}
			}

			const oneVsOneFormat = Games.getInternalFormat("onevsone");
			if (Array.isArray(oneVsOneFormat)) {
				user.say(CommandParser.getErrorText(oneVsOneFormat));
				return;
			}

			const targets = target.split(",");
			const targetUser = Users.get(targets[0]);
			if (!targetUser || !targetUser.rooms.has(room) || targetUser === Users.self || targetUser.isBot(room)) {
				user.say(CommandParser.getErrorText(["invalidUserInRoom"]));
				return;
			}
			if (targetUser === user) {
				user.say("You cannot challenge yourself.");
				return;
			}

			if (targets.length === 1) {
				user.say(CommandParser.getErrorText(['invalidGameFormat']));
				return;
			}

			let options: string[] = [];
			let challengeFormat = Games.getFormat(targets.slice(1).join(","), true);
			if (Array.isArray(challengeFormat)) {
				options = targets[1].split("|");
				challengeFormat = Games.getFormat(targets.slice(2).join(","), true);
				if (Array.isArray(challengeFormat)) {
					user.say(CommandParser.getErrorText(challengeFormat));
					return;
				}
			}

			let challengeSettings: GameChallengeSettings | undefined;
			if (challengeFormat.mode) {
				challengeSettings = challengeFormat.mode.challengeSettings;
			} else {
				challengeSettings = challengeFormat.challengeSettings;
			}

			if (!challengeSettings || !challengeSettings.onevsone || !challengeSettings.onevsone.enabled) {
				user.say(challengeFormat.nameWithOptions + " does not allow one vs. one challenges.");
				return;
			}

			const parsedOptions: Dict<string> = {};
			if (challengeSettings.onevsone.options) {
				for (const option of options) {
					const parts = option.split(":");
					const id = Tools.toId(parts[0]);
					if (!challengeSettings.onevsone.options.includes(id)) {
						user.say("'" + id + "' is not an option for " + challengeFormat.nameWithOptions + " one vs. one challenges.");
						return;
					}

					parsedOptions[id] = parts.slice(1).join(":").trim();
				}

				if (challengeSettings.onevsone.requiredOptions) {
					for (const requiredOption of challengeSettings.onevsone.requiredOptions) {
						if (!(requiredOption in parsedOptions)) {
							user.say(challengeFormat.nameWithOptions + " requires the option '" + requiredOption + "' for " +
								"one vs. one challenges.");
							return;
						}
					}
				}
			} else {
				if (options.length) {
					user.say(challengeFormat.nameWithOptions + " does not support any options for one vs. one challenges.");
					return;
				}
			}

			const game = Games.createGame(room, oneVsOneFormat) as OneVsOne;
			game.setupChallenge(user, targetUser, challengeFormat, parsedOptions);
		},
		chatOnly: true,
		aliases: ['1v1c', 'onevonechallenge', '1vs1challenge', '1v1challenge', '1vs1c'],
		syntax: ["[user], [game]"],
		description: ["creates a new One vs. One challenge with the given user for the given game"],
	},
	acceptonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (Games.isReloadInProgress()) {
				user.say(CommandParser.getErrorText(['reloadInProgress']));
				return;
			}
			if (!room.game || !room.game.acceptChallenge) return;
			room.game.acceptChallenge(user);
		},
		chatOnly: true,
		aliases: ['a1v1c', 'acceptonevonechallenge', 'accept1vs1challenge', 'accept1v1challenge', 'accept1vs1c', 'accept1v1c', 'a1vs1c'],
		description: ["accepts an incoming One vs. One challenge"],
	},
	rejectonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.game || !room.game.rejectChallenge) return;
			room.game.rejectChallenge(user);
		},
		chatOnly: true,
		aliases: ['r1v1c', 'rejectonevonechallenge', 'reject1vs1challenge', 'reject1v1challenge', 'reject1vs1c', 'reject1v1c', 'r1vs1c',
			'denyonevonechallenge', 'deny1vs1challenge', 'deny1v1challenge', 'deny1vs1c', 'deny1v1c', 'd1vs1c', 'd1v1c'],
		description: ["rejects an incoming One vs. One challenge"],
	},
	cancelonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.game || !room.game.cancelChallenge) return;
			room.game.cancelChallenge(user);
		},
		chatOnly: true,
		aliases: ['c1v1c', 'cancelonevonechallenge', 'cancel1vs1challenge', 'cancel1v1challenge', 'cancel1vs1c', 'cancel1v1c', 'c1vs1c'],
		description: ["cancels your pending One vs. One challenge"],
	},
	headtoheadgame: {
		command: function(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.allowChallengeGames || !Config.allowChallengeGames.includes(room.id)) {
				this.say("Head to head games are not allowed in " + room.title + ".");
				return;
			}
			if (room.game) {
				this.say("You must wait until the game of " + room.game.name + " ends.");
				return;
			}
			if (Games.isReloadInProgress()) {
				this.say(CommandParser.getErrorText(['reloadInProgress']));
				return;
			}

			const headToHeadFormat = Games.getInternalFormat("headtohead");
			if (Array.isArray(headToHeadFormat)) {
				this.say(CommandParser.getErrorText(headToHeadFormat));
				return;
			}

			const targets = target.split(",");
			const leftUser = Users.get(targets[0]);
			const rightUser = Users.get(targets[1]);
			if (!leftUser || !rightUser || !leftUser.rooms.has(room) || !rightUser.rooms.has(room) || leftUser === Users.self ||
				rightUser === Users.self || leftUser.isBot(room) || rightUser.isBot(room)) {
				this.say(CommandParser.getErrorText(["invalidUserInRoom"]));
				return;
			}
			if (leftUser === rightUser) {
				this.say("You must specify 2 different users.");
				return;
			}

			let options: string[] = [];
			let challengeFormat = Games.getFormat(targets.slice(2).join(","), true);
			if (Array.isArray(challengeFormat)) {
				options = targets[1].split("|");
				challengeFormat = Games.getFormat(targets.slice(3).join(","), true);
				if (Array.isArray(challengeFormat)) {
					user.say(CommandParser.getErrorText(challengeFormat));
					return;
				}
			}

			let challengeSettings: GameChallengeSettings | undefined;
			if (challengeFormat.mode) {
				challengeSettings = challengeFormat.mode.challengeSettings;
			} else {
				challengeSettings = challengeFormat.challengeSettings;
			}

			if (!challengeSettings || !challengeSettings.onevsone || !challengeSettings.onevsone.enabled) {
				user.say(challengeFormat.nameWithOptions + " does not allow one vs. one challenges.");
				return;
			}

			const parsedOptions: Dict<string> = {};
			if (challengeSettings.onevsone.options) {
				for (const option of options) {
					const parts = option.split(":");
					const id = Tools.toId(parts[0]);
					if (!challengeSettings.onevsone.options.includes(id)) {
						user.say("'" + id + "' is not an option for " + challengeFormat.nameWithOptions + " one vs. one challenges.");
						return;
					}

					parsedOptions[id] = parts.slice(1).join(":").trim();
				}

				if (challengeSettings.onevsone.requiredOptions) {
					for (const requiredOption of challengeSettings.onevsone.requiredOptions) {
						if (!(requiredOption in parsedOptions)) {
							user.say(challengeFormat.nameWithOptions + " requires the option '" + requiredOption + "' for " +
								"one vs. one challenges.");
							return;
						}
					}
				}
			} else {
				if (options.length) {
					user.say(challengeFormat.nameWithOptions + " does not support any options for one vs. one challenges.");
					return;
				}
			}

			const game = Games.createGame(room, headToHeadFormat) as HeadToHead;
			game.setupChallenge(leftUser, rightUser, challengeFormat, parsedOptions);
		},
		chatOnly: true,
		aliases: ['hthg', 'hthgame'],
		syntax: ["[user A], [user B], [game], {option(s)}"],
		description: ["creates a new Head to Head game between the given users for the given game"],
	},
	createtournamentgame: {
		command(target, room, user, cmd) {
			if (this.isPm(room)) return;
			if ((!user.hasRank(room, 'voice') && !user.isDeveloper()) || room.game || room.userHostedGame) return;
			if (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id)) {
				return this.sayError(['disabledTournamentGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			const remainingGameCooldown = Games.getRemainingTournamentGameCooldown(room);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the tournament " +
					"cooldown remaining.");
				return;
			}

			let format: IGameFormat | undefined;
			if (cmd === 'createrandomtournamentgame' || cmd === 'createrandomtourgame' || cmd === 'randomtourgame' || cmd === 'crtg' ||
				Tools.toId(target) === 'random') {
				const formats = Tools.shuffle(Games.getTournamentFormatList());
				for (const randomFormat of formats) {
					if (Games.canCreateGame(room, randomFormat) === true) {
						format = randomFormat;
						break;
					}
				}
				if (!format) return this.say("A random tournament could not be chosen.");
			} else {
				const inputFormat = Games.getFormat(target, true);
				if (Array.isArray(inputFormat)) return this.sayError(inputFormat);
				if (!inputFormat.tournamentGame) return this.say(inputFormat.name + " is not a tournament game!");

				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different tournament!");
				format = inputFormat;
			}

			const game = Games.createGame(room, format, {pmRoom: room});
			if (game) game.signups();
		},
		chatOnly: true,
		aliases: ['ctg', 'createtourgame', 'ctourgame', 'createrandomtournamentgame', 'createrandomtourgame', 'randomtourgame', 'crtg'],
		syntax: ["[format]"],
		description: ["creates a new scripted tournament game with the given format"],
	},
	createsearchchallenge: {
		command(target, room, user, cmd) {
			if (this.isPm(room)) return;
			if (!user.hasRank(room, 'voice') || room.game || room.userHostedGame || room.searchChallenge) return;
			if (!Config.allowSearchChallenges || !Config.allowSearchChallenges.includes(room.id)) {
				return this.sayError(['disabledSearchChallengeFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			let format: IGameFormat | undefined;
			if (cmd === 'createrandomsearchchallenge' || cmd === 'randomsearchchallenge' || cmd === 'crsc' ||
				Tools.toId(target) === 'random') {
				const formats = Tools.shuffle(Games.getSearchChallengeList());
				for (const randomFormat of formats) {
					if (Games.canCreateGame(room, randomFormat) === true) {
						format = randomFormat;
						break;
					}
				}
				if (!format) return this.say("A random search challenge could not be chosen.");
			} else {
				const inputFormat = Games.getFormat(target, true);
				if (Array.isArray(inputFormat)) return this.sayError(inputFormat);
				if (!inputFormat.searchChallenge) return this.say(inputFormat.name + " is not a search challenge!");

				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different search challenge!");
				format = inputFormat;
			}

			if (room.tournament) {
				return this.say("You must wait for the " + room.tournament.name + " tournament to end!");
			}

			const game = Games.createSearchChallenge(room, format, room);
			game.signups();
		},
		chatOnly: true,
		aliases: ['csc', 'csearchchallenge', 'createrandomsearchchallenge', 'randomsearchchallenge', 'crsc'],
		syntax: ["[challenge]"],
		description: ["starts a new search challenge of the given type"],
	},
	randomminigame: {
		command(target, room, user) {
			let gameRoom: Room | undefined;
			if (this.isPm(room)) {
				if (room.game) return;

				user.rooms.forEach((data, userRoom) => {
					if (!gameRoom && Config.allowScriptedGames && Config.allowScriptedGames.includes(userRoom.id) &&
						Users.self.hasRank(userRoom, 'bot')) {
						gameRoom = userRoom;
					}
				});

				if (!gameRoom) return this.say(CommandParser.getErrorText(['noPmGameRoom']));
			} else {
				if (!user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
					return this.sayError(['disabledGameFeatures', room.title]);
				}
				if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
				const remainingGameCooldown = Games.getRemainingGameCooldown(room, true);
				if (remainingGameCooldown > 1000) {
					const durationString = Tools.toDurationString(remainingGameCooldown);
					this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the minigame " +
						"cooldown remaining.");
					return;
				}
			}

			const gameCategories = Object.keys(Games.getCategoryNames()).map(x => Tools.toId(x));
			let category = Tools.toId(target);
			let variant = "";
			if (!gameCategories.includes(category)) {
				variant = category;
				category = "";
			}

			const minigameCommands: string[] = [];
			const minigameCommandNames = Games.getMinigameCommandNames();
			for (const i in minigameCommandNames) {
				const format = Games.getExistingFormat(minigameCommandNames[i].format);
				if (format.disabled) continue;
				if (category && Tools.toId(format.category) !== category) continue;
				if (variant && Array.isArray(Games.getFormat(format.name + ", " + variant))) continue;
				minigameCommands.push(i);
			}

			if (!minigameCommands.length) {
				if (category) {
					return this.say("There are no minigames in the category '" + target.trim() + "'.");
				}
				if (variant) {
					return this.say("There are no minigames with a '" + target.trim() + "' variant.");
				}
				return this.say("A random minigame could not be chosen.");
			}

			this.run(Tools.sampleOne(minigameCommands), variant || "");
		},
		aliases: ['minigame', 'randminigame', 'rminigame'],
		syntax: ["{category}"],
		description: ["starts a random minigame, optionally in the given category"],
	},
	creategame: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || (!user.hasRank(room, 'voice') && !user.isDeveloper()) || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);

			if (cmd === 'createskippedcooldowngame' || cmd === 'createpickedskippedcooldowngame') {
				if (user !== Users.self) return;
			} else {
				const remainingGameCooldown = Games.getRemainingGameCooldown(room);
				if (remainingGameCooldown > 1000) {
					const durationString = Tools.toDurationString(remainingGameCooldown);
					this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game " +
						"cooldown remaining.");
					return;
				}
			}

			if (Games.isReloadInProgress()) return this.sayError(['reloadInProgress']);

			const targets = target.split(',');
			let voter = '';
			if (cmd === 'createpickedskippedcooldowngame' || cmd === 'createpickedgame' || cmd === 'cpg') {
				voter = targets[0].trim();
				targets.shift();
			}

			let gameTarget = targets.join(',');
			const targetId = Tools.toId(gameTarget);
			let format: IGameFormat | undefined;
			if (cmd === 'createrandomgame' || cmd === 'crg' || cmd === 'randomgame' || targetId === 'random') {
				const option = Tools.toId(gameTarget);
				let formats: readonly string[];
				if (option === 'freejoin' || option === 'fj') {
					formats = Games.getFreejoinFormatTargets();
				} else {
					let filter: ((format: IGameFormat) => boolean) | undefined;
					if (option) filter = x => Tools.toId(x.category) === option;
					formats = Games.getFormatList(filter).map(x => x.name);
					if (!formats.length) return this.say("There are no games in the category '" + gameTarget.trim() + "'.");
				}

				formats = Tools.shuffle(formats);
				for (const formatId of formats) {
					const randomFormat = Games.getExistingFormat(formatId);
					if (Games.canCreateGame(room, randomFormat) === true) {
						format = randomFormat;
						break;
					}
				}
				if (!format) return this.say("A random game could not be chosen.");
			} else {
				if (targetId === 'leastplayed' || targetId === 'lpgame') {
					const formats = Games.getLeastPlayedFormats(room);
					for (const leastPlayedFormat of formats) {
						if (Games.canCreateGame(room, leastPlayedFormat) === true) {
							gameTarget = leastPlayedFormat.name;
							break;
						}
					}
				}

				const inputFormat = Games.getFormat(gameTarget, true);
				if (Array.isArray(inputFormat)) return this.sayError(inputFormat);
				if (inputFormat.tournamentGame) return this.say("You must use the ``" + Config.commandCharacter + "ctg`` command.");
				if (inputFormat.searchChallenge) return this.say("You must use the ``" + Config.commandCharacter + "csc`` command.");
				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different game!");
				format = inputFormat;
			}

			format.voter = voter;
			const game = Games.createGame(room, format);
			if (game) game.signups();
		},
		chatOnly: true,
		aliases: ['cg', 'createrandomgame', 'crg', 'randomgame', 'createpickedgame', 'cpg', 'createskippedcooldowngame',
			'createpickedskippedcooldowngame'],
		syntax: ["[game], {option(s)}"],
		description: ["creates a new scripted game of the given type"],
	},
	startgame: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				if ((!user.hasRank(room, 'voice') && !user.isDeveloper()) || room.game.started) return;
				if (room.game.usesTournamentStart) {
					if (!room.game.startTournament) return this.say("You must wait for the tournament to start.");
					if (!room.game.startTournament()) this.say("Not enough players have joined the tournament.");
				} else {
					if (!room.game.start()) this.say("Not enough players have joined the game.");
				}
			} else if (room.userHostedGame) {
				const isHost = room.userHostedGame.isHost(user);
				const isAuth = !isHost && user.hasRank(room, 'voice');
				if ((!isHost && !isAuth) || room.userHostedGame.started) return;
				if (!room.userHostedGame.start(isAuth)) user.say("Not enough players have joined your game.");
			}
		},
		chatOnly: true,
		aliases: ['sg'],
		description: ["starts the current game"],
	},
	endgame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (room.game) {
					room.game.forceEnd(user, target.trim());
				}
			} else {
				if (!user.hasRank(room, 'voice') && !user.isDeveloper()) return;
				if (room.game) {
					room.game.forceEnd(user, target.trim());
				} else if (room.userHostedGame) {
					room.userHostedGame.forceEnd(user, target.trim());
				}
			}
		},
		description: ["ends the current game"],
	},
	joingame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (!target) return;
				const chatRoom = Rooms.search(Tools.toRoomId(target));
				if (!chatRoom) return;

				if (room.game) {
					this.say("You cannot join a room game while you are playing a PM minigame.");
					return;
				}

				const userData = user.rooms.get(chatRoom);
				if (userData && userData.rank === Client.getGroupSymbols().muted) {
					return this.say("You cannot join games while you are muted.");
				}

				if (chatRoom.game) {
					chatRoom.game.addPlayer(user);
				} else if (chatRoom.userHostedGame) {
					chatRoom.userHostedGame.addPlayer(user);
				}
			} else {
				if (room.game) {
					room.game.addPlayer(user);
				} else if (room.userHostedGame) {
					room.userHostedGame.addPlayer(user);
				}
			}
		},
		aliases: ['jg'],
		description: ["adds you to the current game's player list"],
	},
	leavegame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (!target) return;
				const chatRoom = Rooms.search(Tools.toRoomId(target));
				if (!chatRoom) return;

				if (chatRoom.game) {
					if (chatRoom.game.usesTournamentJoin || !(user.id in chatRoom.game.players) ||
						chatRoom.game.players[user.id].eliminated) return;

					chatRoom.game.removePlayer(user);
				} else if (chatRoom.userHostedGame) {
					chatRoom.userHostedGame.removePlayer(user);
				}
			} else {
				if (room.game) {
					if (room.game.usesTournamentJoin || !(user.id in room.game.players) ||
						room.game.players[user.id].eliminated) return;

					room.game.removePlayer(user);
				} else if (room.userHostedGame) {
					room.userHostedGame.removePlayer(user);
				}
			}
		},
		description: ["removes you from the current game's player list"],
	},
	canvotegame: {
		command(target, room) {
			if (!this.isPm(room)) return;

			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			const format = Games.getFormat(targets.join(","), true);
			if (Array.isArray(format)) {
				this.say(CommandParser.getErrorText(format));
				return;
			}

			if (format.searchChallenge) {
				this.say("Search challenge formats cannot be voted.");
				return;
			}

			if (format.tournamentGame) {
				this.say("Tournament formats cannot be voted.");
				return;
			}

			const canCreateGame = Games.canCreateGame(targetRoom, format);
			if (canCreateGame !== true) {
				this.say(canCreateGame);
				return;
			}

			this.say(format.nameWithOptions + " can be voted next in " + targetRoom.title + "!");
		},
		pmOnly: true,
		aliases: ['canvg'],
		description: ["checks whether the specified game can be voted next"],
	},
	tournamentgameban: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star')) return;
				gameRoom = room;
			}

			let playerName = targets.length ? targets[0].trim() : "";
			let playerId: string;
			const targetUser = Users.get(playerName);
			if (targetUser) {
				playerName = targetUser.name;
				playerId = targetUser.id;
			} else {
				playerId = Tools.toId(playerName);
			}

			if (!playerId) return this.say("Please specify a user and optionally a ban duration.");

			const database = Storage.getDatabase(gameRoom);
			if (targets.length > 1) {
				if (!user.hasRank(gameRoom, 'moderator')) return;
				const days = parseInt(targets[1]);
				if (isNaN(days) || days < 1 || days > 365) {
					return this.say("Please specify a number of days between 1 and 365.");
				}

				const banDuration = days * 24 * 60 * 60 * 1000;
				const expirationTime = Date.now() + banDuration;

				if (!database.tournamentGameBanlist) database.tournamentGameBanlist = {};

				database.tournamentGameBanlist[playerId] = {
					name: playerName,
					expirationTime,
				};

				this.say(playerName + " has been banned from participating in tournament games for " +
					Tools.toDurationString(banDuration) + ".");
				Storage.tryExportDatabase(gameRoom.id);
			} else {
				const now = Date.now();
				if (!database.tournamentGameBanlist || !(playerId in database.tournamentGameBanlist) ||
					database.tournamentGameBanlist[playerId].expirationTime <= now) {
					return this.say(playerName + " is not banned from participating in tournament games.");
				}

				this.say(playerName + " is still banned from participating in tournament games for " +
					Tools.toDurationString(database.tournamentGameBanlist[playerId].expirationTime - now) + ".");
			}
		},
		aliases: ['tourgameban'],
		syntax: ["[user], {days}"],
		description: ["bans a user from joining scripted tournament games"],
	},
	tournamentgameunban: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				gameRoom = room;
			}

			if (!user.hasRank(gameRoom, 'moderator')) return;

			const playerName = targets.length ? targets[0].trim() : "";
			const playerId = Tools.toId(playerName);
			if (!playerId) return this.say("Please specify a user to unban.");

			const database = Storage.getDatabase(gameRoom);
			if (!database.tournamentGameBanlist || !(playerId in database.tournamentGameBanlist)) {
				return this.say(playerName + " is not banned from participating in tournament games.");
			}

			delete database.tournamentGameBanlist[playerId];
			this.say(playerName + " has been unbanned from participating in tournament games.");
			Storage.tryExportDatabase(gameRoom.id);
		},
		aliases: ['tourgameunban'],
		syntax: ["[user]"],
		description: ["unbans a user from scripted tournament games"],
	},
	tournamentgamebanlist: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star')) return;
				gameRoom = room;
			}

			const list: string[] = [];
			const database = Storage.getDatabase(gameRoom);
			if (database.tournamentGameBanlist) {
				const now = Date.now();
				for (const i in database.tournamentGameBanlist) {
					if (database.tournamentGameBanlist[i].expirationTime > now) {
						const player = Users.get(i);
						list.push((player ? player.name : database.tournamentGameBanlist[i].name) + " (" +
							Tools.toDurationString(database.tournamentGameBanlist[i].expirationTime - now) + " remaining)");
					}
				}
			}

			if (!list.length) return this.say("There are no players on the tournament game banlist.");
			this.sayHtml("<b>Tournament game banlist</b>: " + list.join(", "), gameRoom);
		},
		aliases: ['tourgamebanlist'],
		pmSyntax: ['[room]'],
		description: ["displays the list of users who are banned from joining scripted tournament games"],
	},
	dqplayer: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver') || !room.game) return;
			const id = Tools.toId(target);
			if (!(id in room.game.players)) return this.say("You must specify a player currently in the game.");
			const player = room.game.players[id];
			room.game.winners.delete(player);
			room.game.removePlayer(target, true);
			this.say(player.name + " has been disqualified from the game.");
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			room.modnote(user.name + " DQed " + player.name + " from " + (room.game ? room.game.name : "the game") + ".");
		},
		chatOnly: true,
		syntax: ["[user]"],
		description: ["disqualifies the given user from the current game"],
	},
	game: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			if (gameRoom.game) {
				const game = gameRoom.game;
				let html = game.getMascotAndNameHtml("", true);
				html += "<br />";
				if (game.started) {
					if (game.startTime) html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - game.startTime) + "<br />";
					const remainingPlayers = game.getRemainingPlayerCount();
					if (remainingPlayers !== game.playerCount) {
						html += "<b>Remaining players</b>: " + remainingPlayers + "/" + game.playerCount;
					} else {
						html += "<b>Players</b>: " + remainingPlayers;
					}
				} else {
					html += "<b>Signups duration</b>: " + Tools.toDurationString(Date.now() - game.signupsTime) + "<br />";
					html += "<b>" + game.playerCount + "</b> player" + (game.playerCount === 1 ? " has" : "s have") + " joined";
				}
				this.sayHtml(html, gameRoom);
			} else if (gameRoom.userHostedGame) {
				const game = gameRoom.userHostedGame;
				let html = game.getMascotAndNameHtml();
				html += "<br />";
				if (gameRoom.userHostedGame.subHostName) html += "<b>Sub-host</b>: " + gameRoom.userHostedGame.subHostName + "<br />";
				html += "<b>Remaining time</b>: " + Tools.toDurationString(game.endTime - Date.now()) + "<br />";
				if (game.started) {
					if (game.startTime) html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - game.startTime) + "<br />";
					html += "<b>Players</b>: " + game.getRemainingPlayerCount();
				} else {
					html += "<b>Signups duration</b>: " + Tools.toDurationString(Date.now() - game.signupsTime) + "<br />";
					html += "<b>" + game.playerCount + "</b> player" + (game.playerCount === 1 ? " has" : "s have") + " joined";
				}
				this.sayHtml(html, gameRoom);
			} else {
				this.say("There is no scripted game running.");
			}
		},
		pmSyntax: ["[room]"],
		description: ["displays information about the current game"],
	},
	challenge: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star')) return;
				gameRoom = room;
			}

			if (gameRoom.searchChallenge) {
				const game = gameRoom.searchChallenge;
				let html = game.getMascotAndNameHtml("", true);
				html += "<br />";
				if (game.started) {
					if (game.startTime) html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - game.startTime) + "<br />";
					const remainingPlayers = game.getRemainingPlayerCount();
					if (remainingPlayers !== game.playerCount) {
						html += "<b>Remaining players</b>: " + remainingPlayers + "/" + game.playerCount;
					} else {
						html += "<b>Players</b>: " + remainingPlayers;
					}

					if (game.getObjectiveText) {
						const text = game.getObjectiveText();
						if (text) html += "<br /><br /><b>Objective</b>: " + text;
					}
				} else {
					html += "<b>Signups duration</b>: " + Tools.toDurationString(Date.now() - game.signupsTime) + "<br />";
					html += "<b>" + game.playerCount + "</b> player" + (game.playerCount === 1 ? " has" : "s have") + " joined";
				}
				this.sayHtml(html, gameRoom);
			} else {
				this.say("There is no search challenge running.");
			}
		},
		pmSyntax: ["[room]"],
		description: ["displays information about the current search challenge"],
	},
	pastgames: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) {
					return this.sayError(['disabledGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star')) return;
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
					return this.sayError(['disabledGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!database.pastGames) return this.say("The past games list is empty.");
			const names: string[] = [];
			const option = Tools.toId(targets[0]);
			const displayTimes = option === 'time' || option === 'times';
			const now = Date.now();
			for (const pastGame of database.pastGames) {
				const format = Games.getFormat(pastGame.inputTarget);
				let game = Array.isArray(format) ? pastGame.name : format.nameWithOptions;

				if (displayTimes) {
					let duration = now - pastGame.time;
					if (duration < 1000) duration = 1000;
					game += " <i>(" + Tools.toDurationString(duration, {hhmmss: true}) + " ago)</i>";
				}

				names.push(game);
			}
			this.sayHtml("<b>Past games</b>" + (displayTimes ? "" : " (most recent first)") + ": " + Tools.joinList(names) + ".", gameRoom);
		},
		pmSyntax: ["[room], {times}"],
		syntax: ["{times}"],
		description: ["displays the previously played games in the room, optionally with the times they ended"],
	},
	pasttournamentgames: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star')) return;
				if (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id)) {
					return this.sayError(['disabledTournamentGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!database.pastTournamentGames) return this.say("The past tournament games list is empty.");

			const names: string[] = [];
			const option = Tools.toId(targets[0]);
			const displayTimes = option === 'time' || option === 'times';
			const now = Date.now();
			for (const pastGame of database.pastTournamentGames) {
				const format = Games.getFormat(pastGame.inputTarget);
				let game = Array.isArray(format) ? pastGame.name : format.nameWithOptions;

				if (displayTimes) {
					let duration = now - pastGame.time;
					if (duration < 1000) duration = 1000;
					game += " <i>(" + Tools.toDurationString(duration, {hhmmss: true}) + " ago)</i>";
				}

				names.push(game);
			}

			this.sayHtml("<b>Past tournament games</b>" + (displayTimes ? "" : " (most recent first)") + ": " +
				Tools.joinList(names) + ".", gameRoom);
		},
		aliases: ["pasttourgames"],
		pmSyntax: ["[room], {times}"],
		syntax: ["{times}"],
		description: ["displays the previously played tournament games in the room, optionally with the times they ended"],
	},
	lastgame: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if ((!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) &&
					(!Config.allowTournamentGames || !Config.allowTournamentGames.includes(targetRoom.id))) {
					return this.sayError(['disabledGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star')) return;
				if ((!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) &&
					(!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id))) {
					return this.sayError(['disabledGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			const formatId = targets.join(',');
			if (!formatId) {
				if (!database.lastGameTime) return this.say("No scripted games have been played in " + gameRoom.title + ".");
				return this.say("The last scripted game in " + gameRoom.title + " ended **" +
					Tools.toDurationString(Date.now() - database.lastGameTime) + "** ago.");
			}

			const format = Games.getFormat(formatId);
			if (Array.isArray(format)) return this.sayError(format);

			const id = Tools.toId(format.nameWithOptions);
			if (!database.lastGameFormatTimes || !(id in database.lastGameFormatTimes)) {
				return this.say(format.nameWithOptions + " has not been played in " + gameRoom.title + ".");
			}

			this.say("The last game of " + format.nameWithOptions + " in " + gameRoom.title + " ended **" +
				Tools.toDurationString(Date.now() - database.lastGameFormatTimes[id]) + "** ago.");
		},
		pmSyntax: ["[room], [game]"],
		syntax: ["[game]"],
		description: ["displays the last time the given game was played"],
	},
	setscriptedgameoption: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);

			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) {
				return this.sayError(['disabledGameFeatures', targetRoom.title]);
			}

			const option = Tools.toId(targets[1]);
			if (!option) return this.say("You must specify an option.");

			if (option === 'gameactions' || option === 'actions') {
				const gameType = Tools.toId(targets[2]) as GameActionGames | '';
				if (gameType !== 'card' && gameType !== 'map' && gameType !== 'greedentsberrypiles' && gameType !== 'magikarpswaterwheel') {
					return this.say("You must specify a valid game or game type.");
				}

				const value = Tools.toId(targets[3]) as GameActionLocations | '';
				const database = Storage.getDatabase(targetRoom);
				if (value === 'htmlpage' || value === 'chat') {
					if (!database.gameScriptedOptions) database.gameScriptedOptions = {};
					if (!(user.id in database.gameScriptedOptions)) database.gameScriptedOptions[user.id] = {};
					if (!database.gameScriptedOptions[user.id].actionsLocations) {
						database.gameScriptedOptions[user.id].actionsLocations = {};
					}

					if (database.gameScriptedOptions[user.id].actionsLocations![gameType] === value) {
						const format = Games.getFormat(gameType);
						return targetRoom.sayPrivateHtml(user, "You have already set game actions to be sent to " + (value === 'htmlpage' ?
							"an HTML page" : "the chat") + " for " + (Array.isArray(format) ? gameType + " games" : format.name) + "!");
					}

					database.gameScriptedOptions[user.id].actionsLocations![gameType] = value;
					if (!targetRoom.game || targetRoom.game.started || !(user.id in targetRoom.game.players)) {
						const format = Games.getFormat(gameType);
						this.say("Starting the next game, your actions will be sent to " + (value === 'htmlpage' ? "an HTML page" :
							"the chat") + " for " + (Array.isArray(format) ? gameType + " games" : format.name) + "!");
					} else {
						targetRoom.game.sendJoinNotice(targetRoom.game.players[user.id]);
					}
				} else {
					return this.say("The options for game actions are ``HTML page`` and ``chat``.");
				}
			} else if (option === 'assistactions') {
				const value = Tools.toId(targets[2]);
				const database = Storage.getDatabase(targetRoom);
				if (value === 'on' || value === 'off') {
					if (!database.gameScriptedOptions) database.gameScriptedOptions = {};
					if (!(user.id in database.gameScriptedOptions)) database.gameScriptedOptions[user.id] = {};

					const storedValue = value === 'on';
					if (database.gameScriptedOptions[user.id].assistActions === storedValue) {
						return targetRoom.sayPrivateHtml(user, "You have already set assist actions to be " +
							(storedValue ? "displayed " : "hidden") + "!");
					}

					database.gameScriptedOptions[user.id].assistActions = storedValue;
					if (!targetRoom.game || targetRoom.game.started || !(user.id in targetRoom.game.players)) {
						this.say("Starting the next game, your assist actions will be " + (storedValue ? "displayed" : "hidden") + "!");
					} else {
						targetRoom.game.sendJoinNotice(targetRoom.game.players[user.id]);
					}
				} else {
					return this.say("The options for assist actions are ``on`` and ``off``.");
				}
			}
		},
		pmOnly: true,
		aliases: ['scriptedgameoption'],
	},
};
