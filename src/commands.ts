import { ICommandDefinition } from "./command-parser";
import { Player } from "./room-activity";
import { Room } from "./rooms";
import { IGameFormat } from "./types/games";
import { IFormat } from "./types/in-game-data-types";
import { User } from "./users";

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
	reload: {
		command(target, room, user) {
			type ReloadableModules = 'tools' | 'commandparser' | 'commands' | 'config' | 'dex' | 'games' | 'storage' | 'tournaments';
			const modules: ReloadableModules[] = [];
			const targets = target.split(",");
			for (let i = 0; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (id === 'tools') {
					modules.unshift(id);
				} else if (id === 'commandparser' || id === 'commands' || id === 'config' || id === 'dex' || id === 'games' || id === 'storage' || id === 'tournaments') {
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
					} else if (modules[i] === 'storage') {
						const databaseCache = Storage.databaseCache;
						const loadedDatabases = Storage.loadedDatabases;
						Tools.uncacheTree('./storage');
						global.Storage = new (require('./storage').Storage)();
						Storage.databaseCache = databaseCache;
						Storage.loadedDatabases = loadedDatabases;
					} else if (modules[i] === 'tournaments') {
						const scheduledTournaments = Tournaments.scheduledTournaments;
						const tournamentTimers = Tournaments.tournamentTimers;
						Tools.uncacheTree('./tournaments');
						global.Tournaments = new (require('./tournaments').Tournaments)();
						Tournaments.scheduledTournaments = scheduledTournaments;
						Tournaments.tournamentTimers = tournamentTimers;
						const now = Date.now();
						Users.self.rooms.forEach((rank, room) => {
							if (room.id in Tournaments.schedules && (!(room.id in Tournaments.scheduledTournaments) || now < Tournaments.scheduledTournaments[room.id].time)) Tournaments.setScheduledTournament(room);
						});
					}
				}
				this.say("Successfully reloaded: " + modules.join(", "));
			}, () => this.say("Failed to build files."));
		},
		aliases: ['hotpatch'],
		developerOnly: true,
	},

	/**
	 * Game commands
	 */
	creategame: {
		command(target, room, user) {
			if (this.isPm(room) || !Games.canCreateGame(room, user)) return;
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
			if (this.isPm(room)) {
				if (room.game) {
					room.game.forceEnd(user);
				}
			} else {
				if (!user.hasRank(room, '+')) return;
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot) : "") + "<b>" + game.nameWithOptions + "</b><br />";
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
				let html = (game.mascot ? Dex.getPokemonIcon(game.mascot, true) : "") + "<b>" + game.nameWithOptions + "</b><br />";
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
	addpoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const users: User[] = [];
			let points = 1;
			const targets = target.split(",");
			for (let i = 0, len = targets.length; i < len; i++) {
				const target = Tools.toId(targets[i]);
				if (!target) continue;
				let user = Users.get(target);
				if (Tools.isNumber(target)) {
					points = Math.round(parseInt(target));
					if (points < 1) points = 1;
				} else {
					user = Users.get(targets[i]);
					if (user) users.push(user);
				}
			}
			if (!users.length) return this.say("Please specify at least one user.");
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
			if (reachedCap) user.say((reachedCap === 1 ? "A user has" : reachedCap + " users have") + " reached the score cap in your game!");
		},
		aliases: ['addpoints', 'removepoint', 'removepoints', 'apt', 'rpt'],
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
	winner: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || room.userHostedGame.hostId !== user.id) return;
			const targets = target.split(",");
			let players: Player[] = [];
			let bits = 100;
			let multiplier: number | null = null;
			let placesToWin = 1;
			if (cmd === 'autowin') {
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

				if (!players.length) return this.say("No one has any points in this game.");
			} else {
				for (let i = 0, len = targets.length; i < len; i++) {
					const id = Tools.toId(targets[i]);
					if (!id) continue;
					if (Tools.isNumber(id)) {
						multiplier = parseFloat(targets[i].trim());
					} else {
						if (id in room.userHostedGame.players) {
							if (!players.includes(room.userHostedGame.players[id])) players.push(room.userHostedGame.players[id]);
						}
					}
				}

				if (!players.length) return this.say("Please specify at least 1 user who is in the room.");
			}

			if (multiplier) {
				if (multiplier > 3) {
					multiplier = 3;
				} else if (multiplier < 1) {
					multiplier = 1;
				}
			} else {
				multiplier = 2.5;
			}

			bits = Math.ceil(bits * multiplier);

			for (let i = 0; i < players.length; i++) {
				Storage.addPoints(room, players[i].name, bits, 'userhosted');
				players[i].say("You were awarded " + bits + "bits! To see your total amount, use the command ``" + Config.commandCharacter + "bits``");
			}
			this.say("The winner" + (players.length === 1 ? " is" : "s are") + " " + players.map(x => x.name).join(", ") + "! Thanks for hosting.");
			room.userHostedGame.end();
		},
		aliases: ['autowin', 'win'],
	},

	/**
	 * Tournament commands
	 */

	tournament: {
		command(target, room, user) {
			const targets: string[] = target ? target.split(",") : [];
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.get(Tools.toId(targets[0]));
				if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
				if (!Config.allowTournaments.includes(targetRoom.id)) return this.say("Tournament features are not enabled for " + targetRoom.id + ".");
				if (!this.canPmHtml(targetRoom)) return;
				tournamentRoom = targetRoom;
			} else {
				if (target) return this.run('createtournament');
				if (!user.hasRank(room, '+')) return;
				if (!Config.allowTournaments.includes(room.id)) return this.say("Tournament features are not enabled for this room.");
				tournamentRoom = room;
			}

			if (!tournamentRoom.tournament) return this.say("A tournament is not in progress in this room.");
			const tournament = tournamentRoom.tournament;
			let html = "<b>" + tournament.name + " " + (tournament.isRoundRobin ? "Round Robin " : "") + "tournament</b><br />";
			if (tournament.started) {
				html += "<b>Duration</b>: " + Tools.toDurationString(Date.now() - tournament.startTime) + "<br />";
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
			if (this.isPm(room) || !Tournaments.canCreateTournaments(room, user)) return;
			if (room.tournament) return this.say("There is already a tournament in progress in this room.");
			const format = Dex.getFormat(target);
			if (!format || !format.tournamentPlayable) return this.say("'" + target + "' is not a valid tournament format.");
			this.sayCommand("/tour new " + format.name + ", elimination, " + Tournaments.defaultCap);
		},
		aliases: ['createtour', 'ct'],
	},
	scheduledtournament: {
		command(target, room, user) {
			const targets: string[] = target ? target.split(",") : [];
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.get(Tools.toId(targets[0]));
				if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
				if (!Config.allowTournaments.includes(targetRoom.id)) return this.say("Tournament features are not enabled for " + targetRoom.id + ".");
				if (!this.canPmHtml(targetRoom)) return;
				if (!(targetRoom.id in Tournaments.schedules)) return this.say("There is no tournament schedule for " + targetRoom.id + ".");
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, '+')) return;
				if (!Config.allowTournaments.includes(room.id)) return this.say("Tournament features are not enabled for this room.");
				if (!(room.id in Tournaments.schedules)) return this.say("There is no tournament schedule for this room.");
				tournamentRoom = room;
			}

			const scheduledTournament = Tournaments.scheduledTournaments[tournamentRoom.id];
			const now = Date.now();
			let html = "<b>Next" + (this.pm ? " " + tournamentRoom.id : "") + " scheduled tournament</b> ";
			if (now > scheduledTournament.time) {
				html += ": delayed<br />";
			} else {
				html += "starting in: " + Tools.toDurationString(scheduledTournament.time - now) + "<br />";
			}
			html += "<b>Format</b>: " + scheduledTournament.format.name;
			if (scheduledTournament.format.customRules) {
				html += "<br /><b>Custom rules:</b><br />";
				if (!scheduledTournament.format.separatedCustomRules) scheduledTournament.format.separatedCustomRules = Dex.separateCustomRules(scheduledTournament.format.customRules);
				if (scheduledTournament.format.separatedCustomRules.bans.length) html += "&nbsp;&nbsp;&nbsp;&nbsp;Bans: " + scheduledTournament.format.separatedCustomRules.bans.join(", ");
				if (scheduledTournament.format.separatedCustomRules.unbans.length) html += "&nbsp;&nbsp;&nbsp;&nbsp;Unbans: " + scheduledTournament.format.separatedCustomRules.unbans.join(", ");
				if (scheduledTournament.format.separatedCustomRules.addedrules.length) html += "&nbsp;&nbsp;&nbsp;&nbsp;Added rules: " + scheduledTournament.format.separatedCustomRules.addedrules.join(", ");
				if (scheduledTournament.format.separatedCustomRules.removedrules.length) html += "&nbsp;&nbsp;&nbsp;&nbsp;Removed rules: " + scheduledTournament.format.separatedCustomRules.removedrules.join(", ");
			}
			this.sayHtml(html, tournamentRoom);
		},
		aliases: ['scheduledtour', 'officialtournament', 'officialtour', 'official'],
	},
	gettournamentschedule: {
		command(target, room, user) {
			const targets: string[] = target ? target.split(",") : [];
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.get(Tools.toId(targets[0]));
				if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
				if (!user.hasRank(targetRoom, '@')) return;
				if (!Config.allowTournaments.includes(targetRoom.id)) return this.say("Tournament features are not enabled for " + targetRoom.id + ".");
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, '@')) return;
				if (!Config.allowTournaments.includes(room.id)) return this.say("Tournament features are not enabled for this room.");
				tournamentRoom = room;
			}
			const schedule = Tournaments.getTournamentScheduleHtml(tournamentRoom);
			if (!schedule) return this.say("No tournament schedule found for " + tournamentRoom.id);
			this.sayCommand("!code " + schedule);
		},
		aliases: ['gettourschedule'],
	},

	/**
	 * Storage commands
	 */
	leaderboard: {
		command(target, room, user) {
			const targets: string[] = target ? target.split(",") : [];
			let leaderboardRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.get(Tools.toId(targets[0]));
				if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
				leaderboardRoom = targetRoom;
			} else {
				if (!user.hasRank(room, '+')) return;
				leaderboardRoom = room;
			}
			const database = Storage.getDatabase(leaderboardRoom);
			if (!database.leaderboard) return this.say("There is no leaderboard for the " + leaderboardRoom.id + " room.");
			const users = Object.keys(database.leaderboard);
			if (!users.length) return this.say("The " + leaderboardRoom.id + " leaderboard is empty.");
			let startPosition = 0;
			let source: IFormat | IGameFormat | undefined;
			let annual = false;
			for (let i = 1; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (Tools.isNumber(id)) {
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
						if (gameFormat) {
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
			users.sort((a, b) => pointsCache[b] - pointsCache[a]);

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
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets: string[] = target ? target.split(',') : [];
			const targetRoom = Rooms.get(Tools.toId(targets[0]));
			if (!targetRoom) return this.say("You must specify one of " + Users.self.name + "'s rooms.");
			const database = Storage.getDatabase(targetRoom);
			if (!database.leaderboard) return this.say("There is no leaderboard for the " + targetRoom.id + " room.");
			const users = Object.keys(database.leaderboard);
			if (!users.length) return this.say("The " + targetRoom.id + " leaderboard is empty.");
			let targetUser = '';
			let position = 0;
			let source: IFormat | IGameFormat | undefined;
			for (let i = 1; i < targets.length; i++) {
				const id = Tools.toId(targets[i]);
				if (Tools.isNumber(id)) {
					if (position) return this.say("You can only specify 1 position on the leaderboard.");
					position = parseInt(id);
				} else {
					const format = Dex.getFormat(targets[i]);
					if (format && format.effectType === 'Format') {
						if (source) return this.say("You can only specify 1 point source.");
						source = format;
					} else {
						const gameFormat = Games.getFormat(targets[i]);
						if (gameFormat) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						} else {
							targetUser = id;
						}
					}
				}
			}

			if (targetUser && position) return this.say("You can't specify both a username and a position.");

			const bits = Config.allowScriptedGames.includes(targetRoom.id);
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
			const current = users.slice().sort((a, b) => currentPointsCache[b] - currentPointsCache[a]);
			const annual = users.slice().sort((a, b) => annualPointsCache[b] - annualPointsCache[a]);

			const results: string[] = [];
			if (position) {
				const index = position - 1;
				if (current.length <= position) {
					results.push("#" + position + " on the " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard is " + database.leaderboard[current[index]].name + " with " + (currentPointsCache[current[index]] || database.leaderboard[current[index]].current) + " " + (bits ? "bits" : "points") + ".");
				}
				if (annual.length <= position) {
					results.push("#" + position + " on the annual " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard is " + database.leaderboard[annual[index]].name + " with " + annualPointsCache[annual[index]] + " " + (bits ? "bits" : "points") + ".");
				}
				if (!results.length) return this.say("No one is #" + position + " on the " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard.");
			} else {
				if (!targetUser) targetUser = user.id;
				const self = targetUser === user.id;
				const currentIndex = current.indexOf(targetUser);
				const annualIndex = annual.indexOf(targetUser);
				if (currentIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (currentIndex + 1) + " on the " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard with " + (currentPointsCache[targetUser] || database.leaderboard[targetUser].current) + " " + (bits ? "bits" : "points") + ".");
				}
				if (annualIndex !== -1) {
					results.push((self ? "You are" : database.leaderboard[targetUser].name + " is") + " #" + (annualIndex + 1) + " on the annual " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard with " + annualPointsCache[targetUser] + " " + (bits ? "bits" : "points") + ".");
				}
				if (!results.length) return this.say((self ? "You are" : database.leaderboard[targetUser].name + " is") + " not on the " + targetRoom.id + " " + (source ? source.name + " " : "") + "leaderboard.");
			}
			this.say(results.join(" "));
		},
		aliases: ['points', 'bits'],
	},
};

export = commands;
