// eslint-disable-next-line @typescript-eslint/naming-convention
import child_process = require('child_process');
import fs = require('fs');
import path = require('path');

import type { CommandContext } from "./command-parser";
import type { OneVsOne } from './games/internal/one-vs-one';
import type { Player } from "./room-activity";
import type { ScriptedGame } from './room-game-scripted';
import type { UserHostedGame } from './room-game-user-hosted';
import type { Room } from "./rooms";
import type { CommandDefinitions } from "./types/command-parser";
import type { IFormat, IPokemon } from "./types/dex";
import type { GameDifficulty, IGameFormat } from "./types/games";
import type { IUserHostedGameStats, UserHostStatus } from './types/storage';
import type { IBattleData, TournamentPlace } from './types/tournaments';
import type { User } from "./users";

const AWARDED_BOT_GREETING_DURATION = 60 * 24 * 60 * 60 * 1000;
const ONE_VS_ONE_GAME_COOLDOWN = 2 * 60 * 60 * 1000;
const RANDOM_GENERATOR_LIMIT = 6;

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

const commands: CommandDefinitions<CommandContext> = {
	/**
	 * Developer commands
	 */
	eval: {
		command(target, room, user) {
			try {
				this.say(eval(target));
			} catch (e) {
				this.say((e as Error).message);
				console.log((e as Error).stack);
			}
		},
		aliases: ['js'],
		developerOnly: true,
	},
	gitpull: {
		command(target, room, user) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			child_process.exec('git pull', {}, err => {
				if (err) {
					this.say("An error occurred while running ``git pull``: " + err.message);
				} else {
					this.say("Successfully ran ``git pull``.");
				}
			});
		},
		developerOnly: true,
	},
	/*
	updateps: {
		async asyncCommand(target, room, user) {
			this.say("Running ``update-ps``...");
			await Tools.runUpdatePS(user);
		},
		developerOnly: true,
	},
	*/
	reload: {
		command(target, room, user) {
			if (!target) return;
			if (__reloadInProgress) return this.say("You must wait for the current reload to finish.");

			void __reloadModules(user.name, target.split(","));
		},
		aliases: ['hotpatch'],
		developerOnly: true,
	},

	/**
	 * Informational commands
	 */
	jointournament: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const targetUser = Users.get(target);
			this.say((targetUser ? targetUser.name + ": you" : "You") + " can join a scripted tournament by clicking the ``Join`` button " +
				"at the top of the chat or using the command ``/tour join``. | Guide to joining user-hosted tournaments: " +
				"http://pstournaments.weebly.com/joining-a-tournament.html");
		},
		aliases: ['jointour'],
	},
	autodq: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice')) return;
			if (!Config.tournamentAutoDQTimers || !(room.id in Config.tournamentAutoDQTimers)) {
				return this.say("The automatic disqualification timer is not set for " + room.title + ".");
			}
			this.say("The automatic disqualification timer is currently set to " + Config.tournamentAutoDQTimers[room.id] + " minutes. " +
				"You will be disqualified from a tournament if you fail to send or accept a challenge from your opponent before the " +
				"timer expires.");
		},
	},
	sampleteams: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!format.teams) return this.say("No sample teams link found for " + format.name + ".");
			this.say("**" + format.name + " sample teams**: " + format.teams);
		},
		aliases: ['steams'],
	},
	roomsampleteams: {
		command(target, room, user) {
			let samplesRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				samplesRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				samplesRoom = room;
			}

			const database = Storage.getDatabase(samplesRoom);
			if (!database.roomSampleTeamsLink) return this.say("No room sample teams link found for " + samplesRoom.title + ".");
			this.sayHtml("<a href='" + database.roomSampleTeamsLink + "'>" + samplesRoom.title + " sample teams</a>", samplesRoom);
		},
		aliases: ['roomsamples'],
	},
	viabilityranking: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!format.viability) return this.say("No viability ranking link found for " + format.name + ".");
			this.say("**" + format.name + " viability ranking**: " + format.viability);
		},
		aliases: ['vranking'],
	},
	format: {
		command(target, room, user) {
			let pmRoom: Room | undefined;
			if (this.isPm(room)) {
				user.rooms.forEach((value, room) => {
					if (!pmRoom && Users.self.hasRank(room, 'bot')) pmRoom = room;
				});
				if (!pmRoom) return this.say("You must be in a room where " + Users.self.name + " has bot rank.");
			} else {
				if (!user.hasRank(room, 'voice')) return;
				pmRoom = room;
			}
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			const html = Dex.getFormatInfoDisplay(format);
			if (!html.length) return this.say("No info found for " + format.name + ".");
			this.sayHtml("<b>" + format.name + "</b>" + html, pmRoom);
		},
		aliases: ['om', 'tier'],
	},
	randombattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomBattleMoves) return this.say("No Random Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randombattles', 'randbat', 'randbats'],
	},
	randomdoublesbattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomDoubleBattleMoves) return this.say("No Random Doubles Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomDoubleBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " doubles moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randomdoublesbattles', 'randombattledoubles', 'randombattlesdoubles', 'randdubs', 'randbatdubs', 'randbatsdubs'],
	},

	/**
	 * Game commands
	 */
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
				!Config.githubApiCredentials.gist) {
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
		async asyncCommand(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				await this.run('toss');
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
			const canEgg = await this.run('toss') as boolean;
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

			let hasRoomStaff = false;
			room.users.forEach((rank, user) => {
				if (!hasRoomStaff && user.hasRank(room, 'driver')) hasRoomStaff = true;
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
			if (!game || !game.setupChallenge) return;
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

			const game = Games.createGame(room, headToHeadFormat) as OneVsOne;
			if (!game || !game.setupChallenge) return;
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

			const remainingGameCooldown = Games.getRemainingTournamentGameCooldown(room, true);
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
		async asyncCommand(target, room, user, cmd) {
			let gameRoom: Room | undefined;
			if (this.isPm(room)) {
				if (room.game) return;

				user.rooms.forEach((data, room) => {
					if (!gameRoom && Config.allowScriptedGames && Config.allowScriptedGames.includes(room.id) &&
						Users.self.hasRank(room, 'bot')) {
						gameRoom = room;
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

			await this.run(Tools.sampleOne(minigameCommands), "");
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

			const targetId = Tools.toId(target);
			let format: IGameFormat | undefined;
			if (cmd === 'createrandomgame' || cmd === 'crg' || cmd === 'randomgame' || targetId === 'random') {
				const option = Tools.toId(target);
				let formats: string[];
				if (option === 'freejoin' || option === 'fj') {
					formats = Games.freejoinFormatTargets;
				} else {
					let filter;
					if (option) filter = (format: IGameFormat) => Tools.toId(format.category) === option;
					formats = Games.getFormatList(filter).map(x => x.name);
					if (!formats.length) return this.say("There are no games in the category '" + target.trim() + "'.");
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
					for (const format of formats) {
						if (Games.canCreateGame(room, format) === true) {
							target = format.name;
							break;
						}
					}
				}

				const inputFormat = Games.getFormat(target, true);
				if (Array.isArray(inputFormat)) return this.sayError(inputFormat);
				if (inputFormat.tournamentGame) return this.say("You must use the ``" + Config.commandCharacter + "ctg`` command.");
				const canCreateGame = Games.canCreateGame(room, inputFormat);
				if (canCreateGame !== true) return this.say(canCreateGame + " Please choose a different game!");
				format = inputFormat;
			}

			const game = Games.createGame(room, format);
			game.signups();
		},
		aliases: ['cg', 'createrandomgame', 'crg', 'randomgame'],
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot) : "") + "<b>" + game.name + "</b><br />";
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot, true) : "") + "<b>" + game.name + "</b><br />";
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
	pastuserhostedgames: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(targetRoom.id)) {
					return this.sayError(['disabledUserHostedGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) {
					return this.sayError(['disabledUserHostedGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!database.pastUserHostedGames) return this.say("The past user-hosted games list is empty.");
			const names: string[] = [];
			const option = Tools.toId(targets[0]);
			const displayTimes = option === 'time' || option === 'times';
			const now = Date.now();
			for (const pastGame of database.pastUserHostedGames) {
				const format = Games.getUserHostedFormat(pastGame.inputTarget);
				let game = Array.isArray(format) ? pastGame.name : format.name;

				if (displayTimes) {
					let duration = now - pastGame.time;
					if (duration < 1000) duration = 1000;
					game += " <i>(" + Tools.toDurationString(duration, {hhmmss: true}) + " ago)</i>";
				}

				names.push(game);
			}
			this.sayHtml("<b>Past user-hosted games</b>" + (displayTimes ? "" : " (most recent first)") + ": " + Tools.joinList(names) +
				".", gameRoom);
		},
		aliases: ['pastuserhosts', 'pasthosts'],
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
	lastuserhostedgame: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(targetRoom.id)) {
					return this.sayError(['disabledUserHostedGameFeatures', targetRoom.title]);
				}
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) {
					return this.sayError(['disabledUserHostedGameFeatures', room.title]);
				}
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!targets[0]) {
				if (!database.lastUserHostedGameTime) return this.say("No user-hosted games have been played in " + gameRoom.title + ".");
				return this.say("The last user-hosted game in " + gameRoom.title + " ended **" +
					Tools.toDurationString(Date.now() - database.lastUserHostedGameTime) + "** ago.");
			}
			const format = Games.getUserHostedFormat(targets[0]);
			if (Array.isArray(format)) return this.sayError(format);
			if (!database.lastUserHostedGameFormatTimes || !(format.id in database.lastUserHostedGameFormatTimes)) {
				return this.say(format.name + " has not been hosted in " + gameRoom.title + ".");
			}
			this.say("The last user-hosted game of " + format.name + " in " + gameRoom.title + " ended **" +
				Tools.toDurationString(Date.now() - database.lastUserHostedGameFormatTimes[format.id]) + "** ago.");
		},
		aliases: ['lastuserhost', 'lasthost'],
	},
	host: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			const database = Storage.getDatabase(room);
			const approvedHost = database.userHostStatuses && database.userHostStatuses[user.id] === 'approved' ? true : false;
			if (!user.hasRank(room, 'voice') && !approvedHost) return;
			if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) {
				return this.sayError(['disabledUserHostedGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'user-hosted game']);

			const targets = target.split(",");
			const host = Users.get(targets[0]);
			if (!host || !host.rooms.has(room)) return this.say("Please specify a user currently in this room.");
			if (approvedHost && user !== host) return user.say("You are only able to use this command on yourself as approved host.");
			targets.shift();

			const format = Games.getUserHostedFormat(targets.join(","), user);
			if (Array.isArray(format)) return this.sayError(format);
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);

			if (!approvedHost && database.userHostStatuses && host.id in database.userHostStatuses) {
				if (database.userHostStatuses[host.id] === 'unapproved') {
					return this.say(host.name + " is currently unapproved for hosting games.");
				} else if (database.userHostStatuses[host.id] === 'novice') {
					const gameHostingDifficulty = Config.userHostedGameHostDifficulties &&
						format.id in Config.userHostedGameHostDifficulties ? Config.userHostedGameHostDifficulties[format.id] : 'medium';
					if (gameHostingDifficulty !== 'easy') {
						return this.say(host.name + " is currently unapproved for hosting '" + gameHostingDifficulty + "' games such as " +
							format.name + ".");
					}
				}
			}

			if (Config.userHostCooldownTimers && room.id in Config.userHostCooldownTimers && room.id in Games.lastUserHostTimes &&
				host.id in Games.lastUserHostTimes[room.id]) {
				const userHostCooldown = (Config.userHostCooldownTimers[room.id] * 60 * 1000) -
					(Date.now() - Games.lastUserHostTimes[room.id][host.id]);
				if (userHostCooldown > 1000) {
					const durationString = Tools.toDurationString(userHostCooldown);
					return this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of " +
						host.name + "'s host cooldown remaining.");
				}
			}

			if (Config.userHostFormatCooldownTimers && room.id in Config.userHostFormatCooldownTimers &&
				room.id in Games.lastUserHostFormatTimes && format.id in Games.lastUserHostFormatTimes[room.id]) {
				const formatCooldown = (Config.userHostFormatCooldownTimers[room.id] * 60 * 1000) -
					(Date.now() - Games.lastUserHostFormatTimes[room.id][format.id]);
				if (formatCooldown > 1000) {
					const durationString = Tools.toDurationString(formatCooldown);
					return this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the " +
						format.name + " user-host cooldown remaining.");
				}
			}

			if (Config.maxQueuedUserHostedGames && room.id in Config.maxQueuedUserHostedGames && database.userHostedGameQueue &&
				database.userHostedGameQueue.length >= Config.maxQueuedUserHostedGames[room.id]) {
				return this.say("The host queue is full.");
			}

			const otherUsersQueued = database.userHostedGameQueue && database.userHostedGameQueue.length;
			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			const inCooldown = remainingGameCooldown > 1000;
			const requiresScriptedGame = Games.requiresScriptedGame(room);
			if (room.game || room.userHostedGame || otherUsersQueued || inCooldown || requiresScriptedGame) {
				if (database.userHostedGameQueue) {
					for (const game of database.userHostedGameQueue) {
						const alreadyQueued = Games.getExistingUserHostedFormat(game.format).name === format.name;
						if (game.id === host.id) {
							if (alreadyQueued && !format.inputTarget.includes(',')) {
								return this.say(host.name + " is already in the host queue for " + format.name + ".");
							}
							game.format = format.inputTarget;
							return this.say(host.name + "'s game was changed to " + format.name + ".");
						} else {
							if (alreadyQueued) {
								return this.say("Another host is currently queued for " + format.name + ". " + host.name + " please " +
									"choose a different game!");
							}
						}
					}
				} else {
					database.userHostedGameQueue = [];
				}

				let reason = '';
				if (!room.game && !room.userHostedGame) {
					if (otherUsersQueued) {
						reason = (database.userHostedGameQueue.length === 1 ? "Another host is" : database.userHostedGameQueue.length +
							" other hosts are") + " currently queued";
					} else if (inCooldown) {
						const durationString = Tools.toDurationString(remainingGameCooldown);
						reason = "There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game " +
							"cooldown remaining";
					} else if (requiresScriptedGame) {
						reason = "At least 1 scripted game needs to be played before the next user-hosted game can start";
					}
				}
				this.say((reason ? reason + " so " : "") + host.name + " was added to the host queue.");
				database.userHostedGameQueue.push({
					format: format.inputTarget,
					id: host.id,
					name: host.name,
				});
				Storage.exportDatabase(room.id);
				return;
			}
			const game = Games.createUserHostedGame(room, format, host);
			game.signups();
		},
	},
	subhost: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || !room.userHostedGame) return;
			const targetUser = Users.get(Tools.toId(target));
			if (!targetUser || !targetUser.rooms.has(room) || targetUser.isBot(room)) {
				return this.sayError(["invalidUserInRoom"]);
			}
			if (room.userHostedGame.hostId === targetUser.id) return this.say(targetUser.name + " is already the game's host.");
			if (room.userHostedGame.subHostId === targetUser.id) return this.say(targetUser.name + " is already the game's sub-host.");
			room.userHostedGame.setSubHost(targetUser);
			this.say(targetUser.name + " is now the sub-host for " + room.userHostedGame.name + ".");
		},
	},
	nexthost: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) {
				return this.sayError(['disabledUserHostedGameFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'user-hosted game']);
			if (Games.requiresScriptedGame(room)) {
				this.say("At least 1 scripted game needs to be played before the next user-hosted game can start.");
				return;
			}
			const database = Storage.getDatabase(room);
			if (!database.userHostedGameQueue || !database.userHostedGameQueue.length) return this.sayError(['emptyUserHostedGameQueue']);
			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown " +
					"remaining.");
				return;
			}
			const nextHost = database.userHostedGameQueue[0];
			const format = Games.getUserHostedFormat(nextHost.format, user);
			if (Array.isArray(format)) return this.sayError(format);
			if (Games.reloadInProgress) return this.sayError(['reloadInProgress']);
			database.userHostedGameQueue.shift();
			const game = Games.createUserHostedGame(room, format, nextHost.name);
			game.signups();
			Storage.exportDatabase(room.id);
		},
	},
	hostqueue: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				gameRoom = room;
			}
			const database = Storage.getDatabase(gameRoom);
			if (!database.userHostedGameQueue || !database.userHostedGameQueue.length) return this.sayError(['emptyUserHostedGameQueue']);
			const html = [];
			for (let i = 0; i < database.userHostedGameQueue.length; i++) {
				let name = database.userHostedGameQueue[i].name;
				const user = Users.get(database.userHostedGameQueue[i].name);
				if (user) name = user.name;
				html.push("<b>" + (i + 1) + "</b>: " + name + " (" +
					Games.getExistingUserHostedFormat(database.userHostedGameQueue[i].format).name + ")");
			}
			this.sayHtml("<b>Host queue</b>:<br /><br />" + html.join("<br />"), gameRoom);
		},
		aliases: ['hq'],
	},
	hosttime: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targetRoom = Rooms.search(target);
			if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
			if (Config.userHostCooldownTimers && targetRoom.id in Config.userHostCooldownTimers &&
				targetRoom.id in Games.lastUserHostTimes && user.id in Games.lastUserHostTimes[targetRoom.id]) {
				const userHostCooldown = (Config.userHostCooldownTimers[targetRoom.id] * 60 * 1000) -
					(Date.now() - Games.lastUserHostTimes[targetRoom.id][user.id]);
				if (userHostCooldown > 1000) {
					const durationString = Tools.toDurationString(userHostCooldown);
					this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of your host " +
						"cooldown remaining.");
				} else {
					this.say("Your host cooldown has ended.");
				}
			} else {
				this.say("You do not have a host cooldown.");
			}
		},
		aliases: ['ht'],
	},
	dehost: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			const database = Storage.getDatabase(room);
			const approvedHost = database.userHostStatuses && database.userHostStatuses[user.id] === 'approved' ? true : false;
			if (!user.hasRank(room, 'voice') && !approvedHost) return;
			const id = Tools.toId(target);
			if (approvedHost && id !== user.id) return user.say("You are only able to use this command on yourself as approved host.");
			if (room.userHostedGame && (room.userHostedGame.hostId === id || room.userHostedGame.subHostId === id)) {
				return this.run('endgame');
			}
			if (!database.userHostedGameQueue || !database.userHostedGameQueue.length) return this.sayError(['emptyUserHostedGameQueue']);
			let position = -1;
			for (let i = 0; i < database.userHostedGameQueue.length; i++) {
				if (database.userHostedGameQueue[i].id === id) {
					position = i;
					break;
				}
			}
			if (position === -1) return this.say(this.sanitizeResponse(target.trim() + " is not in the host queue."));
			database.userHostedGameQueue.splice(position, 1);
			this.say(this.sanitizeResponse(target.trim() + " was removed from the host queue."));
			for (let i = position; i < database.userHostedGameQueue.length; i++) {
				if (!database.userHostedGameQueue[i]) break;
				const user = Users.get(database.userHostedGameQueue[i].name);
				if (user) user.say("You are now #" + (i + 1) + " in the host queue.");
			}
			Storage.exportDatabase(room.id);
		},
		aliases: ['unhost'],
	},
	hoststatus: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'voice')) return;
				gameRoom = room;
			}
			let hostName = targets.length ? targets[0].trim() : "";
			let hostId: string;
			const targetUser = Users.get(hostName);
			if (targetUser) {
				hostName = targetUser.name;
				hostId = targetUser.id;
			} else {
				hostId = Tools.toId(hostName);
			}

			if (!hostId) return this.say("Please specify a user and optionally a new host status.");

			const database = Storage.getDatabase(gameRoom);
			if (targets.length > 1) {
				if (!user.hasRank(gameRoom, 'driver')) return;
				const status = Tools.toId(targets[1]);
				if (status === 'standard') {
					if (!database.userHostStatuses || !(hostId in database.userHostStatuses)) {
						return this.say(hostName + "'s host status is already standard.");
					}
					delete database.userHostStatuses[hostId];
					return this.say(hostName + "'s host status has been set to 'standard'.");
				} else if (status === 'unapproved' || status === 'novice' || status === 'approved') {
					if (!database.userHostStatuses) database.userHostStatuses = {};
					database.userHostStatuses[hostId] = status;
					return this.say(hostName + "'s host status has been set to '" + status + "'.");
				}
			} else {
				if (!database.userHostStatuses || !(hostId in database.userHostStatuses)) {
					return this.say(hostName + "'s host status is 'standard'.");
				}
				this.say(hostName + "'s host status is '" + database.userHostStatuses[hostId] + "'.");
			}
		},
		aliases: ['hstatus'],
	},
	hoststatuslist: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				gameRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'voice')) return;
				gameRoom = room;
			}

			const status = Tools.toId(targets[0]) as UserHostStatus;
			if (status === 'unapproved' || status === 'novice' || status === 'approved') {
				const list: string[] = [];
				const database = Storage.getDatabase(gameRoom);
				if (database.userHostStatuses) {
					for (const i in database.userHostStatuses) {
						if (database.userHostStatuses[i] === status) {
							const host = Users.get(i);
							list.push(host ? host.name : i);
						}
					}
				}
				if (!list.length) return this.say("There are no users with a host status of '" + status + "'.");
				this.sayHtml("<b>Users with a host status of '" + status + "'</b>: " + list.join(", "), gameRoom);
			} else {
				return this.say("Please specify a valid host status (unapproved, novice, or approved).");
			}
		},
		aliases: ['hstatuslist'],
	},
	hoststats: {
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

			if (!user.hasRank(gameRoom, 'driver')) return;

			let hostName = targets.length ? targets[0].trim() : "";
			let hostId: string;
			const targetUser = Users.get(hostName);
			if (targetUser) {
				hostName = targetUser.name;
				hostId = targetUser.id;
			} else {
				hostId = Tools.toId(hostName);
			}

			if (!hostId) return this.say("Please specify a user.");

			const database = Storage.getDatabase(gameRoom);
			if (!database.userHostedGameStats || !(hostId in database.userHostedGameStats)) {
				return this.say(hostName + " has not hosted yet this cycle.");
			}

			let html = "<b>" + hostName + "'s cycle host stats</b>:<br />";
			const stats: Dict<IUserHostedGameStats[]> = {};
			for (const game of database.userHostedGameStats[hostId]) {
				const date = new Date(game.startTime);
				const key = (date.getMonth() + 1) + '/' + date.getDate();
				if (!(key in stats)) stats[key] = [];
				stats[key].push(game);
			}

			for (const day in stats) {
				let dayHtml = "<details><summary>" + day + "</summary>";
				const dayStats: string[] = [];
				for (const stat of stats[day]) {
					const format = Games.getUserHostedFormat(stat.inputTarget);
					const name = Array.isArray(format) ? stat.format : format.name;
					dayStats.push("<b>" + name + "</b>: " + stat.playerCount + " players; " +
						Tools.toDurationString(stat.endTime - stat.startTime));
				}
				dayHtml += dayStats.join("<br />") + "</details>";
				html += dayHtml;
			}

			this.sayHtml(html, gameRoom);
		},
		aliases: ['hstats'],
	},
	randompick: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
			const choices: string[] = [];
			const targets = target.split(',');
			for (const target of targets) {
				if (Tools.toId(target)) choices.push(target.trim());
			}
			if (choices.length < 2) return this.say("You must specify at least 2 choices.");
			this.say("**Random pick**: " + Tools.sampleOne(choices));
		},
		aliases: ['rpick'],
	},
	randomorder: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
			const choices: string[] = [];
			const targets = target.split(',');
			for (const target of targets) {
				if (Tools.toId(target)) choices.push(target.trim());
			}
			if (choices.length < 2) return this.say("You must specify at least 2 items.");
			this.say("**Random order**: " + Tools.shuffle(choices).join(', '));
		},
		aliases: ['rorder', 'shuffle'],
	},
	timer: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (!user.hasRank(room, 'voice')) {
				if (room.userHostedGame && room.userHostedGame.isHost(user)) return this.run('gametimer');
				return;
			}
			const id = Tools.toId(target);
			if (id === 'off' || id === 'end') {
				if (!room.timers || !(user.id in room.timers)) return this.say("You do not have a timer running.");
				clearTimeout(room.timers[user.id]);
				delete room.timers[user.id];
				return this.say("Your timer has been turned off.");
			}

			let time: number;
			if (id.length === 1) {
				time = parseInt(id) * 60;
			} else {
				time = parseInt(id);
			}
			if (isNaN(time) || time > 1800 || time < 5) return this.say("Please enter an amount of time between 5 seconds and 30 minutes.");
			time *= 1000;

			if (!room.timers) room.timers = {};
			if (user.id in room.timers) clearTimeout(room.timers[user.id]);
			room.timers[user.id] = setTimeout(() => {
				room.say(user.name + ": time is up!");
				delete room.timers![user.id];
			}, time);
			this.say("Your timer has been set for: " + Tools.toDurationString(time) + ".");
		},
	},
	repeatmessage: {
		command(target, room, user, cmd) {
			const targets = target.split(',');
			let repeatSummary = !target;
			let repeatRoom: Room | undefined;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				targets.shift();
				repeatRoom = targetRoom;
				repeatSummary = !targets.length;
			} else {
				repeatRoom = room;
			}

			if (!user.hasRank(repeatRoom, 'driver')) return;

			if (repeatSummary) {
				if (!repeatRoom.repeatedMessages) return this.say("There are currently no repeated messages in this room.");
				let html = "<b>Repeated messages</b>:<ul>";
				for (const i in repeatRoom.repeatedMessages) {
					const repeatedMessage = repeatRoom.repeatedMessages[i];
					html += "<li><b>" + repeatedMessage.name + "</b>: every " +
						Tools.toDurationString(repeatedMessage.interval) + " with the text <code>" +
						repeatedMessage.message + "</code> (" + repeatedMessage.user + ")</li>";
				}
				html += "</ul>";
				return this.sayHtml(html, repeatRoom);
			}

			const action = Tools.toId(targets[0]);
			if (action === 'off' || action === 'end' || action === 'stop' || action === 'delete' || action === 'remove') {
				const messageId = Tools.toId(targets[1]);
				if (!repeatRoom.repeatedMessages || !(messageId in repeatRoom.repeatedMessages)) {
					return this.say("There is no repeating message with the name '" + targets[1].trim() + "'.");
				}
				clearInterval(repeatRoom.repeatedMessages[messageId].timer);
				const name = repeatRoom.repeatedMessages[messageId].name;
				delete repeatRoom.repeatedMessages[messageId];
				if (!Object.keys(repeatRoom.repeatedMessages).length) delete repeatRoom.repeatedMessages;
				return this.say("The repeating message with the name '" + name + "' has been stopped.");
			}

			if (action !== 'add' || targets.length < 4) {
				return this.say("Usage: ``" + Config.commandCharacter + "" + cmd + " add, [name], [interval in minutes], message``.");
			}

			const messageName = targets[1].trim();
			const messageId = Tools.toId(messageName);
			if (!messageId) return this.say("Please specify a valid message name.");

			if (repeatRoom.repeatedMessages && messageId in repeatRoom.repeatedMessages) {
				return this.say("There is already a repeating message with the name '" + messageName + "'.");
			}

			const minutes = parseInt(targets[2].trim());
			const maxHours = 6;
			if (isNaN(minutes) || minutes < 5 || minutes > (maxHours * 60)) {
				return this.say("Please specify an interval between 5 minutes and " + maxHours + " hours.");
			}
			const interval = minutes * 60 * 1000;

			const message = this.sanitizeResponse(targets.slice(3).join(',').trim(), ['daily', 'roomfaq', 'rfaq', 'roomevents', 'events']);
			if (!Tools.toId(message).length) return this.say("Please specify a valid message.");

			if (!repeatRoom.repeatedMessages) repeatRoom.repeatedMessages = {};
			repeatRoom.repeatedMessages[messageId] = {
				timer: setInterval(() => repeatRoom!.say(message), interval),
				message,
				interval,
				name: messageName,
				user: user.name,
			};

			const duration = Tools.toDurationString(interval);
			this.say("The message with the name '" + messageName + "' has been set to repeat every " + duration + ".");
			repeatRoom.sayCommand("/modnote " + user.name + " set a message to repeat every " + duration + " with the text '" +
				message + "'");
		},
		aliases: ['repeatm', 'repeatmessages'],
	},
	gametimer: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			let targets: string[];
			if (target.includes(',')) {
				targets = target.split(',');
			} else {
				targets = target.split(' ');
			}

			const offArguments = ['off', 'end', 'clear', 'cancel'];
			if (offArguments.includes(Tools.toId(targets[0]))) {
				if (!room.userHostedGame.gameTimer) return this.say("There is no game timer running.");
				clearTimeout(room.userHostedGame.gameTimer);
				room.userHostedGame.gameTimer = null;
				return this.say("The game timer has been turned off.");
			}

			const now = Date.now();
			const secondsArguments = ['second', 'seconds', 'sec', 'secs'];
			let time = 0;
			if (cmd.includes('rand')) {
				const isSeconds = secondsArguments.includes(Tools.toId(targets[0]));
				let minimumTime: number;
				let maximumTime: number;
				const remainingMinutes = Math.floor((room.userHostedGame.endTime - now) / 60 / 1000);
				if (isSeconds && targets.length === 3) {
					minimumTime = parseInt(targets[1]);
					maximumTime = parseInt(targets[2]);
					if (isNaN(minimumTime) || minimumTime < 3) {
						return this.say("Please enter a minimum amount of seconds no less than 3.");
					}
					if (isNaN(maximumTime) || maximumTime > 60) {
						return this.say("Please enter a maximum amount of seconds no more than 60.");
					}
				} else if (targets.length === 2) {
					minimumTime = parseInt(targets[0]);
					maximumTime = parseInt(targets[1]);
					if (isNaN(minimumTime) || minimumTime < 1) {
						return this.say("Please enter a minimum amount of minutes no less than 1.");
					}
					if (isNaN(maximumTime) || maximumTime > remainingMinutes) {
						return this.say("Please enter a maximum amount of minutes no more than " + remainingMinutes + ".");
					}
				} else {
					if (isSeconds) {
						minimumTime = 3;
						maximumTime = 60;
					} else {
						minimumTime = 1;
						maximumTime = remainingMinutes / 3;
					}
				}

				while (time < minimumTime || time > maximumTime) {
					time = room.userHostedGame.random(maximumTime) + 1;
				}
			} else {
				time = parseFloat(targets[0].trim());
				if (secondsArguments.includes(Tools.toId(targets[1]))) {
					if (isNaN(time) || time > 60 || time < 3) return this.say("Please enter an amount of seconds between 3 and 60.");
					time *= 1000;
				} else {
					if (isNaN(time) || time < 1) {
						return this.say("Please enter a valid amount of minutes (add `` seconds`` to use seconds).");
					}
					time *= 60 * 1000;
				}
			}

			if (now + time > room.userHostedGame.endTime) {
				return this.say("There are only " + Tools.toDurationString(room.userHostedGame.endTime - now) + " left in the game!");
			}

			if (room.userHostedGame.gameTimer) clearTimeout(room.userHostedGame.gameTimer);
			room.userHostedGame.gameTimer = setTimeout(() => {
				if (user.id === room.userHostedGame!.hostId) room.say(room.userHostedGame!.hostName + ": time is up!");
				room.userHostedGame!.gameTimer = null;
			}, time);
			this.say("Game timer set for: " + Tools.toDurationString(time) + ".");
		},
		aliases: ['gtimer', 'randomgametimer', 'randomgtimer', 'randgametimer', 'randgtimer'],
	},
	startgametimer: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const id = Tools.toId(target);
			if (id === 'off' || id === 'end' || id === 'stop') {
				if (!room.userHostedGame.startTimer) return this.say("There is no game start timer set.");
				clearTimeout(room.userHostedGame.startTimer);
				delete room.userHostedGame.startTimer;
				return this.say("The game start timer has been turned off.");
			}

			const minutes = parseInt(target.trim());
			if (isNaN(minutes) || minutes < 2 || minutes > 5) return this.say("You must specify a number of minutes between 2 and 5.");
			room.userHostedGame.setStartTimer(minutes);
			this.say("The game will start in " + minutes + " minutes.");
		},
		aliases: ['sgtimer'],
	},
	gamecap: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			let game: ScriptedGame | UserHostedGame | undefined;
			const cap = parseInt(target);
			if (room.game) {
				if (!user.hasRank(room, 'voice')) return;
				game = room.game;
			} else if (room.userHostedGame) {
				if (!room.userHostedGame.isHost(user)) return;
				game = room.userHostedGame;
			}
			if (!game) return;
			if (isNaN(cap)) return this.say("You must specify a valid player cap.");
			if (game.playerCount >= cap) return this.run('startgame');
			game.playerCap = cap;
			this.say("The game's player cap has been set to **" + cap + "**.");
		},
		aliases: ['gcap'],
	},
	addplayer: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;

			const targetUsers: User[] = [];
			const usersNotInRoom: string[] = [];
			const targets = target.split(",");
			for (const target of targets) {
				const targetUser = Users.get(target);
				if (!targetUser || !targetUser.rooms.has(room)) {
					usersNotInRoom.push(target.trim());
					continue;
				}

				if (!(targetUser.id in room.userHostedGame.players) || room.userHostedGame.players[targetUser.id].eliminated) {
					targetUsers.push(targetUser);
				}
			}

			if (usersNotInRoom.length) {
				return this.say(Tools.joinList(usersNotInRoom) + " " + (usersNotInRoom.length > 1 ? "are" : "is") + " not in the room.");
			}
			if (!targetUsers.length) return this.say("You must specify at least one user who is not already in the game.");

			for (const targetUser of targetUsers) {
				if (room.userHostedGame.players[targetUser.id]) {
					room.userHostedGame.players[targetUser.id].eliminated = false;
				} else {
					room.userHostedGame.createPlayer(targetUser);
				}
			}

			this.say("Added " + Tools.joinList(targetUsers.map(x => x.name)) + " to the player list.");
		},
		aliases: ['apl', 'addplayers'],
	},
	removeplayer: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const users: string[] = [];
			const targets = target.split(",");
			for (const target of targets) {
				const id = Tools.toId(target);
				if (id && room.userHostedGame.players[id] && !room.userHostedGame.players[id].eliminated) {
					users.push(room.userHostedGame.players[id].name);
				}
			}
			if (!users.length) return this.say("Please specify at least one player who is still in the game.");
			for (const user of users) {
				room.userHostedGame.destroyPlayer(user);
			}

			// @ts-expect-error
			if (room.userHostedGame.started) room.userHostedGame.round++;
			if (cmd !== 'silentelim' && cmd !== 'selim' && cmd !== 'srpl') await this.run('players');
		},
		aliases: ['removeplayers', 'srpl', 'rpl', 'silentelim', 'selim', 'elim', 'eliminate', 'eliminateplayer', 'eliminateplayers'],
	},
	addteamplayer: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.teams) return this.say("Teams have not yet been formed.");

			const targets = target.split(",");
			const teamId = Tools.toId(targets[0]);
			if (!(teamId in room.userHostedGame.teams)) return this.say("'" + targets[0].trim() + "' is not a team.");
			targets.shift();

			const team = room.userHostedGame.teams[teamId];
			const targetUsers: User[] = [];
			const usersNotInRoom: string[] = [];
			for (const target of targets) {
				const targetUser = Users.get(target);
				if (!targetUser || !targetUser.rooms.has(room)) {
					usersNotInRoom.push(target.trim());
					continue;
				}

				if (!(targetUser.id in room.userHostedGame.players) || room.userHostedGame.players[targetUser.id].eliminated) {
					targetUsers.push(targetUser);
				}
			}

			if (usersNotInRoom.length) {
				return this.say(Tools.joinList(usersNotInRoom) + " " + (usersNotInRoom.length > 1 ? "are" : "is") + " not in the room.");
			}
			if (!targetUsers.length) return this.say("You must specify at least one user who is not already in the game.");

			for (const targetUser of targetUsers) {
				if (room.userHostedGame.players[targetUser.id]) {
					room.userHostedGame.players[targetUser.id].eliminated = false;
				} else {
					room.userHostedGame.createPlayer(targetUser);
				}

				room.userHostedGame.changePlayerTeam(room.userHostedGame.players[targetUser.id], team);
			}

			this.say("Added " + Tools.joinList(targetUsers.map(x => x.name)) + " to Team " + team.name + ".");
		},
		aliases: ['atpl', 'addteamplayers'],
	},
	shuffleplayers: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (room.userHostedGame.teams) {
				for (const i in room.userHostedGame.teams) {
					const team = room.userHostedGame.teams[i];
					team.players = room.userHostedGame.shuffle(team.players);
				}
			} else {
				const temp: Dict<Player> = {};
				const players = room.userHostedGame.shufflePlayers();
				if (!players.length) return this.say("The player list is empty.");
				for (const player of players) {
					temp[player.id] = player;
				}
				room.userHostedGame.players = temp;
			}
			await this.run('playerlist');
		},
		aliases: ['shufflepl'],
	},
	splitplayers: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (room.userHostedGame.teams) {
				return this.say("Teams have already been formed. To create new teams, first use ``" + Config.commandCharacter +
					"unsplitpl``.");
			}

			const targets = target.split(',');
			let teams = 2;
			if (targets[0]) {
				teams = parseInt(targets[0].trim());
				if (isNaN(teams) || teams < 2 || teams > 4) return this.say("You must specify a number of teams between 2 and 4.");
			}

			if (room.userHostedGame.getRemainingPlayerCount() < (teams * 2)) {
				return this.say("There are not enough players to form" + (teams > 2 ? " " + teams : "") + " teams.");
			}

			let teamNames: string[] | undefined;
			if (targets.length > 1) {
				teamNames = [];
				for (let i = 1; i < targets.length; i++) {
					if (Tools.toId(targets[i])) teamNames.push(targets[i].trim());
				}
			}

			if (teamNames && teamNames.length !== teams) return this.say("You must specify all " + teams + " team names or none.");

			room.userHostedGame.splitPlayers(teams, teamNames);
			await this.run('playerlist');
		},
		aliases: ['splitpl'],
	},
	unsplitplayers: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.teams) return this.say("Teams have not yet been formed.");

			room.userHostedGame.unSplitPlayers();
			await this.run('playerlist');
		},
		aliases: ['unsplitpl'],
	},
	playerlist: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
				gameRoom = room;
			}

			const game = gameRoom.game || gameRoom.userHostedGame;
			if (!game) return;
			this.say(game.getPlayersDisplay());
		},
		aliases: ['players', 'pl'],
	},
	clearplayerlist: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const users: string[] = [];
			for (const i in room.userHostedGame.players) {
				if (!room.userHostedGame.players[i].eliminated) users.push(room.userHostedGame.players[i].name);
			}
			if (!users.length) return this.say("The player list is empty.");
			await this.run('removeplayer', users.join(", "));
		},
		aliases: ['clearplayers', 'clearpl'],
	},
	addpoints: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.started) {
				return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			}
			if (target.includes("|")) {
				await this.runMultipleTargets("|");
				return;
			}

			const users: User[] = [];
			const usersNotOnTeams: string[] = [];
			const usersNotInRoom: string[] = [];
			const savedWinners: string[] = [];
			const teamNames: string[] = [];

			let points = 1;
			const targets = target.split(",");
			for (const target of targets) {
				const id = Tools.toId(target);
				if (!id) continue;

				if (Tools.isInteger(id)) {
					points = Math.round(parseInt(id));
					if (points < 1) points = 1;
				} else {
					if (id in room.userHostedGame.players && room.userHostedGame.savedWinners.includes(room.userHostedGame.players[id])) {
						savedWinners.push(room.userHostedGame.players[id].name);
						continue;
					}

					const targetUser = Users.get(target);
					if (!targetUser || !targetUser.rooms.has(room)) {
						if (!targetUser && room.userHostedGame.teams && id in room.userHostedGame.teams) {
							teamNames.push(id);
						} else {
							usersNotInRoom.push(targetUser ? targetUser.name : target.trim());
						}
						continue;
					}
					if (room.userHostedGame.teams && !(targetUser.id in room.userHostedGame.players)) {
						usersNotOnTeams.push(targetUser.name);
						continue;
					}

					users.push(targetUser);
				}
			}

			if (usersNotInRoom.length) {
				return this.say(Tools.joinList(usersNotInRoom) + " " + (usersNotInRoom.length > 1 ? "are" : "is") + " not in the room.");
			}
			if (usersNotOnTeams.length) {
				return this.say(Tools.joinList(usersNotOnTeams) + " " + (usersNotOnTeams.length > 1 ? "are" : "is") + " not on a team. " +
					"You must use ``" + Config.commandCharacter + "addteamplayer [team], [player]`` first.");
			}
			if (savedWinners.length) {
				return this.say(Tools.joinList(savedWinners) + " " + (usersNotInRoom.length > 1 ? "are" : "is") + " already on the " +
					"saved winners list.");
			}

			if (teamNames.length) {
				await this.run('addteampoint', target);
				return;
			}

			if (!users.length) return this.say("Please specify at least one user.");

			if (cmd.startsWith('r')) points *= -1;
			let reachedCap = 0;
			for (const user of users) {
				const player = room.userHostedGame.players[user.id] || room.userHostedGame.createPlayer(user);
				if (player.eliminated) player.eliminated = false;
				const total = room.userHostedGame.addPoints(player, points);
				if (room.userHostedGame.scoreCap) {
					if (room.userHostedGame.teams) {
						if (player.team!.points >= room.userHostedGame.scoreCap) reachedCap++;
					} else {
						if (total >= room.userHostedGame.scoreCap) reachedCap++;
					}
				}
			}

			// @ts-expect-error
			room.userHostedGame.round++;
			if (!this.runningMultipleTargets) await this.run('playerlist');
			if (reachedCap) {
				const reached = room.userHostedGame.teams ? "team" : "user";
				user.say((reachedCap === 1 ? "A " + reached + " has" : reachedCap + " " + reached + "s have") + " reached the score " +
					"cap in your game.");
			}
		},
		aliases: ['addpoint', 'removepoint', 'removepoints', 'apoint', 'apoints', 'rpoint', 'rpoints', 'apt', 'rpt'],
	},
	addpointall: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.started) {
				return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			}
			if (target && !Tools.isInteger(target)) return this.say("You must specify a valid number of points.");
			this.runningMultipleTargets = true;
			const newCmd = cmd === 'aptall' || cmd === 'addpointall' ? 'addpoint' : 'removepoint';
			const pointsString = target ? ", " + target : "";
			for (const i in room.userHostedGame.players) {
				if (room.userHostedGame.players[i].eliminated) continue;
				const player = room.userHostedGame.players[i];
				let expiredUser = false;
				let user = Users.get(player.name);
				if (!user) {
					user = Users.add(player.name, player.id);
					expiredUser = true;
				}
				await this.run(newCmd, player.name + pointsString);
				if (expiredUser) Users.remove(user);
			}
			this.runningMultipleTargets = false;
			await this.run('playerlist');
		},
		aliases: ['aptall', 'rptall', 'removepointall'],
	},
	addteampoints: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.teams) return this.say("You must first forme teams with ``" + Config.commandCharacter + "splitpl``.");

			const targets = target.split(',');
			const teamId = Tools.toId(targets[0]);
			if (!(teamId in room.userHostedGame.teams)) {
				return this.say("'" + targets[0].trim() + "' is not one of the teams in the game.");
			}

			let points = 1;
			if (targets.length > 1) {
				points = parseInt(targets[1].trim());
				if (isNaN(points)) return this.say("You must specify a valid number of points.");
			}

			const remainingPlayers = room.userHostedGame.teams[teamId].players.filter(x => !x.eliminated);
			if (!remainingPlayers.length) {
				return this.say("Team " + room.userHostedGame.teams[teamId].name + " does not have any players remaining.");
			}
			const player = room.userHostedGame.sampleOne(remainingPlayers);
			await this.run((cmd.startsWith('r') ? 'removepoint' : 'addpoint'), player.name + ',' + points);
		},
		aliases: ['addteampoint', 'removeteampoint', 'removeteampoints', 'atpt', 'rtpt'],
	},
	movepoint: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const targets = target.split(",");
			const fromUser = Users.get(targets[0]);
			const toUser = Users.get(targets[1]);
			if (!fromUser || !toUser || fromUser === toUser) return this.say("You must specify 2 users.");
			if (!(fromUser.id in room.userHostedGame.players)) return this.say(fromUser.name + " is not in the game.");
			const from = room.userHostedGame.players[fromUser.id];
			const fromPoints = room.userHostedGame.points.get(room.userHostedGame.players[from.id]);
			if (!fromPoints) return this.say(from.name + " does not have any points.");
			let amount: number;
			if (targets.length === 3) {
				amount = parseInt(targets[2]);
				if (isNaN(amount)) return this.say("Please specify a valid amount of points.");
				if (amount > fromPoints) amount = fromPoints;
			} else {
				amount = fromPoints;
			}

			room.userHostedGame.addPoints(from, amount * -1);

			const to = room.userHostedGame.players[toUser.id] || room.userHostedGame.createPlayer(toUser);
			const toPoints = room.userHostedGame.addPoints(to, amount);
			this.say((amount === fromPoints ? "" : amount + " of ") + from.name + "'s points have been moved to " + to.name + ". Their " +
				"total is now " + toPoints + ".");
		},
		aliases: ['mpt'],
	},
	scorecap: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const id = Tools.toId(target);
			if (!id) {
				if (room.userHostedGame.scoreCap) return this.say("The score cap is set to " + room.userHostedGame.scoreCap + ".");
				return this.say("There is no score cap set.");
			}
			const cap = parseInt(id);
			if (isNaN(cap)) return this.say("Please specify a valid number.");
			room.userHostedGame.scoreCap = cap;
			this.say("The score cap has been set to " + cap + ".");
		},
	},
	store: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (cmd === 'stored' || !target) {
				if (!room.userHostedGame.storedMessage) {
					return this.say("You must store a message first with ``" + Config.commandCharacter + "store``.");
				}
				if (CommandParser.isCommandMessage(room.userHostedGame.storedMessage)) {
					const parts = room.userHostedGame.storedMessage.split(" ");
					await this.run(parts[0].substr(1), parts.slice(1).join(" "));
					return;
				}
				this.say(room.userHostedGame.storedMessage);
				return;
			}

			target = target.trim();
			const possibleCommand = target.trim().split(" ")[0];

			if (target.startsWith('/') || (target.startsWith('!') && possibleCommand !== '!pick')) {
				return this.say("You cannot store a server command.");
			}

			if (CommandParser.isCommandMessage(target) && !(Tools.toId(possibleCommand) in BaseCommands)) {
				return this.say("'" + possibleCommand + "' is not a valid command for " + Config.commandCharacter + "store.");
			}

			room.userHostedGame.storedMessage = target;
			this.say("Your message has been stored! You can now repeat it with ``" + Config.commandCharacter + "stored``.");
		},
		aliases: ['stored'],
	},
	twist: {
		command(target, room, user) {
			let gameRoom: Room;
			let isPm = false;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				gameRoom = targetRoom;
				isPm = true;
			} else {
				gameRoom = room;
			}
			if (!gameRoom.userHostedGame || (!isPm && !gameRoom.userHostedGame.isHost(user))) return;
			if (!target) {
				if (!gameRoom.userHostedGame.twist) return this.say("There is no twist set for the current game.");
				this.say(gameRoom.userHostedGame.name + " twist: " + gameRoom.userHostedGame.twist);
				return;
			}
			if (isPm) return;
			gameRoom.userHostedGame.twist = target.trim();
			this.say("Your twist has been stored. You can repeat it with ``" + Config.commandCharacter + "twist``.");
		},
	},
	savewinner: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (room.userHostedGame.teams) return this.say("You cannot store winners once teams have been formed.");

			const targets = target.split(",");
			if (Config.maxUserHostedGameWinners && room.id in Config.maxUserHostedGameWinners) {
				const totalStored = room.userHostedGame.savedWinners.length + targets.length;
				if (totalStored > Config.maxUserHostedGameWinners[room.id]) {
					return this.say("You cannot store more than " + Config.maxUserHostedGameWinners[room.id] + " winners.");
				}
				if (totalStored === Config.maxUserHostedGameWinners[room.id]) {
					return this.say("You will reach the maximum amount of winners. Please use ``" + Config.commandCharacter + "win``.");
				}
			}

			const stored: string[] = [];
			for (const target of targets) {
				const id = Tools.toId(target);
				if (!(id in room.userHostedGame.players)) return this.say(this.sanitizeResponse(target.trim() + " is not in the game."));
				if (room.userHostedGame.savedWinners.includes(room.userHostedGame.players[id])) {
					return this.say(room.userHostedGame.players[id].name + " has already been saved as a winner.");
				}
				stored.push(id);
			}

			for (const id of stored) {
				room.userHostedGame.savedWinners.push(room.userHostedGame.players[id]);
				room.userHostedGame.points.delete(room.userHostedGame.players[id]);
				room.userHostedGame.players[id].eliminated = true;
			}

			await this.run('playerlist');
		},
		aliases: ['savewinners', 'storewinner', 'storewinners'],
	},
	removewinner: {
		async asyncCommand(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const id = Tools.toId(target);
			if (!(id in room.userHostedGame.players)) return this.say(this.sanitizeResponse(target.trim() + " is not in the game."));
			const index = room.userHostedGame.savedWinners.indexOf(room.userHostedGame.players[id]);
			if (index === -1) return this.say(this.sanitizeResponse(target.trim() + " has not been saved as a winner."));
			room.userHostedGame.savedWinners.splice(index, 1);
			room.userHostedGame.players[id].eliminated = false;
			await this.run('playerlist');
		},
		aliases: ['removestoredwinner'],
	},
	winner: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const targets = target.split(",");
			const savedWinners: Player[] | null = room.userHostedGame.savedWinners || null;
			let players: Player[] = [];
			const autoWin = cmd === 'autowin';
			if (autoWin) {
				let placesToWin = 1;
				const possiblePlaces = parseInt(target);
				if (!isNaN(possiblePlaces)) {
					if (possiblePlaces < 1 || possiblePlaces > 3) return this.say("You can only auto-win the top 1-3 places.");
					placesToWin = possiblePlaces;
				}

				const usersByPoints: Dict<Player[]> = {};
				if (room.userHostedGame.teams) {
					for (const i in room.userHostedGame.teams) {
						const team = room.userHostedGame.teams[i];
						if (!team.points) continue;
						if (!(team.points in usersByPoints)) usersByPoints[team.points] = [];
						usersByPoints[team.points] = usersByPoints[team.points].concat(team.players.filter(x => !x.eliminated));
					}
				} else {
					for (const i in room.userHostedGame.players) {
						const player = room.userHostedGame.players[i];
						if (player.eliminated || !room.userHostedGame.points.has(player)) continue;
						const points = '' + room.userHostedGame.points.get(player);
						if (!(points in usersByPoints)) usersByPoints[points] = [];
						usersByPoints[points].push(player);
					}
				}

				const sortedPoints = Object.keys(usersByPoints).sort((a, b) => parseInt(b) - parseInt(a));
				for (let i = 0; i < placesToWin; i++) {
					if (!sortedPoints[i]) break;
					players = players.concat(usersByPoints[sortedPoints[i]]);
				}
			} else {
				for (const target of targets) {
					const id = Tools.toId(target);
					if (!id) continue;
					if (room.userHostedGame.teams) {
						if (!(id in room.userHostedGame.teams)) continue;
						for (const player of room.userHostedGame.teams[id].players) {
							if (!player.eliminated && !players.includes(player)) players.push(player);
						}
					} else {
						if (id in room.userHostedGame.players) {
							const player = room.userHostedGame.players[id];
							if (!players.includes(player) && !(savedWinners && savedWinners.includes(player))) players.push(player);
						}
					}
				}
			}

			if (savedWinners) players = players.concat(savedWinners);
			if (!players.length) {
				return this.say(autoWin ? "No one has any points in this game." : "Please specify at least 1 " +
					(room.userHostedGame.teams ? "team": "player") + ".");
			}

			let playerDifficulty: GameDifficulty;
			if (Config.userHostedGamePlayerDifficulties && room.userHostedGame.format.id in Config.userHostedGamePlayerDifficulties) {
				playerDifficulty = Config.userHostedGamePlayerDifficulties[room.userHostedGame.format.id];
			} else if (Config.scriptedGameDifficulties && room.userHostedGame.format.id in Config.scriptedGameDifficulties) {
				playerDifficulty = Config.scriptedGameDifficulties[room.userHostedGame.format.id];
			} else {
				playerDifficulty = 'medium';
			}

			let playerBits = 300;
			if (playerDifficulty === 'medium') {
				playerBits = 400;
			} else if (playerDifficulty === 'hard') {
				playerBits = 500;
			}

			for (const player of players) {
				Storage.addPoints(room, player.name, playerBits, 'userhosted');
				player.say("You were awarded " + playerBits + " bits! To see your total amount, use this command: ``" +
					Config.commandCharacter + "bits " + room.title + "``");
			}
			this.say("The winner" + (players.length === 1 ? " is" : "s are") + " " + Tools.joinList(players.map(x => x.name)) + "!");
			room.userHostedGame.end();
		},
		aliases: ['autowin', 'win'],
	},
	starthangman: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!gameRoom.userHostedGame || !gameRoom.userHostedGame.isHost(user)) return;
			if (gameRoom.serverHangman) {
				this.say("There is already a hangman game running in " + gameRoom.title + ".");
				return;
			}

			const answer = targets[1].trim();
			const hint = targets.slice(2).join(',').trim();
			if (!Tools.toId(answer) || !Tools.toId(hint)) {
				this.say("Please specify an answer and a hint for the hangman.");
				return;
			}

			if (Client.willBeFiltered(answer, gameRoom)) {
				this.say("Your answer contains a word banned in " + gameRoom.title + ".");
				return;
			}

			if (Client.willBeFiltered(hint, gameRoom)) {
				this.say("Your hint contains a word banned in " + gameRoom.title + ".");
				return;
			}

			gameRoom.userHostedGame.sayCommand("/hangman create " + answer + ", " + hint + " [" + user.name + "]");
		},
	},
	endhangman: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!gameRoom.userHostedGame || !gameRoom.userHostedGame.isHost(user)) return;
			if (!gameRoom.serverHangman) {
				this.say("There is no hangman game running in " + gameRoom.title + ".");
				return;
			}

			gameRoom.userHostedGame.sayCommand("/hangman end");
		},
	},
	showgifs: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}
			targets.shift();

			const showIcon = cmd.startsWith('showicon');
			const isBW = cmd.startsWith('showbw');
			const generation = isBW ? "bw" : "xy";
			const gifsOrIcons: string[] = [];
			const pokemonList: IPokemon[] = [];

			for (const target of targets) {
				const pokemon = Dex.getPokemon(target);
				if (!pokemon) return this.sayError(['invalidPokemon', target]);
				if (!showIcon && !Dex.hasGifData(pokemon, generation)) {
					return this.say(pokemon.name + " does not have a" + (isBW ? " BW" :"") + " gif.");
				}
				pokemonList.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonGif(pokemon, generation));
			}

			if (!gifsOrIcons.length) return this.say("You must specify at least 1 Pokemon.");

			const max = showIcon ? 30 : 5;
			if (gifsOrIcons.length > max) return this.say("Please specify between 1 and " + max + " Pokemon.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(pokemonList, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showgif', 'showbwgifs', 'showbwgif', 'showicons', 'showicon'],
	},
	showrandomgifs: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}

			targets.shift();

			const showIcon = cmd.endsWith('icon') || cmd.endsWith('icons');
			const isBW = cmd.startsWith('showrandombw') || cmd.startsWith('showrandbw');
			const generation = isBW ? "bw" : "xy";
			const gifsOrIcons: string[] = [];

			let typing = '';
			let dualType = false;
			let amount: number;
			if (targets.length && !Tools.isInteger(targets[0].trim())) {
				const types = targets[0].split("/").map(x => x.trim());
				for (let i = 0; i < types.length; i++) {
					const type = Dex.getType(types[i]);
					if (!type) return this.say("'" + types[i] + "' is not a valid type.");
					types[i] = type.name;
				}
				typing = types.sort().join("/");
				dualType = types.length > 1;
				targets.shift();
			}

			if (targets.length) {
				const max = showIcon ? 30 : 5;
				amount = parseInt(targets[0]);
				if (isNaN(amount) || amount < 1 || amount > max) return this.say("Please specify a number of Pokemon between 1 and " +
					max + ".");
			} else {
				amount = 1;
			}

			let pokemonList = Games.getPokemonList();
			if (gameRoom.userHostedGame) {
				pokemonList = gameRoom.userHostedGame.shuffle(pokemonList);
			} else {
				pokemonList = Tools.shuffle(pokemonList);
			}
			const usedPokemon: IPokemon[] = [];
			for (const pokemon of pokemonList) {
				if (isBW && pokemon.gen > 5) continue;
				if (!showIcon && !Dex.hasGifData(pokemon, generation)) continue;
				if (typing) {
					if (dualType) {
						if (pokemon.types.slice().sort().join("/") !== typing) continue;
					} else {
						if (!pokemon.types.includes(typing)) continue;
					}
				}

				usedPokemon.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonGif(pokemon, generation));
				if (gifsOrIcons.length === amount) break;
			}

			if (gifsOrIcons.length < amount) return this.say("Not enough Pokemon match the specified options.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(usedPokemon, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showrandomgif', 'showrandombwgifs', 'showrandombwgif', 'showrandgifs', 'showrandgif', 'showrandbwgifs', 'showrandbwgif',
			'showrandomicons', 'showrandomicon', 'showrandicons', 'showrandicon'],
	},
	showtrainersprites: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}
			targets.shift();

			const trainerList: string[] = [];

			for (const target of targets) {
				const id = Dex.getTrainerSpriteId(target);
				if (!id) return this.say("There is no trainer sprite for '" + target.trim() + "'.");
				trainerList.push(id);
			}

			if (!trainerList.length) return this.say("You must specify at least 1 Pokemon.");

			const max = 5;
			if (trainerList.length > max) return this.say("Please specify between 1 and " + max + " trainers.");

			let html = "<center>" + trainerList.map(x => Dex.getTrainerSprite(x)).join("") + "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-trainer";
				gameRoom.userHostedGame.sayTrainerUhtml(trainerList, uhtmlName, "<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showtrainersprite', 'showtrainers', 'showtrainer'],
	},
	roll: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('!roll ' + (target || "2"));
		},
	},
	dt: {
		command(target, room, user) {
			if (!target || (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user)))))) return;
			this.say('!dt ' + target);
		},
	},
	randomanswer: {
		async asyncCommand(target, room, user, cmd) {
			let pmRoom: Room | undefined;
			if (!this.isPm(room) || room.game) return;
			if (!target) return this.say("You must specify a game.");

			user.rooms.forEach((rank, room) => {
				if (!pmRoom && Config.allowScriptedGames && Config.allowScriptedGames.includes(room.id) &&
					Users.self.hasRank(room, 'bot')) {
					pmRoom = room;
				}
			});

			if (!pmRoom) return this.say(CommandParser.getErrorText(['noPmGameRoom']));

			const format = global.Games.getFormat(target, true);
			if (Array.isArray(format)) return this.sayError(format);
			if (global.Games.reloadInProgress) return this.sayError(['reloadInProgress']);
			if (!format.canGetRandomAnswer) return this.say("This command cannot be used with " + format.name + ".");
			delete format.inputOptions.points;
			const game = global.Games.createGame(room, format, pmRoom);
			const randomAnswer = await game.getRandomAnswer!();
			this.sayHtml(game.getMascotAndNameHtml(" - random") + "<br /><br />" + randomAnswer.hint + "<br /> " +
				"<b>Answer" + (randomAnswer.answers.length > 1 ? "s" : "") + "</b>: " + randomAnswer.answers.join(', '), pmRoom);
			game.deallocate(true);
		},
		aliases: ['randanswer', 'ranswer', 'randomhint', 'randhint', 'rhint'],
	},
	randompokemon: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			if (!target) {
				const species = Dex.getExistingPokemon(Tools.sampleOne(Dex.data.pokemonKeys)).name;
				if (this.pm) {
					this.say('Randomly generated Pokemon: **' + species + '**');
				} else {
					this.say('!dt ' + species);
				}
				return;
			}
			this.say("!randpoke " + target);
		},
		aliases: ['rpoke', 'rpokemon', 'randpoke'],
	},
	randommove: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of moves between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const movesList = Games.getMovesList().map(x => x.name);
			let moves: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				moves = room.userHostedGame.shuffle(movesList);
			} else {
				moves = Tools.shuffle(movesList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated move" + (multiple ? "s" : "") + ": **" + Tools.joinList(moves.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + moves[0]);
			}
		},
		aliases: ['rmove', 'randmove'],
	},
	randomitem: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of items between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const itemsList = Games.getItemsList().map(x => x.name);
			let items: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				items = room.userHostedGame.shuffle(itemsList);
			} else {
				items = Tools.shuffle(itemsList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated item" + (multiple ? "s" : "") + ": **" + Tools.joinList(items.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + items[0]);
			}
		},
		aliases: ['ritem', 'randitem'],
	},
	randomability: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of abilities between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const abilitiesList = Games.getAbilitiesList().map(x => x.name);
			let abilities: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				abilities = room.userHostedGame.shuffle(abilitiesList);
			} else {
				abilities = Tools.shuffle(abilitiesList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated " + (multiple ? "abilities" : "ability") + ": **" +
					Tools.joinList(abilities.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + abilities[0]);
			}
		},
		aliases: ['rability', 'randability'],
	},
	randomtype: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			const typeKeys = Dex.data.typeKeys.slice();
			const key = Tools.sampleOne(typeKeys);
			const types: string[] = [Dex.getExistingType(key).name];
			if (Tools.random(2)) {
				typeKeys.splice(typeKeys.indexOf(key), 1);
				types.push(Dex.getExistingType(Tools.sampleOne(typeKeys)).name);
			}
			this.say('Randomly generated type: **' + types.join("/") + '**');
		},
		aliases: ['rtype', 'randtype'],
	},
	randomexistingtype: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			let type = '';
			const pokedex = Tools.shuffle(Dex.getPokemonList());
			for (const pokemon of pokedex) {
				if (!pokemon.forme) {
					type = pokemon.types.join('/');
					break;
				}
			}
			this.say('Randomly generated existing type: **' + type + '**');
		},
		aliases: ['rextype', 'randextype', 'rexistingtype', 'randexistingtype'],
	},
	randomcharacter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated character: **' + Tools.sampleOne(Dex.data.characters).trim() + '**');
		},
		aliases: ['rchar', 'rcharacter', 'randchar', 'randcharacter'],
	},
	randomlocation: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated location: **' + Tools.sampleOne(Dex.data.locations).trim() + '**');
		},
		aliases: ['rlocation', 'rloc', 'randloc', 'randlocation'],
	},
	randomletter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated letter: **' + Tools.sampleOne(Tools.letters.toUpperCase().split("")) + '**');
		},
		aliases: ['rletter'],
	},
	randomcolor: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated color: **' + Dex.data.colors[Tools.sampleOne(Object.keys(Dex.data.colors))] + '**');
		},
		aliases: ['rcolor', 'randcolour', 'rcolour'],
	},
	randomegggroup: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated egg group: **' + Dex.data.eggGroups[Tools.sampleOne(Object.keys(Dex.data.eggGroups))] + '**');
		},
		aliases: ['regggroup', 'regg'],
	},
	randomnature: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated nature: **' + Dex.data.natures[Tools.sampleOne(Object.keys(Dex.data.natures))]!.name + '**');
		},
		aliases: ['rnature'],
	},
	randomcategory: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated category: **the ' + Dex.data.categories[Tools.sampleOne(Object.keys(Dex.data.categories))] +
				' Pokemon**');
		},
		aliases: ['rcategory', 'rcat'],
	},

	/**
	 * Tournament commands
	 */
	tournament: {
		command(target, room, user) {
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (target) return this.run('createtournament');
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}

			if (!tournamentRoom.tournament) return this.say("A tournament is not in progress in this room.");
			const tournament = tournamentRoom.tournament;
			let html = "<b>" + tournament.name + " " + (tournament.isRoundRobin ? "Round Robin " : "") + "tournament</b><br />";
			if (tournament.started) {
				if (tournament.startTime) {
					html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - tournament.startTime) + "<br />";
				}
				const remainingPlayers = tournament.getRemainingPlayerCount();
				if (remainingPlayers !== tournament.totalPlayers) {
					html += "<b>Remaining players</b>: " + remainingPlayers + "/" + tournament.totalPlayers;
				} else {
					html += "<b>Players</b>: " + remainingPlayers;
				}
			} else {
				html += "<b>Signups duration</b>: " + Tools.toDurationString(Date.now() - tournament.createTime) + "<br />";
				html += "<b>" + tournament.playerCount + "</b> player" + (tournament.playerCount === 1 ? " has" : "s have") + " joined";
			}
			this.sayHtml(html, tournamentRoom);
		},
		aliases: ['tour'],
	},
	createtournament: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
				return this.sayError(['disabledTournamentFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);
			if (room.tournament) return this.say("There is already a tournament in progress in this room.");
			const format = Dex.getFormat(target);
			if (!format || !format.tournamentPlayable) return this.sayError(['invalidTournamentFormat', format ? format.name : target]);
			let playerCap: number = 0;
			if (Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
				playerCap = Config.defaultTournamentPlayerCaps[room.id];
			}
			this.sayCommand("/tour new " + format.name + ", elimination" + (playerCap ? ", " + playerCap : ""));
		},
		aliases: ['createtour', 'ct'],
	},
	tournamentcap: {
		command(target, room, user) {
			if (this.isPm(room) || !room.tournament || room.tournament.started || !user.hasRank(room, 'driver')) return;
			const cap = parseInt(target);
			if (isNaN(cap)) return this.say("You must specify a valid player cap.");
			if (cap < Tournaments.minPlayerCap || cap > Tournaments.maxPlayerCap) {
				return this.say("The tournament's player cap must be between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + ".");
			}
			room.tournament.adjustCap(cap);
		},
		aliases: ['tcap'],
	},
	tournamentenablepoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.tournament || !user.hasRank(room, 'driver')) return;
			if (!(Config.rankedTournaments && Config.rankedTournaments.includes(room.id) && !(Config.rankedCustomTournaments &&
				Config.rankedCustomTournaments.includes(room.id)))) {
				return this.say("A tournament leaderboard is not enabled for this room.");
			}

			if (!room.tournament.isSingleElimination) return this.say("Only single elimination tournaments award points.");

			if (cmd === 'tournamentenablepoints' || cmd === 'tourenablepoints') {
				if ((room.tournament.canAwardPoints() && room.tournament.manuallyEnabledPoints === undefined) ||
					room.tournament.manuallyEnabledPoints) {
					return this.say("The " + room.tournament.name + " tournament will already award leaderboard points.");
				}
				room.tournament.manuallyEnabledPoints = true;
				this.say("The " + room.tournament.name + " tournament will now award leaderboard points.");
			} else {
				if ((!room.tournament.canAwardPoints() && room.tournament.manuallyEnabledPoints === undefined) ||
					room.tournament.manuallyEnabledPoints === false) {
					return this.say("The " + room.tournament.name + " tournament will already not award leaderboard points.");
				}
				room.tournament.manuallyEnabledPoints = false;
				this.say("The " + room.tournament.name + " tournament will no longer award leaderboard points.");
			}
		},
		aliases: ['tourenablepoints', 'tournamentdisablepoints', 'tourdisablepoints'],
	},
	tournamentbattlescore: {
		command(target, room, user) {
			const targets = target.split(",");
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				tournamentRoom = room;
			}

			if (!tournamentRoom.tournament) return this.say("A tournament is not in progress in this room.");
			if (tournamentRoom.tournament.generator !== 1) {
				return this.say("This command is currently only usable in Single Elimination tournaments.");
			}
			const id = Tools.toId(targets[0]);
			if (!(id in tournamentRoom.tournament.players)) {
				return this.say("'" + targets[0] + "' is not a player in the " + tournamentRoom.title + " tournament.");
			}
			const targetPlayer = tournamentRoom.tournament.players[id];
			if (targetPlayer.eliminated) {
				return this.say(targetPlayer.name + " has already been eliminated from the " + tournamentRoom.title + " tournament.");
			}

			let currentBattle: IBattleData | undefined;
			for (const battle of tournamentRoom.tournament.currentBattles) {
				if (battle.playerA === targetPlayer || battle.playerB === targetPlayer) {
					currentBattle = tournamentRoom.tournament.battleData[battle.roomid];
					break;
				}
			}

			if (!currentBattle) return this.say(targetPlayer.name + " is not currently in a tournament battle.");
			const slots = Tools.shuffle(Object.keys(currentBattle.remainingPokemon));
			this.say("The score of " + targetPlayer.name + "'s current battle is " + (slots.length < 2 ? "not yet available" :
				currentBattle.remainingPokemon[slots[0]] + " - " + currentBattle.remainingPokemon[slots[1]]) + ".");
		},
		aliases: ['tbscore', 'tbattlescore'],
	},
	scheduledtournament: {
		command(target, room, user) {
			const targets = target.split(',');
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				if (!(targetRoom.id in Tournaments.nextScheduledTournaments)) {
					return this.say("There is no tournament scheduled for " + targetRoom.title + ".");
				}
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				if (!(room.id in Tournaments.nextScheduledTournaments)) return this.say("There is no tournament scheduled for this room.");
				tournamentRoom = room;
			}

			const scheduledTournament = Tournaments.nextScheduledTournaments[tournamentRoom.id];
			const format = Dex.getExistingFormat(scheduledTournament.format, true);
			const now = Date.now();
			let html = "<b>Next" + (this.pm ? " " + tournamentRoom.title : "") + " scheduled tournament</b>: " + format.name + "<br />";
			if (now > scheduledTournament.time) {
				html += "<b>Delayed</b><br />";
			} else {
				html += "<b>Starting in</b>: " + Tools.toDurationString(scheduledTournament.time - now) + "<br />";
			}

			if (format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(format);
			this.sayHtml(html, tournamentRoom);
		},
		aliases: ['scheduledtour', 'officialtournament', 'officialtour', 'official'],
	},
	gettournamentschedule: {
		command(target, room, user) {
			const targets = target.split(',');
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!user.hasRank(targetRoom, 'moderator') && !user.isDeveloper()) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'moderator')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}
			const month = parseInt(targets[0]);
			if (isNaN(month)) return this.say("You must specify the month (1-12).");
			const schedule = Tournaments.getTournamentScheduleHtml(tournamentRoom, month);
			if (!schedule) return this.say("No tournament schedule found for " + tournamentRoom.title + ".");
			this.sayCommand("!code " + schedule);
		},
		aliases: ['gettourschedule'],
	},
	queuetournament: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
				return this.sayError(['disabledTournamentFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);

			const database = Storage.getDatabase(room);
			if (database.queuedTournament && !cmd.startsWith('force')) {
				const format = Dex.getFormat(database.queuedTournament.formatid, true);
				if (format) {
					return this.say(format.name + " is already queued for " + room.title + ".");
				} else {
					delete database.queuedTournament;
				}
			}

			if (target.includes('@@@')) {
				return this.say("You must specify custom rules separately (``" + Config.commandCharacter + cmd + " format, cap, custom " +
					"rules``).");
			}

			const targets = target.split(',');
			const formatName = targets[0];
			const id = Tools.toId(formatName);
			targets.shift();

			const samePokemon: string[] = [];
			let scheduled = false;
			let format: IFormat | undefined;
			if (id === 'scheduled' || id === 'official') {
				if (!(room.id in Tournaments.schedules)) return this.say("There is no tournament schedule for this room.");
				scheduled = true;
				format = Dex.getExistingFormat(Tournaments.nextScheduledTournaments[room.id].format, true);
			} else {
				if (room.id in Tournaments.nextScheduledTournaments && Date.now() > Tournaments.nextScheduledTournaments[room.id].time) {
					return this.say("The scheduled tournament is delayed so you must wait until after it starts.");
				}

				if (id === 'samesolo') {
					format = Dex.getFormat('1v1');
					const pokemon = Dex.getPokemon(targets[0]);
					if (!pokemon) return this.sayError(['invalidPokemon', targets[0]]);
					if (pokemon.battleOnly) return this.say("You cannot specify battle-only formes.");
					samePokemon.push(pokemon.name);
					targets.shift();
				} else if (id === 'sameduo') {
					if (targets.length < 2) return this.say("You must specify the 2 Pokemon of the duo.");
					format = Dex.getFormat('2v2 Doubles');
					for (let i = 0; i < 2; i++) {
						const pokemon = Dex.getPokemon(targets[0]);
						if (!pokemon) return this.sayError(['invalidPokemon', targets[0]]);
						if (pokemon.battleOnly) return this.say("You cannot specify battle-only formes.");
						if (samePokemon.includes(pokemon.name) || (pokemon.forme && samePokemon.includes(pokemon.baseSpecies))) {
							return this.say("The duo already includes " + pokemon.name + "!");
						}
						samePokemon.push(pokemon.name);
						targets.shift();
					}
				} else if (id === 'samesix') {
					format = Dex.getFormat(targets[0]);
					if (!format || !format.tournamentPlayable) {
						return this.say("You must specify a valid format for the Same Six tournament.");
					}
					targets.shift();

					if (targets.length < 6) return this.say("You must specify the 6 Pokemon of the team.");

					for (let i = 0; i < 6; i++) {
						const pokemon = Dex.getPokemon(targets[0]);
						if (!pokemon) return this.sayError(['invalidPokemon', targets[0]]);
						if (pokemon.battleOnly) return this.say("You cannot specify battle-only formes.");
						if (samePokemon.includes(pokemon.name) || (pokemon.forme && samePokemon.includes(pokemon.baseSpecies))) {
							return this.say("The team already includes " + pokemon.name + "!");
						}
						samePokemon.push(pokemon.name);
						targets.shift();
					}
				} else {
					format = Dex.getFormat(formatName);
				}

				if (!format || !format.tournamentPlayable) {
					return this.sayError(['invalidTournamentFormat', format ? format.name : formatName]);
				}
				if (Tournaments.isInPastTournaments(room, format.inputTarget)) {
					return this.say(format.name + " is on the past tournaments list and cannot be queued.");
				}
			}

			let playerCap: number = 0;
			if (scheduled) {
				if (Config.scheduledTournamentsMaxPlayerCap && Config.scheduledTournamentsMaxPlayerCap.includes(room.id)) {
					playerCap = Tournaments.maxPlayerCap;
				}
			}

			if (targets.length || samePokemon.length) {
				if (scheduled) {
					return this.say("You cannot alter the player cap or custom rules of scheduled tournaments.");
				}

				const customRules = format.customRules ? format.customRules.slice() : [];
				const existingCustomRules = customRules.length;
				if (samePokemon.length) {
					const customRulesForPokemonList = Dex.getCustomRulesForPokemonList(samePokemon);
					for (const rule of customRulesForPokemonList) {
						if (!customRules.includes(rule)) customRules.push(rule);
					}
				}

				for (const target of targets) {
					const trimmed = target.trim();
					if (Tools.isInteger(trimmed)) {
						playerCap = parseInt(trimmed);
						if (playerCap < Tournaments.minPlayerCap || playerCap > Tournaments.maxPlayerCap) {
							return this.say("You must specify a player cap between " + Tournaments.minPlayerCap + " and " +
								Tournaments.maxPlayerCap + ".");
						}
					} else {
						if (!customRules.includes(trimmed)) customRules.push(trimmed);
					}
				}

				if (customRules.length > existingCustomRules) {
					let formatid = format.name + '@@@' + customRules.join(',');
					try {
						formatid = Dex.validateFormat(formatid);
					} catch (e) {
						return this.say((e as Error).message);
					}

					format = Dex.getExistingFormat(formatid, true);
				}
			}

			if (!playerCap && Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
				playerCap = Config.defaultTournamentPlayerCaps[room.id];
			}

			let time: number = 0;
			if (scheduled) {
				time = Tournaments.nextScheduledTournaments[room.id].time;
			} else if (!room.tournament) {
				const now = Date.now();
				if (database.lastTournamentTime) {
					if (database.lastTournamentTime + Tournaments.queuedTournamentTime < now) {
						time = now + Tournaments.delayedScheduledTournamentTime;
					} else {
						time = database.lastTournamentTime + Tournaments.queuedTournamentTime;
					}
				} else {
					database.lastTournamentTime = now;
					time = now + Tournaments.queuedTournamentTime;
				}
			}

			database.queuedTournament = {
				formatid: format.name + (format.customRules ? '@@@' + format.customRules.join(',') : ''),
				playerCap,
				scheduled,
				time,
			};

			if (scheduled) {
				Tournaments.setScheduledTournamentTimer(room);
			} else if (time) {
				Tournaments.setTournamentTimer(room, time, format, playerCap);
			}
			await this.run('queuedtournament', '');

			Storage.exportDatabase(room.id);
		},
		aliases: ['forcequeuetournament', 'forcenexttournament', 'forcenexttour'],
	},
	queuedtournament: {
		command(target, room, user) {
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				if (target) return this.run('queuetournament');
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			const errorText = "There is no tournament queued for " + (this.pm ? tournamentRoom.title : "this room") + ".";
			if (!database.queuedTournament) return this.say(errorText);
			const format = Dex.getFormat(database.queuedTournament.formatid, true);
			if (!format) {
				delete database.queuedTournament;
				Storage.exportDatabase(tournamentRoom.id);
				return this.say(errorText);
			}

			let html = "<div class='infobox infobox-limited'><b>Queued" + (this.pm ? " " + tournamentRoom.title : "") + " " +
				"tournament</b>: " + Dex.getCustomFormatName(format) + (database.queuedTournament.scheduled ? " <i>(scheduled)</i>" : "") +
				"<br />";
			if (database.queuedTournament.time) {
				const now = Date.now();
				if (now > database.queuedTournament.time) {
					html += "<b>Delayed</b><br />";
				} else {
					html += "<b>Starting in</b>: " + Tools.toDurationString(database.queuedTournament.time - now) + "<br />";
				}
			} else if (tournamentRoom.tournament) {
				html += "<b>Starting in</b>: " + Tools.toDurationString(Tournaments.queuedTournamentTime) + " after the " +
					tournamentRoom.tournament.name + " tournament ends<br />";
			}

			if (format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(format);
			html += "</div>";
			this.sayUhtml(room.id + "-queued-tournament", html, tournamentRoom);
		},
		aliases: ['queuedtour', 'nexttournament', 'nexttour'],
	},
	pasttournaments: {
		command(target, room, user) {
			const targets = target.split(',');
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				tournamentRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			if (!database.pastTournaments) return this.say("The past tournament list is empty.");

			const names: string[] = [];
			const option = Tools.toId(targets[0]);
			const displayTimes = option === 'time' || option === 'times';
			const now = Date.now();
			for (const pastTournament of database.pastTournaments) {
				const format = Dex.getFormat(pastTournament.inputTarget);
				let tournament = format ? Dex.getCustomFormatName(format) : pastTournament.name;

				if (displayTimes) {
					let duration = now - pastTournament.time;
					if (duration < 1000) duration = 1000;
					tournament += " <i>(" + Tools.toDurationString(duration, {hhmmss: true}) + " ago)</i>";
				}

				names.push(tournament);
			}
			this.sayHtml("<b>Past tournaments</b>" + (displayTimes ? "" : " (most recent first)") + ": " + Tools.joinList(names) + ".",
				tournamentRoom);
		},
		aliases: ['pasttours', 'recenttournaments', 'recenttours'],
	},
	lasttournament: {
		command(target, room, user) {
			const targets = target.split(',');
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			if (!targets[0]) {
				if (!database.lastTournamentTime) return this.say("No tournaments have been played in " + tournamentRoom.title + ".");
				return this.say("The last tournament in " + tournamentRoom.title + " ended **" + Tools.toDurationString(Date.now() -
					database.lastTournamentTime) + "** ago.");
			}
			const format = Dex.getFormat(targets[0]);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!database.lastTournamentFormatTimes || !(format.id in database.lastTournamentFormatTimes)) {
				return this.say(format.name + " has not been played in " + tournamentRoom.title + ".");
			}
			this.say("The last " + format.name + " tournament in " + tournamentRoom.title + " ended **" +
				Tools.toDurationString(Date.now() - database.lastTournamentFormatTimes[format.id]) + "** ago.");
		},
		aliases: ['lasttour'],
	},
	usercreatedformats: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			this.say('Approved and user-created formats: http://pstournaments.weebly.com/formats.html');
		},
		aliases: ['userhostedformats', 'userformats'],
	},
	gettournamentapproval: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Config.allowUserHostedTournaments || !Config.allowUserHostedTournaments.includes(targetRoom.id)) {
				return this.sayError(['disabledUserHostedTournamentFeatures', targetRoom.title]);
			}
			const bracketLink = Tools.getChallongeUrl(targets[1]);
			const signupsLink = Tools.getChallongeUrl(targets[2]);
			if (!bracketLink || !signupsLink || (!bracketLink.includes('/signup/') && !signupsLink.includes('/signup/'))) {
				return this.say("You must specify the links to both your tournament's bracket page and its signup page. (e.g. ``" +
					Config.commandCharacter + cmd + " " + targets[0].trim() + ", challonge.com/abc, " +
					"challonge.com/tournaments/signup/123``)");
			}
			if (targetRoom.approvedUserHostedTournaments) {
				for (const i in targetRoom.approvedUserHostedTournaments) {
					if (targetRoom.approvedUserHostedTournaments[i].urls.includes(bracketLink) ||
						targetRoom.approvedUserHostedTournaments[i].urls.includes(signupsLink)) {
						if (user.id !== targetRoom.approvedUserHostedTournaments[i].hostId) {
							return this.say("The specified tournament has already been approved for " +
								targetRoom.approvedUserHostedTournaments[i].hostName + ".");
						}
						delete targetRoom.approvedUserHostedTournaments[i];
						break;
					}
				}
			}

			if (targetRoom.newUserHostedTournaments) {
				for (const i in targetRoom.newUserHostedTournaments) {
					if (user.id === targetRoom.newUserHostedTournaments[i].hostId) {
						return this.say("You are already on the waiting list for staff review.");
					}
				}
			}

			const database = Storage.getDatabase(targetRoom);
			let authOrTHC = '';
			if ((Config.userHostedTournamentRanks && targetRoom.id in Config.userHostedTournamentRanks &&
				user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) ||
				(database.thcWinners && user.id in database.thcWinners)) {
				authOrTHC = user.name;
			}

			if (!targetRoom.newUserHostedTournaments) targetRoom.newUserHostedTournaments = {};
			targetRoom.newUserHostedTournaments[bracketLink] = {
				hostName: user.name,
				hostId: user.id,
				startTime: Date.now(),
				approvalStatus: '',
				reviewer: '',
				urls: [bracketLink, signupsLink],
			};

			if (authOrTHC) {
				if (!targetRoom.approvedUserHostedTournaments) targetRoom.approvedUserHostedTournaments = {};
				targetRoom.approvedUserHostedTournaments[bracketLink] = targetRoom.newUserHostedTournaments[bracketLink];
				delete targetRoom.newUserHostedTournaments[bracketLink];

				targetRoom.approvedUserHostedTournaments[bracketLink].approvalStatus = 'approved';
				targetRoom.approvedUserHostedTournaments[bracketLink].reviewer = Tools.toId(authOrTHC);

				this.say("Roomauth and THC winners are free to advertise without using this command!");
			} else {
				Tournaments.showUserHostedTournamentApprovals(targetRoom);
				this.say("A staff member will review your tournament as soon as possible!");
			}
		},
		aliases: ['gettourapproval'],
	},
	reviewuserhostedtournament: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) ||
				!user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;
			const link = targets[1].trim();
			if (!targetRoom.newUserHostedTournaments || !(link in targetRoom.newUserHostedTournaments)) return;
			if (targetRoom.newUserHostedTournaments[link].reviewer) {
				let name = targetRoom.newUserHostedTournaments[link].reviewer;
				const reviewer = Users.get(name);
				if (reviewer) name = reviewer.name;
				return this.say(name + " is already reviewing " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament.");
			}
			targetRoom.newUserHostedTournaments[link].reviewer = user.id;
			targetRoom.newUserHostedTournaments[link].reviewTimer = setTimeout(() => {
				if (targetRoom.newUserHostedTournaments![link] && !targetRoom.newUserHostedTournaments![link].approvalStatus &&
					targetRoom.newUserHostedTournaments![link].reviewer === user.id) {
					targetRoom.newUserHostedTournaments![link].reviewer = '';
					Tournaments.showUserHostedTournamentApprovals(targetRoom);
				}
			}, 10 * 60 * 1000);
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
		aliases: ['reviewuserhostedtour'],
	},
	approveuserhostedtournament: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) ||
				!user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;

			const link = targets[1].trim();
			if (!targetRoom.newUserHostedTournaments || !(link in targetRoom.newUserHostedTournaments)) return;
			if (!targetRoom.newUserHostedTournaments[link].reviewer) {
				return this.say("You must first claim " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament by " +
					"clicking the ``Review`` button.");
			}
			if (targetRoom.newUserHostedTournaments[link].reviewer !== user.id) {
				let name = targetRoom.newUserHostedTournaments[link].reviewer;
				const reviewer = Users.get(name);
				if (reviewer) name = reviewer.name;
				return this.say(name + " is currently the reviewer of " + targetRoom.newUserHostedTournaments[link].hostName + "'s " +
					"tournament so they must approve or reject it.");
			}

			if (cmd === 'approveuserhostedtournament' || cmd === 'approveuserhostedtour') {
				targetRoom.newUserHostedTournaments[link].approvalStatus = "approved";
				if (targetRoom.newUserHostedTournaments[link].reviewTimer) {
					clearTimeout(targetRoom.newUserHostedTournaments[link].reviewTimer!);
				}
				if (!targetRoom.approvedUserHostedTournaments) targetRoom.approvedUserHostedTournaments = {};
				targetRoom.approvedUserHostedTournaments[link] = targetRoom.newUserHostedTournaments[link];
				delete targetRoom.newUserHostedTournaments[link];
				this.say("You have approved " + targetRoom.approvedUserHostedTournaments[link].hostName + "'s tournament.");
				const host = Users.get(targetRoom.approvedUserHostedTournaments[link].hostName);
				if (host) host.say(user.name + " has approved your tournament! You may now advertise in " + targetRoom.title + ".");
			} else {
				if (targetRoom.newUserHostedTournaments[link].approvalStatus === 'changes-requested') {
					return this.say("Changes have already been requested for " +
						targetRoom.newUserHostedTournaments[link].hostName + "'s tournament.");
				}
				targetRoom.newUserHostedTournaments[link].approvalStatus = 'changes-requested';
				this.say("You have rejected " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament. Be sure to PM them " +
					"the reason(s) so that they can make the necessary changes!");

				const host = Users.get(targetRoom.newUserHostedTournaments[link].hostName);
				if (host) {
					host.say(user.name + " has requested changes for your tournament. Please wait for them to PM you before advertising.");
				}
			}
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
		aliases: ['approveuserhostedtour', 'rejectuserhostedtournament', 'rejectuserhostedtour'],
	},
	removeuserhostedtournament: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) ||
				!user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;
			const link = targets[1].trim();
			if (!targetRoom.newUserHostedTournaments || !(link in targetRoom.newUserHostedTournaments)) return;
			if (user.id !== targetRoom.newUserHostedTournaments[link].reviewer) {
				let name = targetRoom.newUserHostedTournaments[link].reviewer;
				const reviewer = Users.get(name);
				if (reviewer) name = reviewer.name;
				return this.say(name + " is already reviewing " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament.");
			}
			this.say(targetRoom.newUserHostedTournaments[link].hostName + "'s tournament has been removed.");
			delete targetRoom.newUserHostedTournaments[link];
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
		aliases: ['removeuserhostedtour'],
	},
	viewuserhostedtournaments: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targetRoom = Rooms.search(target);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) ||
				!user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;

			const html = Tournaments.getUserHostedTournamentApprovalHtml(targetRoom);
			if (!html) return this.say("There are no user-hosted tournaments running in " + targetRoom.title + ".");
			this.sayUhtml('userhosted-tournament-approvals-' + targetRoom.id, html, targetRoom);
		},
		aliases: ['viewuserhostedtours'],
	},

	/**
	 * Storage commands
	 */
	offlinemessage: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Config.allowMail) return this.say("Offline messages are not enabled.");
			const targets = target.split(',');
			if (targets.length < 2) return this.say("You must specify a user and a message to send.");
			const targetUser = Users.get(targets[0]);
			if (targetUser && !targetUser.isIdleStatus()) return this.say("You can only send messages to offline users.");

			const recipient = targets[0].trim();
			const recipientId = Tools.toId(recipient);
			if (recipientId === 'constructor') return;
			if (!Tools.isUsernameLength(recipient)) return this.sayError(['invalidUsernameLength']);
			if (recipientId === user.id || recipientId.startsWith('guest')) {
				return this.say("You must specify a user other than yourself or a guest.");
			}
			const message = targets.slice(1).join(',').trim();
			if (!message.length) return this.say("You must specify a message to send.");

			const maxMessageLength = Storage.getMaxOfflineMessageLength(user);
			if (message.length > maxMessageLength) return this.say("Your message cannot exceed " + maxMessageLength + " characters.");
			if (!Storage.storeOfflineMessage(user.name, recipientId, message)) return this.say("Sorry, you have too many messages queued " +
				"for " + recipient + ".");
			this.say("Your message has been sent to " + recipient + ".");
		},
		aliases: ['mail', 'offlinepm'],
	},
	offlinemessages: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Storage.retrieveOfflineMessages(user, true)) return this.say("You do not have any offline messages stored.");
		},
		aliases: ['readofflinemessages', 'checkofflinemessages', 'readmail', 'checkmail'],
	},
	clearofflinemessages: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Storage.clearOfflineMessages(user)) return this.say("You do not have any offline messages stored.");
			this.say("Your offline messages were cleared.");
		},
		aliases: ['deleteofflinemessages', 'clearmail', 'deletemail'],
	},
	lastseen: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targetUser = Users.get(target);
			if (targetUser) return this.say(targetUser.name + " is currently online.");
			const id = Tools.toId(target);
			if (id === 'constructor') return;
			if (!Tools.isUsernameLength(id)) return this.sayError(['invalidUsernameLength']);
			if (id.startsWith('guest')) return this.say("Guest users cannot be tracked.");
			const database = Storage.getGlobalDatabase();
			if (!database.lastSeen || !(id in database.lastSeen)) {
				return this.say(this.sanitizeResponse(target.trim() + " has not visited any of " + Users.self.name + "'s rooms in the " +
					"past " + Storage.lastSeenExpirationDuration + "."));
			}
			return this.say(this.sanitizeResponse(target.trim() + " last visited one of " + Users.self.name + "'s rooms **" +
				Tools.toDurationString(Date.now() - database.lastSeen[id]) + "** ago."));
		},
		aliases: ['seen'],
	},
	addbits: {
		async asyncCommand(target, room, user, cmd) {
			if (this.isPm(room) || ((!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) &&
				(!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id))) || !user.hasRank(room, 'voice')) return;
			if (target.includes("|")) {
				await this.runMultipleTargets("|");
				return;
			}
			const targets = target.split(",");
			const users: string[] = [];
			const removeBits = cmd === 'removebits' || cmd === 'rbits';
			let customBits: number | null = null;
			for (const target of targets) {
				const id = Tools.toId(target);
				if (!id) continue;
				if (Tools.isInteger(id)) {
					customBits = parseInt(target.trim());
				} else {
					users.push(target);
				}
			}

			if (!users.length) return this.say("You must specify at least 1 user to receive bits.");

			let bits = 100;
			let bitsLimit = 500;
			if (user.hasRank(room, 'driver')) bitsLimit = 5000;
			if (customBits) {
				if (customBits > bitsLimit) {
					customBits = bitsLimit;
				} else if (customBits < 0) {
					customBits = 0;
				}
				bits = customBits;
			}

			for (let i = 0; i < users.length; i++) {
				const user = Users.get(users[i]);
				if (user) users[i] = user.name;
				if (removeBits) {
					Storage.removePoints(room, users[i], bits, 'manual');
				} else {
					Storage.addPoints(room, users[i], bits, 'manual');
					if (user && user.rooms.has(room)) {
						user.say("You were awarded " + bits + " bits! To see your total amount, use this command: ``" +
							Config.commandCharacter + "rank " + room.title + "``");
					}
				}
			}

			const userList = Tools.joinList(users);
			if (removeBits) {
				this.say("Removed " + bits + " bits from " + userList + ".");
			} else {
				this.say("Added " + bits + " bits for " + userList + ".");
			}
		},
		aliases: ['abits', 'removebits', 'rbits'],
	},
	addsemifinalistpoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !Config.allowTournaments || !Config.allowTournaments.includes(room.id) ||
				!user.hasRank(room, 'driver')) return;
			const semiFinalist = cmd.includes('semi');
			const runnerUp = !semiFinalist && cmd.includes('runner');
			let placeName: TournamentPlace;
			if (semiFinalist) {
				placeName = "semifinalist";
			} else if (runnerUp) {
				placeName = "runnerup";
			} else {
				placeName = "winner";
			}

			const targets = target.split(',');
			if (targets.length !== 3 && targets.length !== 4) {
				return this.say("Usage: ``" + Config.commandCharacter + cmd + " " + "[" + placeName + "], [format], [players], " +
					"[scheduled]``");
			}

			if (!Tools.isUsernameLength(targets[0])) return this.say("Please specify a valid username.");
			const format = Dex.getFormat(targets[1]);
			if (!format) return this.sayError(['invalidFormat', targets[1].trim()]);

			const players = parseInt(targets[2]);
			if (isNaN(players) || players <= 0) return this.say("Please specify a valid number of players in the tournament.");
			if (players < Tournaments.minPlayerCap || players > Tournaments.maxPlayerCap) {
				return this.say("Tournaments can only award points for between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + " players.");
			}

			const scheduledOption = Tools.toId(targets[3]);
			const scheduled = scheduledOption === 'official' || scheduledOption === 'scheduled';

			const points = Tournaments.getPlacePoints(placeName, format, players, scheduled);
			const pointsString = points + " point" + (points > 1 ? "s" : "");

			let targetUserName = targets[0].trim();
			const targetUser = Users.get(targetUserName);
			if (targetUser) targetUserName = targetUser.name;

			Storage.addPoints(room, targetUserName, points, format.id);
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded " + pointsString + " for being " + (placeName === "semifinalist" ? "a" : "the") + " " +
					placeName + " in a " + (scheduled ? "scheduled " : "") + format.name + " tournament! To see your total amount, use " +
					"this command: ``" + Config.commandCharacter + "rank " + room.title + "``.");
			}

			this.sayCommand("/modnote " + user.name + " awarded " + targetUserName + " " + placeName + " points (" + points + ") for a " +
				(scheduled ? "scheduled " : "") + players + "-man " + format.name + " tournament");
		},
		aliases: ['addsemifinalpoints', 'addsemipoints', 'addrunneruppoints', 'addrunnerpoints', 'addwinnerpoints'],
	},
	makesemifinalistpointsofficial: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !Config.allowTournaments || !Config.allowTournaments.includes(room.id) ||
				!user.hasRank(room, 'driver')) return;
			const semiFinalist = cmd.includes('semi');
			const runnerUp = !semiFinalist && cmd.includes('runner');
			let placeName: TournamentPlace;
			if (semiFinalist) {
				placeName = "semifinalist";
			} else if (runnerUp) {
				placeName = "runnerup";
			} else {
				placeName = "winner";
			}

			const targets = target.split(',');
			if (targets.length !== 3) {
				return this.say("Usage: ``" + Config.commandCharacter + cmd + " " + "[" + placeName + "], [format], [players]``");
			}

			if (!Tools.isUsernameLength(targets[0])) return this.say("Please specify a valid username.");
			const format = Dex.getFormat(targets[1]);
			if (!format) return this.sayError(['invalidFormat', targets[1].trim()]);

			const players = parseInt(targets[2]);
			if (isNaN(players) || players <= 0) return this.say("Please specify a valid number of players in the tournament.");
			if (players < Tournaments.minPlayerCap || players > Tournaments.maxPlayerCap) {
				return this.say("Tournaments can only award points for between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + " players.");
			}

			const scheduledPoints = Tournaments.getPlacePoints(placeName, format, players, true);
			const regularPoints = Tournaments.getPlacePoints(placeName, format, players, false);
			const points = scheduledPoints - regularPoints;
			const pointsString = points + " missing point" + (points > 1 ? "s" : "");

			let targetUserName = targets[0].trim();
			const targetUser = Users.get(targetUserName);
			if (targetUser) targetUserName = targetUser.name;

			Storage.addPoints(room, targetUserName, points, format.id);
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded your " + pointsString + " for being " +
					(placeName === "semifinalist" ? "a" : "the") + " " + placeName + " in a scheduled " + format.name + " tournament! " +
					"To see your total amount, use this command: ``" + Config.commandCharacter + "rank " + room.title + "``.");
			}

			this.sayCommand("/modnote " + user.name + " awarded " + targetUserName + " missing " + placeName + " points (" + points + ") " +
				"for a scheduled " + players + "-man " + format.name + " tournament");
		},
		aliases: ['makesemifinalpointsofficial', 'makesemipointsofficial', 'makerunneruppointsofficial', 'makerunnerpointsofficial',
			'makewinnerpointsofficial'],
	},
	leaderboard: {
		command(target, room, user) {
			const targets = target.split(',');
			let leaderboardRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				leaderboardRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				leaderboardRoom = room;
			}
			const database = Storage.getDatabase(leaderboardRoom);
			if (!database.leaderboard) return this.say("There is no leaderboard for the " + leaderboardRoom.title + " room.");
			let users = Object.keys(database.leaderboard);
			let startPosition = 0;
			let source: IFormat | IGameFormat | undefined;
			let annual = false;
			for (const target of targets) {
				const id = Tools.toId(target);
				if (Tools.isInteger(id)) {
					if (startPosition) return this.say("You can only specify 1 position on the leaderboard.");
					startPosition = parseInt(id);
				} else if (id === 'annual' || id === 'alltime') {
					annual = true;
				} else {
					const format = Dex.getFormat(target);
					if (format && format.effectType === 'Format') {
						if (source) return this.say("You can only specify 1 point source.");
						source = format;
					} else {
						const gameFormat = Games.getFormat(target);
						if (!Array.isArray(gameFormat)) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						}
					}
				}
			}

			if (startPosition) {
				if (startPosition > users.length) startPosition = users.length;
				startPosition -= 10;
				if (startPosition < 0) startPosition = 0;
			}

			const pointsCache: Dict<number> = {};

			if (annual && source) {
				for (const id of users) {
					let points = 0;
					if (database.leaderboard[id].sources[source.id]) points += database.leaderboard[id].sources[source.id];
					if (database.leaderboard[id].annualSources[source.id]) points += database.leaderboard[id].annualSources[source.id];
					pointsCache[id] = points;
				}
			} else if (annual) {
				for (const id of users) {
					pointsCache[id] = database.leaderboard[id].annual + database.leaderboard[id].current;
				}
			} else if (source) {
				for (const id of users) {
					pointsCache[id] = database.leaderboard[id].sources[source.id] || 0;
				}
			} else {
				for (const id of users) {
					pointsCache[id] = database.leaderboard[id].current;
				}
			}

			users = users.filter(x => pointsCache[x] !== 0).sort((a, b) => pointsCache[b] - pointsCache[a]);
			if (!users.length) return this.say("The " + (source ? source.name : "") + " leaderboard for the " + leaderboardRoom.title + " room is empty.");

			const output: string[] = [];
			const positions = 10;
			for (let i = startPosition; i < users.length; i++) {
				if (!users[i]) break;
				const points = pointsCache[users[i]] || database.leaderboard[users[i]].current;
				const position = '' + (i + 1);
				if (position.endsWith('1') && !position.endsWith('11')) {
					output.push(position + "st: __" + database.leaderboard[users[i]].name + "__ (" + points + ")");
				} else if (position.endsWith('2') && !position.endsWith('12')) {
					output.push(position + "nd: __" + database.leaderboard[users[i]].name + "__ (" + points + ")");
				} else if (position.endsWith('3') && !position.endsWith('13')) {
					output.push(position + "rd: __" + database.leaderboard[users[i]].name + "__ (" + points + ")");
				} else {
					output.push(position + "th: __" + database.leaderboard[users[i]].name + "__ (" + points + ")");
				}
				if (output.length === positions) break;
			}
			let endPosition = startPosition + positions;
			if (endPosition > users.length) endPosition = users.length;
			this.say("``" + (annual ? "Annual " : "") + (source ? source.name + " " : "") + "Top " + endPosition + " of " + users.length +
				"``: " + output.join(", "));
		},
		aliases: ['lb', 'top'],
	},
	rank: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();
			const database = Storage.getDatabase(targetRoom);
			if (!database.leaderboard) return this.say("There is no leaderboard for the " + targetRoom.title + " room.");
			const users = Object.keys(database.leaderboard);
			if (!users.length) return this.say("The " + targetRoom.title + " leaderboard is empty.");
			let targetUser = '';
			let position = 0;
			let source: IFormat | IGameFormat | undefined;
			for (const target of targets) {
				const id = Tools.toId(target);
				if (Tools.isInteger(id)) {
					if (position) return this.say("You can only specify 1 position on the leaderboard.");
					position = parseInt(id);
				} else {
					const format = Dex.getFormat(target);
					if (format && format.effectType === 'Format') {
						if (source) return this.say("You can only specify 1 point source.");
						source = format;
					} else {
						const gameFormat = Games.getFormat(target);
						if (!Array.isArray(gameFormat)) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						} else {
							targetUser = id;
						}
					}
				}
			}

			if (targetUser && position) return this.say("You cannot specify both a username and a position.");

			const bits = (Config.allowScriptedGames && Config.allowScriptedGames.includes(targetRoom.id)) ||
				(Config.allowUserHostedGames && Config.allowUserHostedGames.includes(targetRoom.id));
			const currentPointsCache: Dict<number> = {};
			const annualPointsCache: Dict<number> = {};
			if (source) {
				for (const id of users) {
					let annualPoints = 0;
					if (database.leaderboard[id].sources[source.id]) annualPoints += database.leaderboard[id].sources[source.id];
					if (database.leaderboard[id].annualSources[source.id]) {
						annualPoints += database.leaderboard[id].annualSources[source.id];
					}
					annualPointsCache[id] = annualPoints;
					currentPointsCache[id] = database.leaderboard[id].sources[source.id] || 0;
				}
			} else {
				for (const id of users) {
					annualPointsCache[id] = database.leaderboard[id].annual + database.leaderboard[id].current;
					currentPointsCache[id] = database.leaderboard[id].current;
				}
			}
			const current = users.filter(x => currentPointsCache[x] !== 0).sort((a, b) => currentPointsCache[b] - currentPointsCache[a]);
			const annual = users.filter(x => annualPointsCache[x] !== 0).sort((a, b) => annualPointsCache[b] - annualPointsCache[a]);

			const results: string[] = [];
			if (position) {
				const index = position - 1;
				if (current[index]) {
					results.push("#" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard " +
						"is " + database.leaderboard[current[index]].name + " with " + (currentPointsCache[current[index]] ||
						database.leaderboard[current[index]].current) + " " + (bits ? "bits" : "points") + ".");
				}
				if (annual[index]) {
					results.push("#" + position + " on the annual " + targetRoom.title + " " + (source ? source.name + " " : "") +
						"leaderboard is " + database.leaderboard[annual[index]].name + " with " + annualPointsCache[annual[index]] + " " +
						(bits ? "bits" : "points") + ".");
				}
				if (!results.length) {
					return this.say("No one is #" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") +
						"leaderboard.");
				}
			} else {
				if (!targetUser) targetUser = user.id;
				const self = targetUser === user.id;
				const currentIndex = current.indexOf(targetUser);
				const annualIndex = annual.indexOf(targetUser);
				if (currentIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (currentIndex + 1) + " on " +
						"the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard with " +
						(currentPointsCache[targetUser] || database.leaderboard[targetUser].current) + " " + (bits ? "bits" : "points") +
						".");
				}
				if (annualIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (annualIndex + 1) + " on " +
						"the annual " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard with " +
						annualPointsCache[targetUser] + " " + (bits ? "bits" : "points") + ".");
				}
				if (!results.length) {
					return this.say((self ? "You are" : database.leaderboard[targetUser] ? database.leaderboard[targetUser].name :
						targetUser + " is") + " not " + "on the " + targetRoom.title + " " + (source ? source.name + " " : "") +
						"leaderboard.");
				}
			}
			this.say(results.join(" "));
		},
		aliases: ['points', 'bits'],
	},
	clearleaderboard: {
		command(target, room, user) {
			if (this.isPm(room) || (!user.hasRank(room, 'roomowner') && !user.isDeveloper())) return;
			if (!Storage.clearLeaderboard(room.id)) return;
			this.say("The leaderboard was cleared.");
		},
		aliases: ['resetleaderboard'],
	},
	transferdata: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!user.isDeveloper() && !user.hasRank(targetRoom, 'roomowner')) return;
			const source = targets[1].trim();
			const destination = targets[2].trim();
			if (!Storage.transferData(targetRoom.id, source, destination)) return;
			this.say("Data from " + source + " in " + targetRoom.title + " has been successfully transferred to " + destination + ".");
			targetRoom.sayCommand("/modnote " + user.name + " transferred data from " + source + " to " + destination + ".");
		},
	},
	gameachievements: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) {
				return this.sayError(['disabledGameFeatures', targetRoom.title]);
			}

			let id = Tools.toId(targets[1]);
			let name: string;
			if (id) {
				name = targets[1].trim();
			} else {
				name = user.name;
				id = user.id;
			}

			const database = Storage.getDatabase(targetRoom);
			const unlockedAchievements: string[] = [];
			if (database.gameAchievements && id in database.gameAchievements) {
				for (const achievement of database.gameAchievements[id]) {
					if (achievement in Games.achievements) unlockedAchievements.push(Games.achievements[achievement].name);
				}
			}
			if (!unlockedAchievements.length) {
				return this.say((id === user.id ? "You have" : name + " has") + " not unlocked any game achievements in " +
					targetRoom.title + ".");
			}
			this.sayHtml("<b>" + (id === user.id ? "Your" : name + "'s") + " unlocked game achievements</b>:<br />" +
				unlockedAchievements.join(", "), targetRoom);
		},
		aliases: ['achievements', 'chieves'],
	},
	eventlink: {
		command(target, room, user) {
			const targets = target.split(',');
			let eventRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				eventRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				eventRoom = room;
			}

			const database = Storage.getDatabase(eventRoom);
			if (!database.eventInformation) return this.sayError(['noRoomEventInformation', eventRoom.title]);
			const event = Tools.toId(targets[0]);
			if (!(event in database.eventInformation)) return this.sayError(['invalidRoomEvent', eventRoom.title]);
			const eventInformation = database.eventInformation[event];
			if (!eventInformation.link) return this.say(database.eventInformation[event].name + " does not have a link stored.");
			this.sayHtml("<b>" + eventInformation.name + "</b>: <a href='" + eventInformation.link.url + "'>" +
				eventInformation.link.description + "</a>", eventRoom);
		},
		aliases: ['elink'],
	},
	seteventlink: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const targets = target.split(',');
			const event = Tools.toId(targets[0]);
			if (!event) return this.say("You must specify an event.");
			const url = targets[1].trim();
			if (!url.startsWith('http://') && !url.startsWith('https://')) return this.say("You must specify a valid link.");
			const description = targets.slice(2).join(',').trim();
			if (!description) return this.say("You must include a description for the link.");
			let name = targets[0].trim();
			const database = Storage.getDatabase(room);
			if (!database.eventInformation) database.eventInformation = {};
			if (!(event in database.eventInformation)) {
				database.eventInformation[event] = {name};
			} else {
				name = database.eventInformation[event].name;
			}
			database.eventInformation[event].link = {description, url};
			this.say("The event link and description for " + name + " has been stored.");
		},
		aliases: ['setelink'],
	},
	removeeventlink: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const database = Storage.getDatabase(room);
			if (!database.eventInformation) return this.sayError(['noRoomEventInformation', room.title]);
			const event = Tools.toId(target);
			if (!event) return this.say("You must specify an event.");
			if (!(event in database.eventInformation)) return this.sayError(['invalidRoomEvent', room.title]);
			if (!database.eventInformation[event].link) return this.say(database.eventInformation[event].name + " does not have a link " +
				"stored.");
			delete database.eventInformation[event].link;
			this.say("The link for " + database.eventInformation[event].name + " has been removed.");
		},
		aliases: ['removeelink'],
	},
	eventformats: {
		command(target, room, user) {
			const targets = target.split(',');
			let eventRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				eventRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				eventRoom = room;
			}
			const database = Storage.getDatabase(eventRoom);
			if (!database.eventInformation) return this.sayError(['noRoomEventInformation', eventRoom.title]);
			const event = Tools.toId(targets[0]);
			if (!event || !(event in database.eventInformation)) return this.say("You must specify a valid event.");
			const eventInformation = database.eventInformation[event];
			if (!eventInformation.formatIds) return this.say(database.eventInformation[event].name + " does not have any formats stored.");
			const multipleFormats = eventInformation.formatIds.length > 1;
			if (targets.length > 1) {
				if (!Tools.isUsernameLength(targets[1])) return this.say("You must specify a user.");
				const targetUser = Tools.toId(targets[1]);
				if (!database.leaderboard) return this.say("There is no leaderboard for the " + eventRoom.title + " room.");
				if (!(targetUser in database.leaderboard)) return this.say(this.sanitizeResponse(targets[1].trim() + " does not have any " +
					"event points."));
				let eventPoints = 0;
				for (const source in database.leaderboard[targetUser].sources) {
					if (eventInformation.formatIds.includes(source)) eventPoints += database.leaderboard[targetUser].sources[source];
				}
				this.say(database.leaderboard[targetUser].name + " has " + eventPoints + " points in" +
					(!multipleFormats ? " the" : "") + " " + database.eventInformation[event].name + " format" +
					(multipleFormats ? "s" : "") + ".");
			} else {
				const formatNames: string[] = [];
				for (const formatId of eventInformation.formatIds) {
					const format = Dex.getFormat(formatId);
					formatNames.push(format ? format.name : formatId);
				}
				this.say("The format" + (multipleFormats ? "s" : "") + " for " + database.eventInformation[event].name + " " +
					(multipleFormats ? "are " : "is ") + Tools.joinList(formatNames) + ".");
			}
		},
		aliases: ['eformats'],
	},
	seteventformats: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.rankedTournaments || !Config.rankedTournaments.includes(room.id)) {
				return this.sayError(['disabledTournamentFeatures', room.title]);
			}
			const targets = target.split(',');
			const event = Tools.toId(targets[0]);
			if (!event) return this.say("You must specify an event.");
			if (targets.length === 1) return this.say("You must specify at least 1 format.");
			const formatIds: string[] = [];
			for (let i = 1; i < targets.length; i++) {
				const format = Dex.getFormat(targets[i]);
				if (!format) return this.sayError(['invalidFormat', targets[i]]);
				formatIds.push(format.id);
			}
			let name = targets[0].trim();
			const database = Storage.getDatabase(room);
			if (!database.eventInformation) database.eventInformation = {};
			if (!(event in database.eventInformation)) {
				database.eventInformation[event] = {name};
			} else {
				name = database.eventInformation[event].name;
			}
			database.eventInformation[event].formatIds = formatIds;
			const multipleFormats = formatIds.length > 1;
			this.say("The event format" + (multipleFormats ? "s" : "") + " for " + name + " " + (multipleFormats ? "have" : "has") +
				" been stored.");
		},
		aliases: ['seteformats'],
	},
	removeeventformats: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const targets = target.split(',');
			const event = Tools.toId(targets[0]);
			if (!event) return this.say("You must specify an event.");
			const database = Storage.getDatabase(room);
			if (!database.eventInformation) return this.sayError(['noRoomEventInformation', room.title]);
			if (!(event in database.eventInformation)) return this.sayError(['invalidRoomEvent', room.title]);
			if (!database.eventInformation[event].formatIds) {
				return this.say(database.eventInformation[event].name + " does not have any formats stored.");
			}
			delete database.eventInformation[event].formatIds;
			this.say("The formats for " + database.eventInformation[event].name + " have been removed.");
		},
		aliases: ['removeeformats'],
	},
	removeevent: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const targets = target.split(',');
			const event = Tools.toId(targets[0]);
			if (!event) return this.say("You must specify an event.");
			const database = Storage.getDatabase(room);
			if (!database.eventInformation) return this.sayError(['noRoomEventInformation', room.title]);
			if (!(event in database.eventInformation)) return this.sayError(['invalidRoomEvent', room.title]);
			const name = database.eventInformation[event].name;
			delete database.eventInformation[event];
			this.say("The " + name + " event has been removed.");
		},
	},
	setgreeting: {
		command(target, room, user, cmd) {
			if (!this.isPm(room) || !user.isDeveloper()) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Tools.isUsernameLength(targets[1])) return this.sayError(['invalidUsernameLength']);
			const greeting = targets.slice(2).join(',').trim();
			if (!greeting) return this.say("You must specify a greeting.");
			if ((greeting.startsWith('/') && !greeting.startsWith('/me ') && !greeting.startsWith('/mee ')) || greeting.startsWith('!')) {
				return this.say("Greetings cannot be PS! commands.");
			}
			const database = Storage.getDatabase(targetRoom);
			if (!database.botGreetings) database.botGreetings = {};
			const id = Tools.toId(targets[1]);
			let duration = 0;
			if (cmd === 'awardgreeting') {
				if (Config.awardedBotGreetingDurations && targetRoom.id in Config.awardedBotGreetingDurations) {
					duration = Config.awardedBotGreetingDurations[targetRoom.id];
				} else {
					duration = AWARDED_BOT_GREETING_DURATION;
				}
			}
			database.botGreetings[id] = {greeting};
			if (duration) database.botGreetings[id].expiration = Date.now() + duration;
			this.say(this.sanitizeResponse(targets[1].trim() + "'s greeting in " + targetRoom.title + (duration ? " (expiring in " +
				Tools.toDurationString(duration) + ")" : "") + " has been stored."));
		},
		aliases: ['addgreeting', 'awardgreeting'],
	},
	removegreeting: {
		command(target, room, user) {
			if (!this.isPm(room) || !user.isDeveloper()) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			const database = Storage.getDatabase(targetRoom);
			if (!database.botGreetings) return this.say(targetRoom.title + " does not have any bot greetings stored.");
			if (!Tools.isUsernameLength(targets[1])) return this.sayError(['invalidUsernameLength']);
			const id = Tools.toId(targets[1]);
			if (!(id in database.botGreetings)) {
				return this.say(this.sanitizeResponse(targets[1].trim() + " does not have a greeting stored for " + targetRoom.title +
					"."));
			}
			delete database.botGreetings[id];
			this.say(this.sanitizeResponse(targets[1].trim() + "'s greeting in " + targetRoom.title + " has been removed."));
		},
	},
	logs: {
		async asyncCommand(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			if (targets.length < 3) return this.say("You must specify at least a room, a user, and a start date or phrase.");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!user.isDeveloper() && !user.hasRank(targetRoom, 'driver')) return;
			if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
			targets.shift();

			let phrases: string[] | null = null;
			const userParts = targets[0].split("|");
			targets.shift();
			let userids: string[] | null = null;
			let anyUser = false;
			for (const part of userParts) {
				if (part.trim() === '*') {
					anyUser = true;
					continue;
				}
				const id = Tools.toId(part);
				if (!id) continue;
				if (!Tools.isUsernameLength(part)) return this.say("You have included an invalid username (" + part.trim() + ").");
				if (!userids) userids = [];
				userids.push(id);
			}

			let autoStartYear = false;
			let autoEndYear = false;
			const date = new Date();
			const currentYear = date.getFullYear();
			const currentMonth = date.getMonth() + 1;
			const currentDate = date.getDate();
			let startDate: number[] = [];
			let endDate: number[] = [];
			for (let target of targets) {
				if (!Tools.toId(target)) continue;
				target = target.trim();
				if (target.includes("/") && (!startDate.length || !endDate.length)) {
					// startDate-endDate
					if (target.includes("-")) {
						const parts = target.split("-");
						const startExtracted = Tools.toDateArray(parts[0], true);
						const endExtracted = Tools.toDateArray(parts[1]);
						if (startExtracted && endExtracted) {
							startDate = startExtracted;
							endDate = endExtracted;
							if (startDate.length === 2) {
								startDate.unshift(currentYear);
								autoStartYear = true;
							}
							if (endDate.length === 2) {
								endDate.unshift(currentYear);
								autoEndYear = true;
							}
						}
					} else {
						const startExtracted = Tools.toDateArray(target, true);
						if (startExtracted) {
							startDate = startExtracted;
							if (startDate.length === 2) {
								startDate.unshift(currentYear);
								autoStartYear = true;
							}
						}
					}
				} else {
					if (!phrases) phrases = [];
					phrases.push(target.toLowerCase());
				}
			}

			const roomDirectory = path.join(Tools.roomLogsFolder, targetRoom.id);
			let years: string[] = [];
			try {
				years = fs.readdirSync(roomDirectory);
			} catch (e) {
				return this.say("Chat logging is not enabled for " + targetRoom.id + ".");
			}
			const numberYears = years.map(x => parseInt(x));
			const firstLoggedYear = numberYears.sort((a, b) => a - b)[0];
			const days = fs.readdirSync(roomDirectory + "/" + firstLoggedYear);
			const months: Dict<number[]> = {};
			for (const day of days) {
				if (!day.endsWith('.txt')) continue;
				const parts = day.split(".")[0].split('-');
				const month = parts[1];
				if (!(month in months)) months[month] = [];
				months[month].push(parseInt(parts[2]));
			}
			const numberMonths = Object.keys(months);
			const firstLoggedMonthString = numberMonths.sort((a, b) => parseInt(a) - parseInt(b))[0];
			const firstLoggedDay = months['' + firstLoggedMonthString].sort((a, b) => a - b)[0];
			const firstLoggedMonth = parseInt(firstLoggedMonthString);
			if (!startDate.length) {
				startDate = [firstLoggedYear, firstLoggedMonth, firstLoggedDay];
			} else {
				if (startDate[0] > currentYear) return this.say("You cannot search past the current year.");
				if (autoStartYear && startDate[0] === currentYear && startDate[1] > currentMonth) startDate[0]--;
				if (startDate[0] === currentYear) {
					if (startDate[1] > currentMonth) return this.say("You cannot search past the current month.");
					if (startDate[1] === currentMonth) {
						if (startDate[2] > currentDate) return this.say("You cannot search past the current day.");
					}
				}

				if (startDate[0] < firstLoggedYear) return this.say("There are no chat logs from before " + firstLoggedYear + ".");
				if (startDate[0] === firstLoggedYear) {
					if (startDate[1] < firstLoggedMonth) {
						return this.say("There are no chat logs from before " + firstLoggedMonth + "/" + firstLoggedYear + ".");
					}
					if (startDate[1] === firstLoggedMonth) {
						if (startDate[2] < firstLoggedDay) {
							return this.say("There are no chat logs from before " + firstLoggedMonth + "/" + firstLoggedDay + "/" +
								firstLoggedYear + ".");
						}
					}
				}
			}

			if (!endDate.length) {
				endDate = [currentYear, currentMonth, currentDate];
			} else {
				if (endDate[0] > currentYear) return this.say("You cannot search past the current year.");
				if (autoEndYear && endDate[0] === currentYear && endDate[1] > currentMonth) endDate[0]--;
				if (endDate[0] === currentYear) {
					if (endDate[1] > currentMonth) return this.say("You cannot search past the current month.");
					if (endDate[1] === currentMonth) {
						if (endDate[2] > currentDate) return this.say("You cannot search past the current day.");
					}
				}

				if (endDate[0] < firstLoggedYear) return this.say("There are no chat logs from before " + firstLoggedYear + ".");
				if (endDate[0] === firstLoggedYear) {
					if (endDate[1] < firstLoggedMonth) {
						return this.say("There are no chat logs from before " + firstLoggedMonth + "/" + firstLoggedYear + ".");
					}
					if (endDate[1] === firstLoggedMonth) {
						if (endDate[2] < firstLoggedDay) {
							return this.say("There are no chat logs from before " + firstLoggedDay + "/" + firstLoggedMonth + "/" +
								firstLoggedYear + ".");
						}
					}
				}
			}

			if (startDate[0] > endDate[0]) return this.say("You must enter the search dates in sequential order.");
			if (startDate[0] === endDate[0]) {
				if (startDate[1] > endDate[1]) return this.say("You must enter the search dates in sequential order.");
				if (startDate[1] === endDate[1]) {
					if (startDate[2] > endDate[2]) return this.say("You must enter the search dates in sequential order.");
				}
			}

			if (!userids && !phrases) return this.say("You must include at least one user or phrase in your search.");
			if (anyUser && userids) return this.say("You cannot search for both a specific user and any user.");
			if (phrases) {
				for (const phrase of phrases) {
					if (phrase.length === 1) return this.say("You cannot search for a single character.");
				}
			}
			if (Storage.reloadInProgress) return this.sayError(['reloadInProgress']);

			const userId = user.id;
			if (Storage.workers.logs.requestsByUserid.includes(userId)) return this.say("You can only perform 1 search at a time.");

			const displayStartDate = startDate.slice(1);
			displayStartDate.push(startDate[0]);
			const displayEndDate = endDate.slice(1);
			displayEndDate.push(endDate[0]);
			let text = "Retrieving chat logs from " + displayStartDate.join("/") + " to " + displayEndDate.join("/");
			if (userids) {
				text += " for the user '" + userids.join("|") + "'" + (phrases ? " containing the phrase '" + phrases.join("|") + "'" : "");
			} else if (phrases) {
				text += " containing the phrase '" + phrases.join("|") + "'";
			}
			text += "...";
			this.say(text);

			Storage.workers.logs.requestsByUserid.push(userId);
			const showCommands = (Config.allowScriptedGames && Config.allowScriptedGames.includes(targetRoom.id)) ||
				(Config.allowUserHostedGames && Config.allowUserHostedGames.includes(targetRoom.id)) ? true : false;
			const result = await Storage.workers.logs.search({
				endDate,
				phrases,
				roomid: targetRoom.id,
				showCommands,
				startDate,
				userids,
			});

			if (result === null) {
				this.say("An error occurred while searching logs.");
			} else {
				this.sayHtml("<details><summary>Found <b>" + result.totalLines + "</b> line" + (result.totalLines === 1 ? "" : "s") +
					":</summary>" + result.lines.join("<br />") + "</details>", targetRoom);
			}

			Storage.workers.logs.requestsByUserid.splice(Storage.workers.logs.requestsByUserid.indexOf(userId), 1);
		},
	},
};

export = commands;

/* eslint-enable */
