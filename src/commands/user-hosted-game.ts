import type { Player } from "../room-activity";
import type { ScriptedGame } from "../room-game-scripted";
import type { UserHostedGame } from "../room-game-user-hosted";
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { GameDifficulty } from "../types/games";
import type { IUserHostedGameStats, UserHostStatus } from "../types/storage";
import type { User } from "../users";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const commands: BaseCommandDefinitions = {
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
			if (approvedHost && user !== host) return user.say("You are only able to use this command on yourself as approved host.");
			if (!host || !host.rooms.has(room)) return this.say("Please specify a user currently in this room.");
			if (host.isBot(room)) return this.say("You cannot use this command on a user with Bot rank.");

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

			if (room.userHostedGame) {
				if (room.userHostedGame.isHost(host)) {
					return this.say(host.name + " is currently hosting.");
				}
				if (room.userHostedGame.format.id === format.id) {
					return this.say((room.userHostedGame.subHostName ? room.userHostedGame.subHostName : room.userHostedGame.hostName) +
						" is currently hosting " + room.userHostedGame.format.name + ". " + host.name + " please choose a " +
						"different game!");
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
				const host = Users.get(database.userHostedGameQueue[i].name);
				if (host) name = host.name;
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
				this.run('endgame');
				return;
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
				const host = Users.get(database.userHostedGameQueue[i].name);
				if (host) host.say("You are now #" + (i + 1) + " in the host queue.");
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
			if (status === 'unapproved' || status === 'novice' || status === 'approved') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
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
						const divider = 3;
						if (remainingMinutes <= divider) {
							return this.say("You cannot generate a random minutes timer when there are less than " + divider + " minutes " +
								"remaining.");
						}
						minimumTime = 1;
						maximumTime = Math.ceil(remainingMinutes / divider);
					}
				}

				if (minimumTime > maximumTime) {
					const larger = minimumTime;
					minimumTime = maximumTime;
					maximumTime = larger;
				}

				while (time < minimumTime || time > maximumTime) {
					time = room.userHostedGame.random(maximumTime) + 1;
				}

				if (isSeconds) {
					time *= 1000;
				} else {
					time *= 60 * 1000;
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
			if (game.playerCount >= cap) {
				this.run('startgame');
				return;
			}
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
			for (const name of targets) {
				const targetUser = Users.get(name);
				if (!targetUser || !targetUser.rooms.has(room)) {
					usersNotInRoom.push(name.trim());
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
				if (targetUser.id in room.userHostedGame.players) {
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
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const players: string[] = [];
			const targets = target.split(",");
			for (const name of targets) {
				const id = Tools.toId(name);
				if (id && id in room.userHostedGame.players && !room.userHostedGame.players[id].eliminated) {
					players.push(room.userHostedGame.players[id].name);
				}
			}
			if (!players.length) return this.say("Please specify at least one player who is still in the game.");

			for (const player of players) {
				room.userHostedGame.destroyPlayer(player);
			}

			// @ts-expect-error
			if (room.userHostedGame.started) room.userHostedGame.round++;
			if (cmd !== 'silentelim' && cmd !== 'selim' && cmd !== 'srpl') this.run('players');
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
			for (const name of targets) {
				const targetUser = Users.get(name);
				if (!targetUser || !targetUser.rooms.has(room)) {
					usersNotInRoom.push(name.trim());
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
				if (targetUser.id in room.userHostedGame.players) {
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
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (room.userHostedGame.teams) {
				for (const i in room.userHostedGame.teams) {
					room.userHostedGame.teams[i].shufflePlayers();
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
			this.run('playerlist');
		},
		aliases: ['shufflepl'],
	},
	splitplayers: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.started) {
				return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			}
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
			this.run('playerlist');
		},
		aliases: ['splitpl'],
	},
	unsplitplayers: {
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.teams) return this.say("Teams have not yet been formed.");

			room.userHostedGame.unSplitPlayers();
			this.run('playerlist');
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
		command(target, room, user) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const users: string[] = [];
			for (const i in room.userHostedGame.players) {
				if (!room.userHostedGame.players[i].eliminated) users.push(room.userHostedGame.players[i].name);
			}
			if (!users.length) return this.say("The player list is empty.");
			this.run('removeplayer', users.join(", "));
		},
		aliases: ['clearplayers', 'clearpl'],
	},
	addgamepoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.started) {
				return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			}
			if (target.includes("|")) {
				this.runMultipleTargets("|", cmd);
				return;
			}

			const users: User[] = [];
			const usersNotOnTeams: string[] = [];
			const usersNotInRoom: string[] = [];
			const savedWinners: string[] = [];
			const teamNames: string[] = [];

			let points = 1;
			const targets = target.split(",");
			for (const name of targets) {
				const id = Tools.toId(name);
				if (!id) continue;

				if (Tools.isInteger(id)) {
					points = Math.round(parseInt(id));
					if (points < 1) points = 1;
				} else {
					if (id in room.userHostedGame.players && room.userHostedGame.savedWinners.includes(room.userHostedGame.players[id])) {
						savedWinners.push(room.userHostedGame.players[id].name);
						continue;
					}

					const targetUser = Users.get(name);
					if (!targetUser || !targetUser.rooms.has(room)) {
						if (!targetUser && room.userHostedGame.teams && id in room.userHostedGame.teams) {
							teamNames.push(id);
						} else {
							usersNotInRoom.push(targetUser ? targetUser.name : name.trim());
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
				this.run('addteampoint', target);
				return;
			}

			if (!users.length) return this.say("Please specify at least one user.");

			if (cmd.startsWith('r')) points *= -1;
			const reachedCap: string[] = [];
			for (const otherUser of users) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				const player = room.userHostedGame.players[otherUser.id] || room.userHostedGame.createPlayer(otherUser);
				if (player.eliminated) player.eliminated = false;
				const total = room.userHostedGame.addPoints(player, points);
				if (room.userHostedGame.scoreCap) {
					if (room.userHostedGame.teams) {
						if (player.team!.points >= room.userHostedGame.scoreCap && !reachedCap.includes(player.team!.id)) {
							reachedCap.push(player.team!.id);
						}
					} else {
						if (total >= room.userHostedGame.scoreCap && !reachedCap.includes(player.id)) reachedCap.push(player.id);
					}
				}
			}

			// @ts-expect-error
			room.userHostedGame.round++;
			if (!this.runningMultipleTargets) this.run('playerlist');
			if (reachedCap.length) {
				const reached = room.userHostedGame.teams ? "team" : "user";
				user.say((reachedCap.length === 1 ? "A " + reached + " has" : reachedCap + " " + reached + "s have") + " reached the " +
					"score cap in your game.");
			}
		},
		aliases: ['addgamepoint', 'removegamepoints', 'removegamepoint'],
	},
	addpointall: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (!room.userHostedGame.started) {
				return this.say("You must first start the game with ``" + Config.commandCharacter + "startgame``.");
			}
			if (target && !Tools.isInteger(target)) return this.say("You must specify a valid number of points.");
			this.runningMultipleTargets = true;
			const newCmd = cmd.startsWith('r') ? 'removegamepoint' : 'addgamepoint';
			const pointsString = target ? ", " + target : "";
			for (const i in room.userHostedGame.players) {
				if (room.userHostedGame.players[i].eliminated) continue;
				const player = room.userHostedGame.players[i];
				let expiredUser = false;
				let playerUser = Users.get(player.name);
				if (!playerUser) {
					playerUser = Users.add(player.name, player.id);
					expiredUser = true;
				}
				this.run(newCmd, player.name + pointsString);
				if (expiredUser) Users.remove(playerUser);
			}
			this.runningMultipleTargets = false;
			this.run('playerlist');
		},
		aliases: ['aptall', 'rptall', 'removepointall'],
	},
	addteampoints: {
		command(target, room, user, cmd) {
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
			this.run(cmd.startsWith('r') ? 'removepoint' : 'addpoint', player.name + ',' + points);
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

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			if (cmd === 'stored' || !target) {
				if (!room.userHostedGame.storedMessages) {
					return this.say("You must store a message first with ``" + Config.commandCharacter + "store [message]`` or " +
						"``" + Config.commandCharacter + "storem [key], [message]``.");
				}
				const key = Tools.toId(target);
				if (!(key in room.userHostedGame.storedMessages)) {
					return this.say("'" + target + "' is not one of your stored keys.");
				}
				if (CommandParser.isCommandMessage(room.userHostedGame.storedMessages[key])) {
					const parts = room.userHostedGame.storedMessages[key].split(" ");
					this.run(parts[0].substr(1), parts.slice(1).join(" "));
					return;
				}
				this.say(room.userHostedGame.storedMessages[key]);
				return;
			}

			const targets = target.split(",");
			let key = "";
			let keyId = "";
			if (cmd === 'storemultiple' || cmd === 'storem') {
				key = targets[0].trim();
				keyId = Tools.toId(key);
				if (!keyId) return this.say("Your message's key cannot be empty!");
				targets.shift();
			}

			const message = targets.join(",").trim();
			if (!message) return this.say("You cannot store a blank message!");

			const possibleCommand = message.split(" ")[0];

			if (message.startsWith('/') || (message.startsWith('!') && possibleCommand !== '!pick')) {
				return this.say("You cannot store a server command.");
			}

			if (CommandParser.isCommandMessage(message) && !(Tools.toId(possibleCommand) in BaseCommands)) {
				return this.say("'" + possibleCommand + "' is not a valid " + Users.self.name + " command for " +
					Config.commandCharacter + "store.");
			}

			if (!room.userHostedGame.storedMessages) room.userHostedGame.storedMessages = {};
			room.userHostedGame.storedMessages[keyId] = message;
			this.say("Your message has been stored! You can now repeat it with ``" + Config.commandCharacter + "stored" +
				(key ? " " + key : "") + "``.");
		},
		aliases: ['stored', 'storemultiple', 'storem'],
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
		command(target, room, user) {
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
			for (const name of targets) {
				const id = Tools.toId(name);
				if (!(id in room.userHostedGame.players)) return this.say(this.sanitizeResponse(name.trim() + " is not in the game."));
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

			this.run('playerlist');
		},
		aliases: ['savewinners', 'storewinner', 'storewinners'],
	},
	removewinner: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (!room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const id = Tools.toId(target);
			if (!(id in room.userHostedGame.players)) return this.say(this.sanitizeResponse(target.trim() + " is not in the game."));
			const index = room.userHostedGame.savedWinners.indexOf(room.userHostedGame.players[id]);
			if (index === -1) return this.say(this.sanitizeResponse(target.trim() + " has not been saved as a winner."));
			room.userHostedGame.savedWinners.splice(index, 1);
			room.userHostedGame.players[id].eliminated = false;
			this.run('playerlist');
		},
		aliases: ['removestoredwinner'],
	},
	winner: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.userHostedGame || !room.userHostedGame.isHost(user)) return;
			const targets = target.split(",");
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
				for (const name of targets) {
					const id = Tools.toId(name);
					if (!id) continue;
					if (room.userHostedGame.teams) {
						if (!(id in room.userHostedGame.teams)) continue;
						for (const player of room.userHostedGame.teams[id].players) {
							if (!player.eliminated && !players.includes(player)) players.push(player);
						}
					} else {
						if (id in room.userHostedGame.players) {
							const player = room.userHostedGame.players[id];
							if (!players.includes(player) && !room.userHostedGame.savedWinners.includes(player)) players.push(player);
						}
					}
				}
			}

			players = players.concat(room.userHostedGame.savedWinners);
			if (!players.length) {
				return this.say(autoWin ? "No one has any points in this game." : "Please specify at least 1 " +
					(room.userHostedGame.teams ? "team" : "player") + ".");
			}

			if (Config.rankedGames && Config.rankedGames.includes(room.id)) {
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
					Storage.addPoints(room, Storage.gameLeaderboard, player.name, playerBits, 'userhosted');
					player.say("You were awarded " + playerBits + " bits! To see your total amount, use this command: ``" +
						Config.commandCharacter + "bits " + room.title + "``");
				}
			}

			for (const player of players) {
				const points = room.userHostedGame.points.get(player) || 1;
				room.userHostedGame.winners.set(player, points);
			}
			room.userHostedGame.announceWinners();

			room.userHostedGame.end();
		},
		aliases: ['autowin', 'win'],
	},
	starthangman: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			if (targets.length < 3) return this.say("You must specify a room, an answer, and a hint for the hangman.");
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

			if (Client.checkFilters(answer, gameRoom)) {
				this.say("Your answer contains a word banned in " + gameRoom.title + ".");
				return;
			}

			if (Client.checkFilters(hint, gameRoom)) {
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
	randomanswer: {
		command(target, room, user) {
			let pmRoom: Room | undefined;
			if (!this.isPm(room) || room.game) return;
			if (!target) return this.say("You must specify a game.");

			user.rooms.forEach((rank, userRoom) => {
				if (!pmRoom && Config.allowScriptedGames && Config.allowScriptedGames.includes(userRoom.id) &&
					Users.self.hasRank(userRoom, 'bot')) {
					pmRoom = userRoom;
				}
			});

			if (!pmRoom) return this.say(CommandParser.getErrorText(['noPmGameRoom']));

			const format = global.Games.getFormat(target, true);
			if (Array.isArray(format)) return this.sayError(format);
			if (global.Games.reloadInProgress) return this.sayError(['reloadInProgress']);
			if (!format.canGetRandomAnswer) return this.say("This command cannot be used with " + format.name + ".");
			delete format.inputOptions.points;
			const game = global.Games.createGame(room, format, pmRoom);
			const randomAnswer = game.getRandomAnswer!();
			this.sayHtml(game.getMascotAndNameHtml(" - random") + "<br /><br />" + randomAnswer.hint + "<br /> " +
				"<b>Answer" + (randomAnswer.answers.length > 1 ? "s" : "") + "</b>: " + randomAnswer.answers.join(', '), pmRoom);
			game.deallocate(true);
		},
		aliases: ['randanswer', 'ranswer', 'randomhint', 'randhint', 'rhint'],
	},
};

/* eslint-enable */