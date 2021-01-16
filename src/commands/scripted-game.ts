import type { HeadToHead } from "../games/internal/head-to-head";
import type { OneVsOne } from "../games/internal/one-vs-one";
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";

const ONE_VS_ONE_GAME_COOLDOWN = 2 * 60 * 60 * 1000;

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

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
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
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
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(gameRoom.id)) {
				return this.sayError(['disabledGameFeatures', gameRoom.title]);
			}

			const minigames: string[] = [];
			for (const i in Games.minigameCommandNames) {
				const format = Games.getExistingFormat(Games.minigameCommandNames[i].format);
				if (format.disabled) continue;
				minigames.push("<code>" + Config.commandCharacter + i + "</code> - " + format.name);
			}

			this.sayHtml("<details><summary>" + gameRoom.title + " minigame list</summary>" + minigames.join(", ") + "</details>",
				gameRoom);
		},
		aliases: ['minigames'],
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
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			const allowsScripted = Config.allowScriptedGames && Config.allowScriptedGames.includes(gameRoom.id);
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

			if ((format.tournamentGame && !allowsTournament) || (!format.tournamentGame && !allowsScripted)) {
				this.sayError(['invalidGameFormat', inputTarget]);
				return;
			}

			this.sayHtml("<b>" + format.nameWithOptions + "</b>: " + format.description, gameRoom);
		},
		aliases: ['gamedesc', 'gdesc'],
	},
	startvote: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);

			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown " +
					"remaining.");
				return;
			}
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

			const voteFormat = Games.getInternalFormat('vote');
			if (Array.isArray(voteFormat)) {
				return this.sayError(voteFormat);
			}

			const game = Games.createGame(room, voteFormat);
			game.signups();
		},
		aliases: ['sv'],
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
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

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

			const game = Games.createGame(room, eggTossFormat, room, true);
			game.signups();
			const canEgg = this.run('toss') as boolean;
			if (canEgg) {
				this.say("**" + user.name + "** handed an egg to **" + targetUser.name + "**! Pass it around with ``" +
					Config.commandCharacter + "toss [user]`` before it explodes!");
			} else {
				game.end();
			}
		},
	},
	challengecooldown: {
		command: function(target, room, user) {
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

			const challenge = Tools.toId(targets[0]);
			if (challenge === "onevsone" || challenge === "onevone" || challenge === "1vs1" || challenge === "1v1") {
				let cooldown = 0;
				if (gameRoom.id in Games.lastOneVsOneChallengeTimes && user.id in Games.lastOneVsOneChallengeTimes[gameRoom.id]) {
					cooldown = ONE_VS_ONE_GAME_COOLDOWN - (Date.now() - Games.lastOneVsOneChallengeTimes[gameRoom.id][user.id]);
				}

				if (cooldown <= 1000) {
					user.say("You are free to begin a one vs. one challenge in " + gameRoom.title + "!");
				} else {
					user.say("You can begin a one vs. one challenge in " + gameRoom.title + " in " +
						Tools.toDurationString(cooldown) + ".");
				}
			}
		},
		aliases: ['chalcooldown', 'ccooldown', 'ccdown'],
	},
	onevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!Config.allowOneVsOneGames || !Config.allowOneVsOneGames.includes(room.id)) {
				user.say("One vs. one challenges are not allowed in " + room.title + ".");
				return;
			}
			if (room.game) {
				user.say("You must wait until the game of " + room.game.name + " ends.");
				return;
			}
			if (Games.reloadInProgress) {
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

			if (room.id in Games.lastOneVsOneChallengeTimes && user.id in Games.lastOneVsOneChallengeTimes[room.id]) {
				const cooldown = ONE_VS_ONE_GAME_COOLDOWN - (Date.now() - Games.lastOneVsOneChallengeTimes[room.id][user.id]);
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

			const challengeFormat = Games.getFormat(targets.slice(1).join(","), true);
			if (Array.isArray(challengeFormat)) {
				user.say(CommandParser.getErrorText(challengeFormat));
				return;
			}

			if (challengeFormat.noOneVsOne || challengeFormat.mode) {
				user.say(challengeFormat.nameWithOptions + " does not allow one vs. one challenges.");
				return;
			}

			const game = Games.createGame(room, oneVsOneFormat) as OneVsOne;
			game.setupChallenge(user, targetUser, challengeFormat);
		},
		aliases: ['onevonechallenge', '1vs1challenge', '1v1challenge', '1vs1c', '1v1c'],
	},
	acceptonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (Games.reloadInProgress) {
				user.say(CommandParser.getErrorText(['reloadInProgress']));
				return;
			}
			if (!room.game || !room.game.acceptChallenge) return;
			room.game.acceptChallenge(user);
		},
		aliases: ['acceptonevonechallenge', 'accept1vs1challenge', 'accept1v1challenge', 'accept1vs1c', 'accept1v1c', 'a1vs1c', 'a1v1c'],
	},
	rejectonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.game || !room.game.rejectChallenge) return;
			room.game.rejectChallenge(user);
		},
		aliases: ['rejectonevonechallenge', 'reject1vs1challenge', 'reject1v1challenge', 'reject1vs1c', 'reject1v1c', 'r1vs1c', 'r1v1c',
			'denyonevonechallenge', 'deny1vs1challenge', 'deny1v1challenge', 'deny1vs1c', 'deny1v1c', 'd1vs1c', 'd1v1c'],
	},
	cancelonevsonechallenge: {
		command: function(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.game || !room.game.cancelChallenge) return;
			room.game.cancelChallenge(user);
		},
		aliases: ['cancelonevonechallenge', 'cancel1vs1challenge', 'cancel1v1challenge', 'cancel1vs1c', 'cancel1v1c', 'c1vs1c', 'c1v1c'],
	},
	headtoheadgame: {
		command: function(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.allowOneVsOneGames || !Config.allowOneVsOneGames.includes(room.id)) {
				this.say("Head to head games are not allowed in " + room.title + ".");
				return;
			}
			if (room.game) {
				this.say("You must wait until the game of " + room.game.name + " ends.");
				return;
			}
			if (Games.reloadInProgress) {
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

			const challengeFormat = Games.getFormat(targets.slice(2).join(","), true);
			if (Array.isArray(challengeFormat)) {
				this.say(CommandParser.getErrorText(challengeFormat));
				return;
			}

			if (challengeFormat.noOneVsOne || challengeFormat.mode) {
				this.say(challengeFormat.nameWithOptions + " does not allow head to head games.");
				return;
			}

			const game = Games.createGame(room, headToHeadFormat) as HeadToHead;
			game.setupChallenge(leftUser, rightUser, challengeFormat);
		},
		aliases: ['hthgame', 'hthg'],
	},
	createtournamentgame: {
		command(target, room, user, cmd) {
			if (this.isPm(room)) return;
			if (!user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id)) {
				return this.sayError(['disabledTournamentGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

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
				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different tournament!");
				format = inputFormat;
			}

			const game = Games.createGame(room, format, room);
			game.signups();
		},
		aliases: ['createtourgame', 'ctourgame', 'ctg', 'createrandomtournamentgame', 'createrandomtourgame', 'randomtourgame', 'crtg'],
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

			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

			const minigameCommands: string[] = [];
			const category = Tools.toId(target);
			for (const i in Games.minigameCommandNames) {
				const format = Games.getExistingFormat(Games.minigameCommandNames[i].format);
				if (format.disabled) continue;
				if (!category || Tools.toId(format.category) === category) {
					minigameCommands.push(i);
				}
			}

			if (!minigameCommands.length) {
				return this.say((category ? "There are no minigames in the category '" + target.trim() + "'" : "A random minigame could " +
					"not be chosen") + ".");
			}

			this.run(Tools.sampleOne(minigameCommands), "");
		},
		aliases: ['randminigame', 'rminigame', 'minigame'],
	},
	creategame: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
				return this.sayError(['disabledGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown " +
					"remaining.");
				return;
			}
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

			const targets = target.split(',');
			let voter = '';
			if (cmd === 'createpickedgame' || cmd === 'cpg') {
				voter = targets[0].trim();
				targets.shift();
			}

			let gameTarget = targets.join(',');
			const targetId = Tools.toId(gameTarget);
			let format: IGameFormat | undefined;
			if (cmd === 'createrandomgame' || cmd === 'crg' || cmd === 'randomgame' || targetId === 'random') {
				const option = Tools.toId(gameTarget);
				let formats: string[];
				if (option === 'freejoin' || option === 'fj') {
					formats = Games.freejoinFormatTargets;
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
				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different game!");
				format = inputFormat;
			}

			format.voter = voter;
			const game = Games.createGame(room, format);
			game.signups();
		},
		aliases: ['cg', 'createrandomgame', 'crg', 'randomgame', 'createpickedgame', 'cpg'],
	},
	startgame: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				if (!user.hasRank(room, 'voice') || room.game.started) return;
				if (!room.game.start()) this.say("Not enough players have joined the game.");
			} else if (room.userHostedGame) {
				const isHost = room.userHostedGame.isHost(user);
				const isAuth = !isHost && user.hasRank(room, 'voice');
				if ((!isHost && !isAuth) || room.userHostedGame.started) return;
				if (!room.userHostedGame.start(isAuth)) user.say("Not enough players have joined your game.");
			}
		},
		aliases: ['sg'],
	},
	endgame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (room.game) {
					room.game.forceEnd(user, target.trim());
				}
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (room.game) {
					room.game.forceEnd(user, target.trim());
				} else if (room.userHostedGame) {
					room.userHostedGame.forceEnd(user, target.trim());
				}
			}
		},
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
				if (userData && userData.rank === Client.groupSymbols.muted) return this.say("You cannot join games while you are muted.");

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
	},
	leavegame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (!target) return;
				const chatRoom = Rooms.search(Tools.toRoomId(target));
				if (!chatRoom) return;

				if (chatRoom.game) {
					chatRoom.game.removePlayer(user);
				} else if (chatRoom.userHostedGame) {
					chatRoom.userHostedGame.removePlayer(user);
				}
			} else {
				if (room.game) {
					room.game.removePlayer(user);
				} else if (room.userHostedGame) {
					room.userHostedGame.removePlayer(user);
				}
			}
		},
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
			this.sayCommand("/modnote " + user.name + " DQed " + player.name + " from " + room.game.name + ".");
		},
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
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			if (gameRoom.game) {
				const game = gameRoom.game;
				let html = game.getMascotAndNameHtml();
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
				if (!user.hasRank(room, 'voice')) return;
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
	},
	lastgame: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) {
					return this.sayError(['disabledGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) {
					return this.sayError(['disabledGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!targets[0]) {
				if (!database.lastGameTime) return this.say("No scripted games have been played in " + gameRoom.title + ".");
				return this.say("The last scripted game in " + gameRoom.title + " ended **" +
					Tools.toDurationString(Date.now() - database.lastGameTime) + "** ago.");
			}
			const format = Games.getFormat(targets[0]);
			if (Array.isArray(format)) return this.sayError(format);
			if (!database.lastGameFormatTimes || !(format.id in database.lastGameFormatTimes)) {
				return this.say(format.name + " has not been played in " + gameRoom.title + ".");
			}
			this.say("The last game of " + format.name + " in " + gameRoom.title + " ended **" +
				Tools.toDurationString(Date.now() - database.lastGameFormatTimes[format.id]) + "** ago.");
		},
	},
};

/* eslint-enable */