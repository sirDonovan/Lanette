import child_process = require('child_process');
import path = require('path');
import { ICommandDefinition } from "./command-parser";
import { Player } from "./room-activity";
import { Game } from './room-game';
import { IBattleData } from './room-tournament';
import { Room } from "./rooms";
import { GameDifficulty, IGameFormat } from "./types/games";
import { IFormat } from "./types/in-game-data-types";
import { User } from "./users";

type ReloadableModule = 'client' | 'commandparser' | 'commands' | 'config' | 'dex' | 'games' | 'storage' | 'tools' | 'tournaments';
const moduleOrder: ReloadableModule[] = ['tools', 'config', 'dex', 'client', 'commandparser', 'commands', 'games', 'storage', 'tournaments'];

const commands: Dict<ICommandDefinition> = {
	/**
	 * Developer commands
	 */
	eval: {
		command(target, room, user) {
			try {
				// tslint:disable-next-line no-eval
				this.say(eval(target));
			} catch (e) {
				this.say(e.message);
				console.log(e.stack);
			}
		},
		aliases: ['js'],
		developerOnly: true,
	},
	gitpull: {
		command(target, room, user) {
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
	reload: {
		command(target, room, user) {
			if (!target) return;
			const hasModules: boolean[] = moduleOrder.slice().map(x => false);
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]) as ReloadableModule;
				const moduleIndex = moduleOrder.indexOf(id);
				if (moduleIndex !== -1) {
					hasModules[moduleIndex] = true;
				} else {
					return this.say("'" + targets[i].trim() + "' is not a module or cannot be reloaded.");
				}
			}

			const modules: ReloadableModule[] = [];
			for (let i = 0; i < hasModules.length; i++) {
				if (hasModules[i]) modules.push(moduleOrder[i]);
			}

			this.say("Running tsc...");
			require(path.join(Tools.rootFolder, 'build.js'))(() => {
				for (let i = 0; i < modules.length; i++) {
					if (modules[i] === 'client') {
						const oldClient = global.Client;
						Tools.uncacheTree('./client');
						const client: typeof import('./client') = require('./client');
						global.Client = new client.Client();
						Client.onReload(oldClient);
					} else if (modules[i] === 'commandparser') {
						Tools.uncacheTree('./command-parser');
						const commandParser: typeof import('./command-parser') = require('./command-parser');
						global.CommandParser = new commandParser.CommandParser();
					} else if (modules[i] === 'commands') {
						Tools.uncacheTree('./commands');
						global.Commands = CommandParser.loadBaseCommands(require('./commands'));
						if (Games.loadedFormats) Games.loadFormatCommands();
					} else if (modules[i] === 'config') {
						Tools.uncacheTree('./config');
						Tools.uncacheTree('./config-loader');
						const config: typeof import('./config-example') = require('./config-loader').load(require('./config'));
						global.Config = config;
						Rooms.checkLoggingConfigs();
					} else if (modules[i] === 'dex') {
						Tools.uncacheTree('./dex');
						const dex: typeof import('./dex') = require('./dex');
						global.Dex = new dex.Dex();
					} else if (modules[i] === 'games') {
						Tools.uncacheTree('./games');
						Tools.uncacheTree('./room-activity');
						const games: typeof import('./games') = require('./games');
						global.Games = new games.Games();
					} else if (modules[i] === 'storage') {
						const oldStorage = global.Storage;
						Tools.uncacheTree('./storage');
						const storage: typeof import('./storage') = require('./storage');
						global.Storage = new storage.Storage();
						Storage.onReload(oldStorage);
					} else if (modules[i] === 'tools') {
						const oldTools = global.Tools;
						Tools.uncacheTree('./tools');
						const tools: typeof import('./tools') = require('./tools');
						global.Tools = new tools.Tools();
						Tools.onReload(oldTools);
					} else if (modules[i] === 'tournaments') {
						const oldTournaments = global.Tournaments;
						Tools.uncacheTree('./tournaments');
						Tools.uncacheTree('./room-activity');
						const tournaments: typeof import('./tournaments') = require('./tournaments');
						global.Tournaments = new tournaments.Tournaments();
						Tournaments.onReload(oldTournaments);
					}
				}
				this.say("Successfully reloaded: " + modules.join(", "));
			}, () => {
				this.say("Failed to build files.");
			});
		},
		aliases: ['hotpatch'],
		developerOnly: true,
	},

	/**
	 * Informational commands
	 */
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
			let pmRoom: Room;
			if (this.isPm(room)) {
				user.rooms.forEach((value, room) => {
					if (!pmRoom && Users.self.hasRank(room, 'bot')) pmRoom = room;
				});
			} else {
				if (!user.hasRank(room, 'voice')) return;
				pmRoom = room;
			}
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			const html = Dex.getFormatInfoDisplay(format);
			if (!html.length) return this.say("No info found for " + format.name + ".");
			this.sayHtml("<b>" + format.name + "</b>" + html, pmRoom!);
		},
		aliases: ['om', 'tier'],
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
			if (!database.eventLinks) return this.say(eventRoom.title + " does not currently have any event links stored.");
			const event = Tools.toId(targets[0]);
			if (!(event in database.eventLinks)) return this.say("'" + targets[0] + "' is not one of " + eventRoom.title + "'s event links.");
			this.sayHtml("<a href='" + database.eventLinks[event].link + "'><b>" + database.eventLinks[event].description + "</b></a>", eventRoom);
		},
		aliases: ['elink'],
	},
	seteventlink: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const targets = target.split(',');
			const event = Tools.toId(targets[0]);
			if (!event) return this.say("You must specify an event.");
			const link = targets[1].trim();
			if (!link.startsWith('http://') && !link.startsWith('https://')) return this.say("You must specify a valid link.");
			const description = targets.slice(2).join(',').trim();
			if (!description) return this.say("You must include a description for the link.");
			const database = Storage.getDatabase(room);
			if (!database.eventLinks) database.eventLinks = {};
			database.eventLinks[event] = {description, link};
			this.say("The event link and description for " + targets[0].trim() + " has been updated.");
		},
		aliases: ['setelink'],
	},
	removeeventlink: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			const database = Storage.getDatabase(room);
			if (!database.eventLinks) return this.say(room.title + " does not currently have any event links stored.");
			const event = Tools.toId(target);
			if (!event || !(event in database.eventLinks)) return this.say("You must specify a valid event.");
			delete database.eventLinks[event];
			this.say("The event link for " + target.trim() + " has been removed.");
		},
		aliases: ['removeelink'],
	},

	/**
	 * Game commands
	 */
	creategame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) return this.sayError(['disabledGameFeatures', room.title]);
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'scripted game']);
			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			if (remainingGameCooldown > 1000) {
				const durationString = Tools.toDurationString(remainingGameCooldown);
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown remaining.");
				return;
			}
			const format = Games.getFormat(target, user);
			if (Array.isArray(format)) return this.sayError(format);
			const game = Games.createGame(room, format);
			game.signups();
		},
		aliases: ['cg'],
	},
	startgame: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) {
				if (!user.hasRank(room, 'voice') || room.game.started) return;
				room.game.start();
			} else if (room.userHostedGame) {
				if (user.id !== room.userHostedGame.hostId || room.userHostedGame.started) return;
				room.userHostedGame.start();
			}
		},
		aliases: ['sg'],
	},
	endgame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (room.game) {
					room.game.forceEnd(user);
				}
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (room.game) {
					room.game.forceEnd(user);
				} else if (room.userHostedGame) {
					room.userHostedGame.forceEnd(user);
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
			if (this.isPm(room)) return;
			if (room.game) {
				room.game.removePlayer(user);
			} else if (room.userHostedGame) {
				if (!(user.id in room.userHostedGame.players) || room.userHostedGame.players[user.id].eliminated) return;
				room.userHostedGame.destroyPlayer(user);
				user.say("You have left the " + room.userHostedGame.name + " " + room.userHostedGame.activityType + ".");
			}
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
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id)) return;
				gameRoom = room;
			}
			if (gameRoom.game) {
				const game = gameRoom.game;
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot) : "") + "<b>" + game.nameWithOptions + "</b><br />";
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot, true) : "") + "<b>" + game.nameWithOptions + "</b><br />";
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
	lastgame: {
		command(target, room, user) {
			const targets = target.split(',');
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) return this.sayError(['disabledGameFeatures', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) return this.sayError(['disabledGameFeatures', room.title]);
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!targets[0]) {
				if (!database.lastGameTime) return this.say("No scripted games have been played in " + gameRoom.title + ".");
				return this.say("The last scripted game in " + gameRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastGameTime) + "** ago.");
			}
			const format = Games.getFormat(targets[0]);
			if (Array.isArray(format)) return this.sayError(format);
			if (!database.lastGameFormatTimes || !(format.id in database.lastGameFormatTimes)) return this.say(format.name + " has not been played in " + gameRoom.title + ".");
			this.say("The last game of " + format.name + " in " + gameRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastGameFormatTimes[format.id]) + "** ago.");
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
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(targetRoom.id)) return this.sayError(['disabledUserHostedGameFeatures', targetRoom.title]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) return this.sayError(['disabledUserHostedGameFeatures', room.title]);
				gameRoom = room;
			}

			const database = Storage.getDatabase(gameRoom);
			if (!targets[0]) {
				if (!database.lastUserHostedGameTime) return this.say("No user-hosted games have been played in " + gameRoom.title + ".");
				return this.say("The last user-hosted game in " + gameRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastUserHostedGameTime) + "** ago.");
			}
			const format = Games.getUserHostedFormat(targets[0]);
			if (Array.isArray(format)) return this.sayError(format);
			if (!database.lastUserHostedGameFormatTimes || !(format.id in database.lastUserHostedGameFormatTimes)) return this.say(format.name + " has not been hosted in " + gameRoom.title + ".");
			this.say("The last user-hosted game of " + format.name + " in " + gameRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastUserHostedGameFormatTimes[format.id]) + "** ago.");
		},
		aliases: ['lastuserhost', 'lasthost'],
	},
	host: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice')) return;
			if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) return this.sayError(['disabledUserHostedGameFeatures', room.title]);
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'user-hosted game']);
			const targets = target.split(",");
			const host = Users.get(targets[0]);
			if (!host || !host.rooms.has(room)) return this.say("Please specify a user currently in this room.");
			targets.shift();
			const format = Games.getUserHostedFormat(targets.join(","), user);
			if (Array.isArray(format)) return this.sayError(format);
			const database = Storage.getDatabase(room);
			const otherUsersQueued = database.userHostedGameQueue && database.userHostedGameQueue.length;
			const remainingGameCooldown = Games.getRemainingGameCooldown(room);
			const inCooldown = remainingGameCooldown > 1000;
			const requiresScriptedGame = Games.requiresScriptedGame(room);
			if (room.game || room.userHostedGame || otherUsersQueued || inCooldown || requiresScriptedGame) {
				if (database.userHostedGameQueue) {
					for (let i = 0; i < database.userHostedGameQueue.length; i++) {
						if (Tools.toId(database.userHostedGameQueue[i].name) === host.id) {
							if (database.userHostedGameQueue[i].format === format.name) return this.say(host.name + " is already in the host queue for " + format.name + ".");
							database.userHostedGameQueue[i].format = format.name;
							return this.say(host.name + "'s game was changed to " + format.name + ".");
						}
					}
				} else {
					database.userHostedGameQueue = [];
				}
				if (Config.maxQueuedUserHostedGames && room.id in Config.maxQueuedUserHostedGames && database.userHostedGameQueue.length >= Config.maxQueuedUserHostedGames[room.id]) {
					return this.say("The host queue is full.");
				}

				let reason = '';
				if (!room.game && !room.userHostedGame) {
					if (otherUsersQueued) {
						reason = (database.userHostedGameQueue.length === 1 ? "Another host is" : database.userHostedGameQueue.length + " other hosts are") + " currently queued";
					} else if (inCooldown) {
						const durationString = Tools.toDurationString(remainingGameCooldown);
						reason = "There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown remaining";
					} else if (requiresScriptedGame) {
						reason = "At least 1 scripted game needs to be played before the next user-hosted game can start";
					}
				}
				this.say((reason ? reason + " so " : "") + host.name + " was added to the host queue.");
				database.userHostedGameQueue.push({
					format: format.name,
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
	nexthost: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice') || room.game || room.userHostedGame) return;
			if (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id)) return this.sayError(['disabledUserHostedGameFeatures', room.title]);
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
				this.say("There " + (durationString.endsWith('s') ? "are" : "is") + " still " + durationString + " of the game cooldown remaining.");
				return;
			}
			const nextHost = database.userHostedGameQueue[0];
			const format = Games.getUserHostedFormat(nextHost.format, user);
			if (Array.isArray(format)) return this.sayError(format);
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
				html.push("<b>" + (i + 1) + "</b>: " + name + " (" + database.userHostedGameQueue[i].format + ")");
			}
			this.sayHtml("<b>Host queue</b>:<br><br>" + html.join("<br>"), gameRoom);
		},
		aliases: ['hq'],
	},
	dehost: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice')) return;
			const id = Tools.toId(target);
			if (room.userHostedGame && room.userHostedGame.hostId === id) return this.run('endgame');
			const database = Storage.getDatabase(room);
			if (!database.userHostedGameQueue || !database.userHostedGameQueue.length) return this.sayError(['emptyUserHostedGameQueue']);
			let position = -1;
			for (let i = 0; i < database.userHostedGameQueue.length; i++) {
				if (database.userHostedGameQueue[i].id === id) {
					position = i;
					break;
				}
			}
			if (position === -1) return this.say(target.trim() + " is not in the host queue.");
			database.userHostedGameQueue.splice(position, 1);
			Storage.exportDatabase(room.id);
			this.say(target.trim() + " was removed from the host queue.");
			for (let i = position; i < database.userHostedGameQueue.length; i++) {
				if (!database.userHostedGameQueue[i]) break;
				const user = Users.get(database.userHostedGameQueue[i].name);
				if (user) user.say("You are now #" + (i + 1) + " in the host queue.");
			}
		},
		aliases: ['unhost'],
	},
	randompick: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id)) return;
			const choices: string[] = [];
			const targets = target.split(',');
			for (let i = 0; i < targets.length; i++) {
				if (Tools.toId(targets[i])) choices.push(targets[i].trim());
			}
			if (choices.length < 2) return this.say("You must specify at least 2 choices.");
			this.say("**Random pick:** " + Tools.sampleOne(choices));
		},
		aliases: ['rpick'],
	},
	gametimer: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const id = Tools.toId(target);
			if (id === 'off' || id === 'end') {
				if (!room.userHostedGame.gameTimer) return this.say("There is no game timer running.");
				clearTimeout(room.userHostedGame.gameTimer);
				room.userHostedGame.gameTimer = null;
				return this.say("The game timer has been turned off.");
			}
			let time: number;
			if (id.length === 1) {
				time = parseInt(id) * 60;
			} else {
				time = parseInt(id);
			}
			if (isNaN(time) || time > 600 || time < 5) return this.say("Please enter an amount of time between 5 seconds and 10 minutes.");
			time *= 1000;
			room.userHostedGame.gameTimer = setTimeout(() => {
				room.say("Time's up!");
				room.userHostedGame!.gameTimer = null;
			}, time);
			this.say("Game timer set for: " + Tools.toDurationString(time) + ".");
		},
		aliases: ['gtimer'],
	},
	gamecap: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			let game: Game | undefined;
			const cap = parseInt(target);
			if (room.game) {
				if (!user.hasRank(room, 'voice')) return;
				game = room.game;
			} else if (room.userHostedGame) {
				if (room.userHostedGame.hostId !== user.id) return;
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
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const users = [];
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const user = Users.get(targets[i].trim());
				if (!user) continue;
				if (!room.userHostedGame.players[user.id] || (room.userHostedGame.players[user.id] && room.userHostedGame.players[user.id].eliminated)) users.push(user);
			}
			if (!users.length) return this.say("Please specify at least one user who is not already in the game.");
			for (let i = 0; i < users.length; i++) {
				if (room.userHostedGame.players[users[i].id]) {
					room.userHostedGame.players[users[i].id].eliminated = false;
				} else {
					room.userHostedGame.createPlayer(users[i]);
				}
			}
			this.say("Added " + Tools.joinList(users.map(x => x.name)) + " to the player list.");
		},
		aliases: ['apl', 'addplayers'],
	},
	removeplayer: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const users: string[] = [];
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (id && room.userHostedGame.players[id] && !room.userHostedGame.players[id].eliminated) users.push(room.userHostedGame.players[id].name);
			}
			if (!users.length) return this.say("Please specify at least one player who is still in the game.");
			for (let i = 0; i < users.length; i++) {
				room.userHostedGame.destroyPlayer(users[i]);
			}
			if (cmd !== 'silentelim' && cmd !== 'selim' && cmd !== 'srpl') this.run('players');
		},
		aliases: ['srpl', 'rpl', 'silentelim', 'selim', 'elim', 'eliminate', 'eliminateplayer', 'removeplayers'],
	},
	shuffleplayers: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const temp: {[k: string]: Player} = {};
			const players = room.userHostedGame.shufflePlayers();
			if (!players.length) return this.say("The player list is empty.");
			for (let i = 0; i < players.length; i++) {
				temp[players[i].id] = players[i];
			}
			room.userHostedGame.players = temp;
			this.run('playerlist');
		},
		aliases: ['shufflepl', 'shuffle'],
	},
	playerlist: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id)) return;
				gameRoom = room;
			}
			const game = gameRoom.game || gameRoom.userHostedGame;
			if (!game) return;
			const remainingPlayers = game.getRemainingPlayerCount();
			if (!remainingPlayers) return this.say("**Players**: none");
			this.say("**Players (" + remainingPlayers + ")**: " + (game.points ? game.getPlayerPoints() : game.getPlayerNames()));
		},
		aliases: ['players', 'pl'],
	},
	clearplayerlist: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const users: string[] = [];
			for (const i in room.userHostedGame.players) {
				if (!room.userHostedGame.players[i].eliminated) users.push(room.userHostedGame.players[i].name);
			}
			if (!users.length) return this.say("The player list is empty.");
			this.run('removeplayer', users.join(", "));
		},
		aliases: ['clearplayers', 'clearpl'],
	},
	addpoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			if (!room.userHostedGame.started) return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			if (target.includes("|")) {
				this.runMultipleTargets("|");
				return;
			}
			const users: User[] = [];
			let points = 1;
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const target = Tools.toId(targets[i]);
				if (!target) continue;
				let user = Users.get(target);
				if (Tools.isInteger(target)) {
					points = Math.round(parseInt(target));
					if (points < 1) points = 1;
				} else {
					user = Users.get(targets[i]);
					if (user && user.rooms.has(room)) {
						if (room.userHostedGame.players[user.id] && room.userHostedGame.savedWinners && room.userHostedGame.savedWinners.includes(room.userHostedGame.players[user.id])) {
							return this.say("You cannot use this command on a saved winner.");
						}
						users.push(user);
					}
				}
			}
			if (!users.length) return this.say("Please specify at least one user in the room.");
			if (cmd === 'removepoints' || cmd === 'removepoint' || cmd === 'rpt') points *= -1;
			let reachedCap = 0;
			for (let i = 0; i < users.length; i++) {
				const player = room.userHostedGame.players[users[i].id] || room.userHostedGame.createPlayer(users[i]);
				if (player.eliminated) player.eliminated = false;
				let total = room.userHostedGame.points.get(player) || 0;
				total += points;
				room.userHostedGame.points.set(player, total);
				if (room.userHostedGame.scoreCap && total >= room.userHostedGame.scoreCap) reachedCap++;
			}
			if (!this.runningMultipleTargets) this.run('playerlist');
			if (reachedCap) user.say((reachedCap === 1 ? "A user has" : reachedCap + " users have") + " reached the score cap in your game.");
		},
		aliases: ['addpoints', 'removepoint', 'removepoints', 'apt', 'rpt'],
	},
	addpointall: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			if (!room.userHostedGame.started) return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			if (target && !Tools.isInteger(target)) return this.say("You must specify a valid number of points.");
			this.runningMultipleTargets = true;
			const newCmd = cmd === 'aptall' || cmd === 'addpointall' ? 'addpoint' : 'removepoint';
			const pointsString = target ? ", " + target : "";
			for (const i in room.userHostedGame.players) {
				const player = room.userHostedGame.players[i];
				if (player.eliminated) continue;
				let expiredUser = false;
				let user = Users.get(player.name);
				if (!user) {
					user = Users.add(player.name);
					expiredUser = true;
				}
				this.run(newCmd, player.name + pointsString);
				if (expiredUser) Users.remove(user);
			}
			this.runningMultipleTargets = false;
			this.run('playerlist');
		},
		aliases: ['aptall', 'rptall', 'removepointall'],
	},
	movepoint: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const targets = target.split(",");
			const from = Users.get(targets[0]);
			const to = Users.get(targets[1]);
			if (!from || !to || from === to) return this.say("You must specify 2 users.");
			if (!(from.id in room.userHostedGame.players)) return this.say(from.name + " is not in the game.");
			let fromPoints = room.userHostedGame.points.get(room.userHostedGame.players[from.id]);
			if (!fromPoints) return this.say(from.name + " does not have any points.");
			let amount: number;
			if (targets.length === 3) {
				amount = parseInt(targets[2]);
				if (isNaN(amount)) return this.say("Please specify a valid amount of points.");
				if (amount > fromPoints) amount = fromPoints;
			} else {
				amount = fromPoints;
			}
			const allPoints = amount === fromPoints;
			fromPoints -= amount;
			if (!fromPoints) {
				room.userHostedGame.points.delete(room.userHostedGame.players[from.id]);
			} else {
				room.userHostedGame.points.set(room.userHostedGame.players[from.id], fromPoints);
			}
			room.userHostedGame.createPlayer(to);
			let toPoints = room.userHostedGame.points.get(room.userHostedGame.players[to.id]) || 0;
			toPoints += amount;
			room.userHostedGame.points.set(room.userHostedGame.players[to.id], toPoints);
			this.say((allPoints ? "" : amount + " of ") + from.name + "'s points have been moved to " + to.name + ". Their total is now " + toPoints + ".");
		},
		aliases: ['mpt'],
	},
	scorecap: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
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
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			if (cmd === 'stored' || !target) {
				if (!room.userHostedGame.storedMessage) return this.say("You must store a message first with ``" + Config.commandCharacter + "store``.");
				if (room.userHostedGame.storedMessage.charAt(0) === Config.commandCharacter) {
					const parts = room.userHostedGame.storedMessage.split(" ");
					this.run(parts[0].substr(1), parts.slice(1).join(" "));
					return;
				}
				this.say(room.userHostedGame.storedMessage);
				return;
			}
			target = target.trim();
			if (target.charAt(0) === '/' || (target.charAt(0) === '!' && target.trim().split(" ")[0] !== '!pick')) return this.say("You cannot store a command.");
			room.userHostedGame.storedMessage = target;
			this.say("Your message has been stored. You can now repeat it with ``" + Config.commandCharacter + "stored``.");
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
			if (!gameRoom.userHostedGame || (!isPm && gameRoom.userHostedGame.hostId !== user.id)) return;
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
		command(target, room, user, cmd) {
			if (this.isPm(room)) return;
			if (!room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			if (!room.userHostedGame.savedWinners) room.userHostedGame.savedWinners = [];
			const targets = target.split(",");
			if (Config.maxUserHostedGameWinners && room.id in Config.maxUserHostedGameWinners) {
				const totalStored = room.userHostedGame.savedWinners.length + targets.length;
				if (totalStored > Config.maxUserHostedGameWinners[room.id]) return this.say("You cannot store more than " + Config.maxUserHostedGameWinners[room.id] + " winners.");
				if (totalStored === Config.maxUserHostedGameWinners[room.id]) return this.say("You will reach the maximum amount of winners. Please use ``" + Config.commandCharacter + "win``.");
			}
			const stored = [];
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (!(id in room.userHostedGame.players)) return this.say(targets[i].trim() + " is not in the game.");
				if (room.userHostedGame.savedWinners.includes(room.userHostedGame.players[id])) return this.say(room.userHostedGame.players[id].name + " has already been saved as a winner.");
				stored.push(id);
			}
			for (let i = 0; i < stored.length; i++) {
				const id = stored[i];
				room.userHostedGame.savedWinners.push(room.userHostedGame.players[id]);
				room.userHostedGame.points.delete(room.userHostedGame.players[id]);
				room.userHostedGame.players[id].eliminated = true;
			}
			this.run('playerlist');
		},
		aliases: ['savewinners', 'storewinner', 'storewinners'],
	},
	removewinner: {
		command(target, room, user, cmd) {
			if (this.isPm(room)) return;
			if (!room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const id = Tools.toId(target);
			if (!(id in room.userHostedGame.players)) return this.say(target.trim() + " is not in the game.");
			if (!room.userHostedGame.savedWinners) room.userHostedGame.savedWinners = [];
			const index = room.userHostedGame.savedWinners.indexOf(room.userHostedGame.players[id]);
			if (index === -1) return this.say(target.trim() + " has not been saved as a winner.");
			room.userHostedGame.savedWinners.splice(index, 1);
			room.userHostedGame.players[id].eliminated = false;
			this.run('playerlist');
		},
		aliases: ['removestoredwinner'],
	},
	winner: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
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
				for (const i in room.userHostedGame.players) {
					const player = room.userHostedGame.players[i];
					if (player.eliminated || !room.userHostedGame.points.has(player)) continue;
					const points = '' + room.userHostedGame.points.get(player);
					if (!(points in usersByPoints)) usersByPoints[points] = [];
					usersByPoints[points].push(player);
				}

				const sortedPoints = Object.keys(usersByPoints).sort((a, b) => parseInt(b) - parseInt(a));
				for (let i = 0; i < placesToWin; i++) {
					if (!sortedPoints[i]) break;
					players = players.concat(usersByPoints[sortedPoints[i]]);
				}
			} else {
				for (let i = 0; i < targets.length; i++) {
					const id = Tools.toId(targets[i]);
					if (!id) continue;
					if (id in room.userHostedGame.players) {
						const player = room.userHostedGame.players[id];
						if (!players.includes(player) && !(savedWinners && savedWinners.includes(player))) players.push(player);
					}
				}
			}

			if (savedWinners) players = players.concat(savedWinners);
			if (!players.length) return this.say(autoWin ? "No one has any points in this game." : "Please specify at least 1 player.");

			let playerDifficulty: GameDifficulty;
			if (Config.userHostedGamePlayerDifficulties && room.userHostedGame.format.id in Config.userHostedGamePlayerDifficulties) {
				playerDifficulty = Config.userHostedGamePlayerDifficulties[room.userHostedGame.format.id];
			} else if (Config.scriptedGameDifficulties && room.userHostedGame.format.id in Config.scriptedGameDifficulties) {
				playerDifficulty = Config.scriptedGameDifficulties[room.userHostedGame.format.id];
			} else {
				playerDifficulty = 'medium';
			}

			let playerBits: number;
			if (playerDifficulty === 'easy') {
				playerBits = 300;
			} else if (playerDifficulty === 'medium') {
				playerBits = 400;
			} else if (playerDifficulty === 'hard') {
				playerBits = 500;
			}

			if (room.userHostedGame.shinyMascot) playerBits! *= 2;

			for (let i = 0; i < players.length; i++) {
				Storage.addPoints(room, players[i].name, playerBits!, 'userhosted');
				players[i].say("You were awarded " + playerBits! + " bits! To see your total amount, use this command: ``" + Config.commandCharacter + "rank " + room.title + "``");
			}
			this.say("The winner" + (players.length === 1 ? " is" : "s are") + " " + players.map(x => x.name).join(", ") + "!");
			room.userHostedGame.end();
		},
		aliases: ['autowin', 'win'],
	},
	dt: {
		command(target, room, user) {
			if (!target || this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			const results = Dex.dataSearch(target, null, true);
			if (!results || !results.length) return this.say("No Pokemon, item, move, or ability named '" + target.trim() + "' was found.");
			this.say('!dt ' + results[0].name);
		},
	},
	randompokemon: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			if (!target) {
				const species = Dex.getExistingPokemon(Tools.sampleOne(Object.keys(Dex.data.pokedex))).species;
				if (this.pm) {
					this.say('Randomly generated Pokemon: **' + species + '**');
				} else {
					this.say('!dt ' + species);
				}
				return;
			}
			const targets = target.split(",");
			const types: string[] = [];
			let gen: number | undefined;
			let tier: string | undefined;
			let color: string | undefined;
			let ability: string | undefined;
			let eggGroup: string | undefined;
			for (let i = 0; i < targets.length; i++) {
				let id = Tools.toId(targets[i]);
				const targetAbility = Dex.getAbility(id);
				if (targetAbility) ability = targetAbility.name;
				if (id in Dex.tagNames) {
					tier = Dex.tagNames[id];
				} else if (id in Dex.data.colors) {
					color = Dex.data.colors[id];
				} else if (id in Dex.data.eggGroups) {
					eggGroup = Dex.data.eggGroups[id];
				} else if (id in Dex.data.types) {
					types.push(Dex.data.types[id]);
					if (types.length > 2) return this.say("A Pokemon can only have 2 types.");
				} else {
					if (id.startsWith('gen')) id = id.substr(3);
					if (Tools.isInteger(id)) gen = parseInt(id);
				}
			}
			const pokedex: string[] = [];
			const checkTypes = types.length;
			for (const i in Dex.data.pokedex) {
				const pokemon = Dex.getExistingPokemon(i);
				if (gen && pokemon.gen !== gen) continue;
				if (tier && pokemon.tier !== tier) continue;
				if (checkTypes) {
					if (!pokemon.types.includes(types[0])) continue;
					if (types[1] && !pokemon.types.includes(types[1])) continue;
				}
				if (ability) {
					let hasAbility = false;
					for (const i in pokemon.abilities) {
						// @ts-ignore
						if (pokemon.abilities[i] === ability) {
							hasAbility = true;
							break;
						}
					}
					if (!hasAbility) continue;
				}
				if (color && pokemon.color !== color) continue;
				if (eggGroup && !pokemon.eggGroups.includes(eggGroup)) continue;
				pokedex.push(pokemon.species);
			}
			if (!pokedex.length) return this.say("No matching Pokemon found.");
			const pokemon = Tools.sampleOne(pokedex);
			if (this.pm) {
				this.say('Randomly generated Pokemon: **' + pokemon + '**');
			} else {
				this.say('!dt ' + pokemon);
			}
		},
		aliases: ['rpoke', 'rpokemon', 'randpoke'],
	},
	randommove: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			const move = Dex.getExistingMove(Tools.sampleOne(Object.keys(Dex.data.moves))).name;
			if (this.pm) {
				this.say('Randomly generated move: **' + move + '**');
			} else {
				this.say('!dt ' + move);
			}
		},
		aliases: ['rmove', 'randmove'],
	},
	randomitem: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			const item = Dex.getExistingItem(Tools.sampleOne(Object.keys(Dex.data.items))).name;
			if (this.pm) {
				this.say('Randomly generated item: **' + item + '**');
			} else {
				this.say('!dt ' + item);
			}
		},
		aliases: ['ritem', 'randitem'],
	},
	randomability: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			const abilities = Object.keys(Dex.data.abilities);
			let ability = Dex.getExistingAbility(Tools.sampleOne(abilities));
			while (ability.id === 'noability') {
				ability = Dex.getExistingAbility(Tools.sampleOne(abilities));
			}
			if (this.pm) {
				this.say('Randomly generated ability: **' + ability.name + '**');
			} else {
				this.say('!dt ' + ability.name);
			}
		},
		aliases: ['rability', 'randability'],
	},
	randomtype: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			const types = Object.keys(Dex.data.typeChart);
			let type = Tools.sampleOne(types);
			if (Tools.random(2)) {
				types.splice(types.indexOf(type), 1);
				type += "/" + Tools.sampleOne(types);
			}
			this.say('Randomly generated type: **' + type + '**');
		},
		aliases: ['rtype', 'randtype'],
	},
	randomexistingtype: {
		command(target, room, user) {
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			let type = '';
			const pokedex = Tools.shuffle(Object.keys(Dex.data.pokedex));
			for (let i = 0; i < pokedex.length; i++) {
				const pokemon = Dex.getExistingPokemon(pokedex[i]);
				if (!pokemon.isNonstandard && !pokemon.forme) {
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
			if (this.isPm(room) || !Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.hostId === user.id))) return;
			this.say('Randomly generated character: **' + Tools.sampleOne(Dex.data.characters).trim() + '**');
		},
		aliases: ['rchar', 'rcharacter', 'randchar', 'randcharacters'],
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
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (target) return this.run('createtournament');
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				tournamentRoom = room;
			}

			if (!tournamentRoom.tournament) return this.say("A tournament is not in progress in this room.");
			const tournament = tournamentRoom.tournament;
			let html = "<b>" + tournament.name + " " + (tournament.isRoundRobin ? "Round Robin " : "") + "tournament</b><br />";
			if (tournament.started) {
				if (tournament.startTime) html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - tournament.startTime) + "<br />";
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
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);
			if (room.tournament) return this.say("There is already a tournament in progress in this room.");
			const format = Dex.getFormat(target);
			if (!format || !format.tournamentPlayable) return this.sayError(['invalidTournamentFormat', format ? format.name : target]);
			let playerCap: number = 0;
			if (Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
				playerCap = Config.defaultTournamentPlayerCaps[room.id];
			}
			this.sayCommand("/tour new " + format.name + ", elimination, " + playerCap);
		},
		aliases: ['createtour', 'ct'],
	},
	tournamentcap: {
		command(target, room, user) {
			if (this.isPm(room) || !room.tournament || room.tournament.started || !user.hasRank(room, 'driver')) return;
			const cap = parseInt(target);
			if (isNaN(cap)) return this.say("You must specify a valid player cap.");
			if (cap < Tournaments.minPlayerCap || cap > Tournaments.maxPlayerCap) return this.say("The tournament's player cap must be between " + Tournaments.minPlayerCap + " and " + Tournaments.maxPlayerCap + ".");
			if (room.tournament.adjustCapTimer) clearTimeout(room.tournament.adjustCapTimer);
			this.sayCommand("/tour cap " + cap);
			if (!room.tournament.playerCap) this.sayCommand("/tour autostart on");
			this.say("The tournament's player cap is now **" + cap + "**.");
		},
		aliases: ['tcap'],
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
			if (tournamentRoom.tournament.generator !== 1) return this.say("This command is currently only usable in Single Elimination tournaments.");
			const id = Tools.toId(targets[0]);
			if (!(id in tournamentRoom.tournament.players)) return this.say("'" + targets[0] + "' is not a player in the " + tournamentRoom.title + " tournament.");
			const targetPlayer = tournamentRoom.tournament.players[id];
			if (targetPlayer.eliminated) return this.say(targetPlayer.name + " has already been eliminated from the " + tournamentRoom.title + " tournament.");

			let currentBattle: IBattleData | undefined;
			for (let i = 0; i < tournamentRoom.tournament.currentBattles.length; i++) {
				if (tournamentRoom.tournament.currentBattles[i].playerA === targetPlayer || tournamentRoom.tournament.currentBattles[i].playerB === targetPlayer) {
					currentBattle = tournamentRoom.tournament.battleData[tournamentRoom.tournament.currentBattles[i].roomid];
					break;
				}
			}

			if (!currentBattle) return this.say(targetPlayer.name + " is not currently in a tournament battle.");
			const slots = Tools.shuffle(Object.keys(currentBattle.remainingPokemon));
			this.say("The score of " + targetPlayer.name + "'s current battle is " + (slots.length < 2 ? "not yet available" : currentBattle.remainingPokemon[slots[0]] + " - " + currentBattle.remainingPokemon[slots[1]]) + ".");
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
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				if (!(targetRoom.id in Tournaments.schedules)) return this.say("There is no tournament schedule for " + targetRoom.title + ".");
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				if (!(room.id in Tournaments.schedules)) return this.say("There is no tournament schedule for this room.");
				tournamentRoom = room;
			}

			const scheduledTournament = Tournaments.scheduledTournaments[tournamentRoom.id];
			const now = Date.now();
			let html = "<b>Next" + (this.pm ? " " + tournamentRoom.title : "") + " scheduled tournament</b>: " + scheduledTournament.format.name + "<br />";
			if (now > scheduledTournament.time) {
				html += "<b>Delayed</b><br />";
			} else {
				html += "<b>Starting in</b>: " + Tools.toDurationString(scheduledTournament.time - now) + "<br />";
			}

			if (scheduledTournament.format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(scheduledTournament.format);
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
				if (!user.hasRank(targetRoom, 'moderator')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'moderator')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				tournamentRoom = room;
			}
			const schedule = Tournaments.getTournamentScheduleHtml(tournamentRoom);
			if (!schedule) return this.say("No tournament schedule found for " + tournamentRoom.title + ".");
			this.sayCommand("!code " + schedule);
		},
		aliases: ['gettourschedule'],
	},
	queuetournament: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);
			const database = Storage.getDatabase(room);
			if (database.queuedTournament && !cmd.startsWith('force')) return this.say(Dex.getExistingFormat(database.queuedTournament.formatid, true).name + " is already queued for " + room.title + ".");
			if (target.includes('@@@')) return this.say("You must specify custom rules separately (``" + Config.commandCharacter + cmd + " format, cap, custom rules``).");
			const targets = target.split(',');
			const id = Tools.toId(targets[0]);
			let scheduled = false;
			let format: IFormat | null = null;
			if (id === 'scheduled' || id === 'official') {
				if (!(room.id in Tournaments.schedules)) return this.say("There is no tournament schedule for this room.");
				scheduled = true;
				format = Tournaments.scheduledTournaments[room.id].format;
			} else {
				if (room.id in Tournaments.scheduledTournaments && Date.now() > Tournaments.scheduledTournaments[room.id].time) return this.say("The scheduled tournament is delayed so you must wait until after it starts.");
				format = Dex.getFormat(targets[0]);
			}
			if (!format || !format.tournamentPlayable) return this.sayError(['invalidTournamentFormat', format ? format.name : target]);
			let playerCap: number = 0;
			if (scheduled) {
				if (Config.scheduledTournamentsMaxPlayerCap && Config.scheduledTournamentsMaxPlayerCap.includes(room.id)) playerCap = Tournaments.maxPlayerCap;
			} else if (targets.length > 1) {
				playerCap = parseInt(targets[1]);
				if (isNaN(playerCap)) return this.say("You must specify a valid number for the player cap.");
				if (playerCap && (playerCap < Tournaments.minPlayerCap || playerCap > Tournaments.maxPlayerCap)) {
					return this.say("You must specify a player cap between " + Tournaments.minPlayerCap + " and " + Tournaments.maxPlayerCap + ".");
				}
			}
			if (!playerCap && Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
				playerCap = Config.defaultTournamentPlayerCaps[room.id];
			}

			if (targets.length > 2) {
				if (scheduled) {
					if (format.customRules) return this.say("You cannot alter the custom rules of scheduled tournaments.");
					return this.say("You cannot add custom rules to scheduled tournaments.");
				}
				const customRules: string[] = [];
				for (let i = 2; i < targets.length; i++) {
					const rule = targets[i].trim();
					if (format.team && (rule.charAt(0) === '+' || rule.charAt(0) === '-')) return this.say("You currently cannot specify bans or unbans for formats with generated teams.");
					try {
						Dex.validateRule(rule, format);
					} catch (e) {
						return this.say(e.message);
					}
					customRules.push(rule);
				}
				format = Dex.getExistingFormat(format.name + "@@@" + customRules.join(','), true);
			}

			let time: number = 0;
			if (scheduled) {
				time = Tournaments.scheduledTournaments[room.id].time;
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

			database.queuedTournament = {formatid: format.name + (format.customRules ? '@@@' + format.customRules.join(',') : ''), playerCap, scheduled, time};
			if (scheduled) {
				Tournaments.setScheduledTournamentTimer(room);
			} else if (time) {
				Tournaments.setTournamentTimer(room, time, format, playerCap);
			}
			this.run('queuedtournament', '');
		},
		aliases: ['forcequeuetournament', 'forcenexttournament', 'forcenexttour'],
	},
	queuedtournament: {
		command(target, room, user) {
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				if (target) return this.run('queuetournament');
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			if (!database.queuedTournament) return this.say("There is no tournament queued for " + (this.pm ? tournamentRoom.title : "this room") + ".");
			const format = Dex.getExistingFormat(database.queuedTournament.formatid, true);
			let html = "<b>Queued" + (this.pm ? " " + tournamentRoom.title : "") + " tournament</b>: " + format.name + (database.queuedTournament.scheduled ? " <i>(scheduled)</i>" : "") + "<br />";
			if (database.queuedTournament.time) {
				const now = Date.now();
				if (now > database.queuedTournament.time) {
					html += "<b>Delayed</b><br />";
				} else {
					html += "<b>Starting in</b>: " + Tools.toDurationString(database.queuedTournament.time - now) + "<br />";
				}
			} else if (tournamentRoom.tournament) {
				html += "<b>Starting in</b>: " + Tools.toDurationString(Tournaments.queuedTournamentTime) + " after the " + tournamentRoom.tournament.name + " tournament ends<br />";
			}

			if (format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(format);
			this.sayHtml(html, tournamentRoom);
		},
		aliases: ['queuedtour', 'nexttournament', 'nexttour'],
	},
	pasttournaments: {
		command(target, room, user) {
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			if (!database.pastTournaments) return this.say("The past tournament list is empty.");
			this.say("**Past tournaments** (most recent first): " + Tools.joinList(database.pastTournaments) + ".");
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
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return this.sayError(['disabledTournamentFeatures', room.title]);
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			if (!targets[0]) {
				if (!database.lastTournamentTime) return this.say("No tournaments have been played in " + tournamentRoom.title + ".");
				return this.say("The last tournament in " + tournamentRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastTournamentTime) + "** ago.");
			}
			const format = Dex.getFormat(targets[0]);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!database.lastTournamentFormatTimes || !(format.id in database.lastTournamentFormatTimes)) return this.say(format.name + " has not been played in " + tournamentRoom.title + ".");
			this.say("The last " + format.name + " tournament in " + tournamentRoom.title + " ended **" + Tools.toDurationString(Date.now() - database.lastTournamentFormatTimes[format.id]) + "** ago.");
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
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			const challongeLink = Tools.getChallongeUrl(targets[1]);
			if (!challongeLink) return this.say("You must specify a valid Challonge link.");
			const bracketUrl = Tools.extractChallongeBracketUrl(challongeLink);
			if (targetRoom.approvedUserHostedTournaments && bracketUrl in targetRoom.approvedUserHostedTournaments) {
				if (user.id !== targetRoom.approvedUserHostedTournaments[bracketUrl].hostId) return this.say("The specified link has already been approved for " + targetRoom.approvedUserHostedTournaments[bracketUrl].hostName + ".");
				delete targetRoom.approvedUserHostedTournaments[bracketUrl];
			}

			if (targetRoom.newUserHostedTournaments) {
				for (const link in targetRoom.newUserHostedTournaments) {
					if (user.id === targetRoom.newUserHostedTournaments[link].hostId) return this.say("You are already on the waiting list for staff review.");
				}
			}
			const database = Storage.getDatabase(targetRoom);
			let authOrTHC = '';
			if ((Config.userHostedTournamentRanks && targetRoom.id in Config.userHostedTournamentRanks && user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) ||
				(database.thcWinners && user.id in database.thcWinners)) {
				authOrTHC = user.name;
			}
			Tournaments.newUserHostedTournament(targetRoom, user, bracketUrl, authOrTHC);
			if (authOrTHC) {
				this.say("You're free to advertise without using this command!");
			} else {
				this.say("A staff member will review your tournament as soon as possible!");
			}
		},
		aliases: ['gettourapproval'],
	},
	reviewuserhostedtour: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) || !user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;
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
				if (targetRoom!.newUserHostedTournaments![link] && !targetRoom!.newUserHostedTournaments![link].approvalStatus &&
					targetRoom!.newUserHostedTournaments![link].reviewer === user.id) {
					targetRoom!.newUserHostedTournaments![link].reviewer = '';
					Tournaments.showUserHostedTournamentApprovals(targetRoom!);
				}
			}, 10 * 60 * 1000);
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
	},
	approveuserhostedtour: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) || !user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;
			const link = targets[1].trim();
			if (!targetRoom.newUserHostedTournaments || !(link in targetRoom.newUserHostedTournaments)) return;
			if (!targetRoom.newUserHostedTournaments[link].reviewer) return this.say('You must first claim the tournament by clicking the "Review" button.');
			if (targetRoom.newUserHostedTournaments[link].reviewer !== user.id) {
				let name = targetRoom.newUserHostedTournaments[link].reviewer;
				const reviewer = Users.get(name);
				if (reviewer) name = reviewer.name;
				return this.say(name + " is currently the reviewer of " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament so they must approve or reject it.");
			}
			if (cmd === 'approveuserhostedtour') {
				targetRoom.newUserHostedTournaments[link].approvalStatus = "approved";
				if (targetRoom.newUserHostedTournaments[link].reviewTimer) clearTimeout(targetRoom.newUserHostedTournaments[link].reviewTimer!);
				if (!targetRoom.approvedUserHostedTournaments) targetRoom.approvedUserHostedTournaments = {};
				targetRoom.approvedUserHostedTournaments[link] = targetRoom.newUserHostedTournaments[link];
				delete targetRoom.newUserHostedTournaments[link];
				this.say("You have approved " + targetRoom.approvedUserHostedTournaments[link].hostName + "'s tournament.");
				const host = Users.get(targetRoom.approvedUserHostedTournaments[link].hostName);
				if (host) host.say(user.name + " has approved your tournament! You may now advertise in " + targetRoom.title + ".");
			} else {
				if (targetRoom.newUserHostedTournaments[link].approvalStatus === 'changes-requested') return this.say("Changes have already been requested for " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament.");
				targetRoom.newUserHostedTournaments[link].approvalStatus = 'changes-requested';
				this.say("You have rejected " + targetRoom.newUserHostedTournaments[link].hostName + "'s tournament. Be sure to PM them the reason(s) so that they can make the necessary changes!");
				const host = Users.get(targetRoom.newUserHostedTournaments[link].hostName);
				if (host) host.say(user.name + " has requested changes for your tournament. Please wait for them to PM you before advertising.");
			}
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
		aliases: ['rejectuserhostedtour'],
	},
	removeuserhostedtour: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom || !Config.userHostedTournamentRanks || !(targetRoom.id in Config.userHostedTournamentRanks) || !user.hasRank(targetRoom, Config.userHostedTournamentRanks[targetRoom.id].review)) return;
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
			if (Users.get(targets[0])) return this.say("You can only send messages to offline users.");
			const recipient = targets[0].trim();
			const recipientId = Tools.toId(recipient);
			if (recipientId === user.id || recipientId.startsWith('guest') || recipientId === 'constructor' || !Tools.isUsernameLength(recipient)) return this.say("You must specify a valid username (between 1 and " + Tools.maxUsernameLength + " characters).");
			const message = targets.slice(1).join(',').trim();
			if (!message.length) return this.say("You must specify a message to send.");
			const maxMessageLength = Storage.getMaxOfflineMessageLength(user, message);
			if (message.length > maxMessageLength) return this.say("Your message cannot exceed " + maxMessageLength + " characters.");
			if (!Storage.storeOfflineMessage(user.name, recipientId, message)) return this.say("Sorry, you have too many messages queued for " + recipient + ".");
			this.say("Your message has been sent to " + recipient + ".");
		},
		aliases: ['mail', 'offlinepm'],
	},
	offlinemessages: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Storage.retrieveOfflineMessages(user, true)) return this.say("You don't have any offline messages stored.");
		},
		aliases: ['readofflinemessages', 'checkofflinemessages', 'readmail', 'checkmail'],
	},
	clearofflinemessages: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Storage.clearOfflineMessages(user)) return this.say("You don't have any offline messages stored.");
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
			if (id.startsWith('guest') || id === 'constructor' || !Tools.isUsernameLength(id)) return this.say("You must specify a valid username (between 1 and " + Tools.maxUsernameLength + " characters).");
			const database = Storage.getGlobalDatabase();
			if (!database.lastSeen || !(id in database.lastSeen)) return this.say(target.trim() + " has not visited any of " + Users.self.name + "'s rooms in the past " + Storage.lastSeenExpirationDuration + ".");
			return this.say(target.trim() + " last visited one of " + Users.self.name + "'s rooms **" + Tools.toDurationString(Date.now() - database.lastSeen[id]) + "** ago.");
		},
		aliases: ['seen'],
	},
	addbits: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || ((!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) && (!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id))) ||
				!user.hasRank(room, 'voice')) return;
			if (target.includes("|")) {
				this.runMultipleTargets("|");
				return;
			}
			const targets = target.split(",");
			const users: string[] = [];
			const removeBits = cmd === 'removebits' || cmd === 'rbits';
			let customBits: number | null = null;
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (!id) continue;
				if (Tools.isInteger(id)) {
					customBits = parseInt(targets[i].trim());
				} else {
					users.push(targets[i]);
				}
			}

			if (!users.length) return this.say("You must specify at least 1 user to receive bits.");

			let bits = 100;
			let bitsLimit = 300;
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
					if (user && user.rooms.has(room)) user.say("You were awarded " + bits + " bits! To see your total amount, use this command: ``" + Config.commandCharacter + "rank " + room.title + "``");
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
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (Tools.isInteger(id)) {
					if (startPosition) return this.say("You can only specify 1 position on the leaderboard.");
					startPosition = parseInt(id);
				} else if (id === 'annual' || id === 'alltime') {
					annual = true;
				} else {
					const format = Dex.getFormat(targets[i]);
					if (format && format.effectType === 'Format') {
						if (source) return this.say("You can only specify 1 point source.");
						source = format;
					} else {
						const gameFormat = Games.getFormat(targets[i]);
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
				for (let i = 0; i < users.length; i++) {
					let points = 0;
					if (database.leaderboard[users[i]].sources[source.id]) points += database.leaderboard[users[i]].sources[source.id];
					if (database.leaderboard[users[i]].annualSources[source.id]) points += database.leaderboard[users[i]].annualSources[source.id];
					pointsCache[users[i]] = points;
				}
			} else if (annual) {
				for (let i = 0; i < users.length; i++) {
					pointsCache[users[i]] = database.leaderboard[users[i]].annual + database.leaderboard[users[i]].current;
				}
			} else if (source) {
				for (let i = 0; i < users.length; i++) {
					pointsCache[users[i]] = database.leaderboard[users[i]].sources[source.id] || 0;
				}
			} else {
				for (let i = 0; i < users.length; i++) {
					pointsCache[users[i]] = database.leaderboard[users[i]].current;
				}
			}

			users = users.filter(x => pointsCache[x] !== 0).sort((a, b) => pointsCache[b] - pointsCache[a]);
			if (!users.length) return this.say("The " + leaderboardRoom.title + " leaderboard is empty.");

			const output: string[] = [];
			let positions = 0;
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
				positions++;
				if (positions >= 10) break;
			}
			let endPosition = startPosition + 10;
			if (endPosition > users.length) endPosition = users.length;
			this.say("``" + (annual ? "Annual " : "") + (source ? source.name + " " : "") + "Top " + endPosition + " of " + users.length + "``: " + output.join(", "));
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
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (Tools.isInteger(id)) {
					if (position) return this.say("You can only specify 1 position on the leaderboard.");
					position = parseInt(id);
				} else {
					const format = Dex.getFormat(targets[i]);
					if (format && format.effectType === 'Format') {
						if (source) return this.say("You can only specify 1 point source.");
						source = format;
					} else {
						const gameFormat = Games.getFormat(targets[i]);
						if (!Array.isArray(gameFormat)) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						} else {
							targetUser = id;
						}
					}
				}
			}

			if (targetUser && position) return this.say("You can't specify both a username and a position.");

			const bits = (Config.allowScriptedGames && Config.allowScriptedGames.includes(targetRoom.id)) || (Config.allowUserHostedGames && Config.allowUserHostedGames.includes(targetRoom.id));
			const currentPointsCache: Dict<number> = {};
			const annualPointsCache: Dict<number> = {};
			if (source) {
				for (let i = 0; i < users.length; i++) {
					let annualPoints = 0;
					if (database.leaderboard[users[i]].sources[source.id]) annualPoints += database.leaderboard[users[i]].sources[source.id];
					if (database.leaderboard[users[i]].annualSources[source.id]) annualPoints += database.leaderboard[users[i]].annualSources[source.id];
					annualPointsCache[users[i]] = annualPoints;
					currentPointsCache[users[i]] = database.leaderboard[users[i]].sources[source.id] || 0;
				}
			} else {
				for (let i = 0; i < users.length; i++) {
					annualPointsCache[users[i]] = database.leaderboard[users[i]].annual + database.leaderboard[users[i]].current;
					currentPointsCache[users[i]] = database.leaderboard[users[i]].current;
				}
			}
			const current = users.filter(x => currentPointsCache[x] !== 0).sort((a, b) => currentPointsCache[b] - currentPointsCache[a]);
			const annual = users.filter(x => annualPointsCache[x] !== 0).sort((a, b) => annualPointsCache[b] - annualPointsCache[a]);

			const results: string[] = [];
			if (position) {
				const index = position - 1;
				if (current[index]) {
					results.push("#" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard is " + database.leaderboard[current[index]].name + " with " + (currentPointsCache[current[index]] || database.leaderboard[current[index]].current) + " " + (bits ? "bits" : "points") + ".");
				}
				if (annual[index]) {
					results.push("#" + position + " on the annual " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard is " + database.leaderboard[annual[index]].name + " with " + annualPointsCache[annual[index]] + " " + (bits ? "bits" : "points") + ".");
				}
				if (!results.length) return this.say("No one is #" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard.");
			} else {
				if (!targetUser) targetUser = user.id;
				const self = targetUser === user.id;
				const currentIndex = current.indexOf(targetUser);
				const annualIndex = annual.indexOf(targetUser);
				if (currentIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (currentIndex + 1) + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard with " + (currentPointsCache[targetUser] || database.leaderboard[targetUser].current) + " " + (bits ? "bits" : "points") + ".");
				}
				if (annualIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (annualIndex + 1) + " on the annual " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard with " + annualPointsCache[targetUser] + " " + (bits ? "bits" : "points") + ".");
				}
				if (!results.length) return this.say((self ? "You are" : database.leaderboard[targetUser] ? database.leaderboard[targetUser].name : targetUser + " is") + " not on the " + targetRoom.title + " " + (source ? source.name + " " : "") + "leaderboard.");
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
};

export = commands;
