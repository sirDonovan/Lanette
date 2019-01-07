import { ICommandDefinition } from "./command-parser";
import { Room } from "./rooms";

const commands: Dict<ICommandDefinition> = {
	eval: {
		command(target, room, user) {
			try {
				// tslint:disable-next-line no-eval
				let result = eval(target);
				if (result === undefined) {
					result = 'undefined';
				} else if (result === null) {
					result = 'null';
				} else if (typeof result !== 'string') {
					let globalModule = false;
					for (const i in global) {
						// @ts-ignore
						if (result === global[i]) {
							result = '[global ' + i + ']';
							globalModule = true;
							break;
						}
					}
					if (!globalModule) {
						if (result.effectType && typeof result.effectType === 'string') {
							result = '[' + result.effectType.toLowerCase() + ' ' + result.name + ']';
						} else {
							if (!result.toString()) return;
							result = result.toString();
						}
					}
				}
				this.say(result);
			} catch (e) {
				this.say(e.message);
				console.log(e.stack);
			}
		},
		aliases: ['js'],
		developerOnly: true,
	},
	reload: {
		command(target, room, user) {
			type ReloadableModules = 'tools' | 'commandparser' | 'commands' | 'config' | 'dex' | 'games' | 'tournaments';
			const modules: ReloadableModules[] = [];
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (id === 'tools') {
					modules.unshift(id);
				} else if (id === 'commandparser' || id === 'commands' || id === 'config' || id === 'dex' || id === 'games' || id === 'tournaments') {
					modules.push(id);
				} else {
					return this.say("Unknown module '" + targets[i].trim() + "'.");
				}
			}

			if (!modules.length) return;

			Tools.uncacheTree('./../build.js');
			this.say("Running tsc...");
			require('./../build.js')(() => {
				for (let i = 0; i < modules.length; i++) {
					if (modules[i] === 'tools') {
						Tools.uncacheTree('./tools');
						global.Tools = new (require('./tools').Tools)();
					} else if (modules[i] === 'commandparser') {
						Tools.uncacheTree('./command-parser');
						global.CommandParser = new (require('./command-parser').CommandParser)();
					} else if (modules[i] === 'commands') {
						Tools.uncacheTree('./commands');
						global.Commands = Object.assign(Object.create(null), CommandParser.loadCommands(require('./commands')));
						if (Games.loadedFormats) Games.loadFormatCommands();
					} else if (modules[i] === 'config') {
						Tools.uncacheTree('./config');
						global.Config = require('./config');
					} else if (modules[i] === 'dex') {
						Tools.uncacheTree('./dex');
						global.Dex = new (require('./dex').Dex)('base');
					} else if (modules[i] === 'games') {
						Tools.uncacheTree('./games');
						global.Games = new (require('./games').Games)();
					} else if (modules[i] === 'tournaments') {
						Tools.uncacheTree('./tournaments');
						global.Tournaments = new (require('./tournaments').Tournaments)();
					}
				}
				this.say("Successfully reloaded: " + modules.join(", "));
			}, () => this.say("Failed to build files."));
		},
		aliases: ['hotpatch'],
		developerOnly: true,
	},
	creategame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+') || room.game || room.userHostedGame) return;
			if (!Config.allowScriptedGames.includes(room.id)) return this.say("Scripted games are not enabled for this room.");
			if (Users.self.rooms.get(room) !== '*') return this.say(Users.self.name + " requires Bot rank (*) to host scripted games.");
			const format = Games.getFormat(target, user);
			if (!format) return;
			const game = Games.createGame(room, format);
			game.signups();
		},
		aliases: ['cg'],
	},
	startgame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+')) return;
			if (room.game) {
				if (room.game.started) return;
				room.game.start();
			} else if (room.userHostedGame) {
				if (user.id !== room.userHostedGame.hostId) return;
				room.userHostedGame.start();
			}
		},
		aliases: ['sg'],
	},
	endgame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+')) return;
			if (room.game) {
				room.game.forceEnd(user);
			} else if (room.userHostedGame) {
				room.userHostedGame.forceEnd(user);
			}
		},
	},
	joingame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (!target) return;
				const chatRoom = Rooms.get(target);
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
				room.userHostedGame.removePlayer(user);
			}
		},
		aliases: ['lg'],
	},
	game: {
		command(target, room, user) {
			let gameRoom: Room;
			if (this.isPm(room)) {
				if (!target) target = 'gamecorner';
				const targetRoom = Rooms.get(Tools.toId(target));
				if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
				if (!this.canPmHtml(targetRoom)) return;
				gameRoom = targetRoom;
			} else {
				if (!user.hasRank(room, '+')) return;
				gameRoom = room;
			}
			if (gameRoom.game) {
				const game = gameRoom.game;
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot) : "") + " <b>" + game.nameWithOptions + "</b><br />";
				if (game.started) {
					html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - game.startTime) + "<br />";
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot) : "") + " <b>" + game.nameWithOptions + "</b><br />";
				html += "<b>Remaining time</b>: " + Tools.toDurationString(game.endTime - Date.now()) + "<br />";
				if (game.started) {
					html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - game.startTime) + "<br />";
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
	host: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+') || room.game) return;
			if (!Config.allowScriptedGames.includes(room.id)) return this.say("Scripted games are not enabled for this room.");
			if (Users.self.rooms.get(room) !== '*') return this.say(Users.self.name + " requires Bot rank (*) to start user-hosted games.");
			const targets = target.split(",");
			const host = Users.get(targets[0]);
			if (!host || !host.rooms.has(room)) return this.say("Please specify a user currently in this room.");
			targets.shift();
			const format = Games.getUserHostedFormat(targets.join(","), user);
			if (!format) return;
			const game = Games.createUserHostedGame(room, format, host);
			game.signups();
		},
	},
};

export = commands;
