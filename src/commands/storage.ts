import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";
import type { IFormat } from "../types/pokemon-showdown";
import type { ICachedLeaderboardEntry, LeaderboardType } from "../types/storage";
import type { TournamentPlace } from "../types/tournaments";

const AWARDED_BOT_GREETING_DURATION = 60 * 24 * 60 * 60 * 1000;

// aliases
const tournamentLeaderboardAliases = ['tournamentleaderboard', 'tourleaderboard', 'tourlb', 'tournamenttop', 'tourtop'];
const gameLeaderboardAliases = ['gameleaderboard', 'gamelb', 'gametop', 'topbits'];
const tournamentRankAliases = ['tournamentrank', 'tourrank', 'tournamentpoints', 'tourpoints'];
const gameRankAliases = ['gamerank', 'gamepoints', 'bits'];
const addGamePointsAliases = ['addbits', 'addbit', 'abits', 'abit', 'removebits', 'removebit', 'rbits', 'rbit'];

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const commands: BaseCommandDefinitions = {
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
			if (Client.checkFilters(message)) return this.say("Your message contains words that are banned in " + Users.self.name + ".");
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
		command(target, room) {
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
	addpoints: {
		command(target, room, user, cmd) {
			const targets = target.split(",");
			let isPm = false;
			let leaderboardRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				leaderboardRoom = targetRoom;
				isPm = true;
			} else {
				if (room.userHostedGame && room.userHostedGame.isHost(user)) {
					this.run(cmd.startsWith('r') ? "removegamepoint" : "addgamepoint");
					return;
				}
				leaderboardRoom = room;
			}

			const database = Storage.getDatabase(leaderboardRoom);
			if (!user.hasRank(leaderboardRoom, 'voice') &&
				!(database.leaderboardManagers && database.leaderboardManagers.includes(user.id))) return;

			let leaderboardType: LeaderboardType;
			if (addGamePointsAliases.includes(cmd)) {
				leaderboardType = 'gameLeaderboard';
			} else {
				leaderboardType = 'unsortedLeaderboard';
			}

			const game = leaderboardType === 'gameLeaderboard';
			if (game && (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(room.id)) &&
				(!Config.allowUserHostedGames || !Config.allowUserHostedGames.includes(room.id))) return;

			if (target.includes("|")) {
				this.runMultipleTargets("|", cmd);
				return;
			}

			const users: string[] = [];
			const remove = cmd.startsWith('r');
			let customAmount: number | null = null;
			for (const name of targets) {
				const id = Tools.toId(name);
				if (!id) continue;
				if (Tools.isInteger(id)) {
					customAmount = parseInt(name.trim());
					if (customAmount < 0) {
						return this.say("You must use ``" + Config.commandCharacter + "removepoints`` instead of a negative number.");
					}
				} else {
					users.push(name);
				}
			}

			if (!users.length) return this.say("You must specify at least 1 user to receive " + (game ? "bits" : "points") + ".");

			let points: number;
			let limit: number;
			if (game) {
				points = 100;
				limit = user.hasRank(leaderboardRoom, 'driver') ? 5000 : 500;
			} else {
				points = 1;
				limit = user.hasRank(leaderboardRoom, 'driver') ? 1000 : 100;
			}

			if (customAmount) {
				if (customAmount > limit) {
					customAmount = limit;
				}
				points = customAmount;
			}

			const pointsName = (game ? "bit" : "point") + (points > 1 ? "s" : "");

			for (let i = 0; i < users.length; i++) {
				const targetUser = Users.get(users[i]);
				if (targetUser) users[i] = targetUser.name;
				if (remove) {
					Storage.removePoints(leaderboardRoom, leaderboardType, users[i], points, 'manual');
				} else {
					Storage.addPoints(leaderboardRoom, leaderboardType, users[i], points, 'manual');
					if (targetUser && targetUser.rooms.has(leaderboardRoom)) {
						targetUser.say("You were awarded " + points + " " + pointsName + "! To see your total amount, use this command: " +
							"``" + Config.commandCharacter + (game ? "bits" : "rank") + " " + leaderboardRoom.title + "``");
					}
				}
			}

			const userList = Tools.joinList(users);
			if (remove) {
				this.say("Removed " + points + " " + pointsName + " from " + userList + ".");
				if (isPm) {
					leaderboardRoom.sayCommand("/modnote " + user.name + " removed " + points + " " + pointsName + " from " +
						userList + ".");
				}
			} else {
				this.say("Added " + points + " " + pointsName + " for " + userList + ".");
				if (isPm) {
					leaderboardRoom.sayCommand("/modnote " + user.name + " added " + points + " " + pointsName + " for " +
						userList + ".");
				}
			}

			Storage.exportDatabase(room.id);
		},
		aliases: ['addpoint', 'removepoint', 'removepoints', 'apoint', 'apoints', 'rpoint', 'rpoints', 'apt', 'rpt']
			.concat(addGamePointsAliases),
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

			Storage.addPoints(room, Storage.tournamentLeaderboard, targetUserName, points, format.id);
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded " + pointsString + " for being " + (placeName === "semifinalist" ? "a" : "the") + " " +
					placeName + " in a " + (scheduled ? "scheduled " : "") + format.name + " tournament! To see your total amount, use " +
					"this command: ``" + Config.commandCharacter + "rank " + room.title + "``.");
			}

			this.sayCommand("/modnote " + user.name + " awarded " + targetUserName + " " + placeName + " points (" + points + ") for a " +
				(scheduled ? "scheduled " : "") + players + "-man " + format.name + " tournament");

			Storage.exportDatabase(room.id);
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

			Storage.addPoints(room, Storage.tournamentLeaderboard, targetUserName, points, format.id);
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded your " + pointsString + " for being " +
					(placeName === "semifinalist" ? "a" : "the") + " " + placeName + " in a scheduled " + format.name + " tournament! " +
					"To see your total amount, use this command: ``" + Config.commandCharacter + "rank " + room.title + "``.");
			}

			this.sayCommand("/modnote " + user.name + " awarded " + targetUserName + " missing " + placeName + " points (" + points + ") " +
				"for a scheduled " + players + "-man " + format.name + " tournament");

			Storage.exportDatabase(room.id);
		},
		aliases: ['makesemifinalpointsofficial', 'makesemipointsofficial', 'makerunneruppointsofficial', 'makerunnerpointsofficial',
			'makewinnerpointsofficial'],
	},
	addleaderboardmanager: {
		command(target, room, user) {
			const targets = target.split(",");
			let leaderboardRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				leaderboardRoom = targetRoom;
			} else {
				leaderboardRoom = room;
			}

			if (!user.hasRank(leaderboardRoom, 'roomowner')) return;

			const database = Storage.getDatabase(leaderboardRoom);
			if (!database.leaderboardManagers) database.leaderboardManagers = [];

			const ids: string[] = [];
			for (const targetUser of targets) {
				if (!Tools.isUsernameLength(targetUser)) return this.say("'" + targetUser.trim() + "' is not a valid username.");
				const id = Tools.toId(targetUser);
				if (database.leaderboardManagers.includes(id)) {
					return this.say("'" + targetUser.trim() + "' is already a leaderboard manager.");
				}
				if (ids.includes(id)) return this.say("You can only specify each user once.");

				ids.push(id);
			}

			database.leaderboardManagers = database.leaderboardManagers.concat(ids);
			this.say("The specified user(s) can now use ``" + Config.commandCharacter + "apt/rpt`` for " + leaderboardRoom.title + ".");
			Storage.exportDatabase(leaderboardRoom.id);
		},
		aliases: ['addleaderboardmanagers', 'addlbmanager', 'addlbmanagers'],
	},
	removeleaderboardmanager: {
		command(target, room, user) {
			const targets = target.split(",");
			let leaderboardRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				leaderboardRoom = targetRoom;
			} else {
				leaderboardRoom = room;
			}

			if (!user.hasRank(leaderboardRoom, 'roomowner')) return;

			const database = Storage.getDatabase(leaderboardRoom);
			if (!database.leaderboardManagers || !database.leaderboardManagers.length) {
				return this.say("There are no leadeboard managers for " + leaderboardRoom.title + ".");
			}

			const ids: string[] = [];
			for (const targetUser of targets) {
				if (!Tools.isUsernameLength(targetUser)) return this.say("'" + targetUser.trim() + "' is not a valid username.");
				const id = Tools.toId(targetUser);
				if (!database.leaderboardManagers.includes(id)) {
					return this.say("'" + targetUser.trim() + "' is not a leaderboard manager.");
				}
				if (ids.includes(id)) return this.say("You can only specify each user once.");

				ids.push(id);
			}

			for (const id of ids) {
				database.leaderboardManagers.splice(database.leaderboardManagers.indexOf(id), 1);
			}

			this.say("The specified user(s) can no longer add or remove points for " + leaderboardRoom.title + ".");
			Storage.exportDatabase(leaderboardRoom.id);
		},
		aliases: ['removeleaderboardmanagers', 'removelbmanager', 'removelbmanagers'],
	},
	leaderboardmanagers: {
		command(target, room, user) {
			if (!this.isPm(room)) return;

			const targetRoom = Rooms.search(target);
			if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
			if (!user.hasRank(targetRoom, 'voice')) return;

			const database = Storage.getDatabase(targetRoom);
			if (!database.leaderboardManagers || !database.leaderboardManagers.length) {
				return this.say("There are no leadeboard managers for " + targetRoom.title + ".");
			}

			const names: string[] = [];
			for (const id of database.leaderboardManagers) {
				let name = id;
				const manager = Users.get(id);
				if (manager) name = manager.name;
				names.push(name);
			}

			this.sayHtml("<b>" + targetRoom.title + "</b> leaderboard managers:<br /><br />" + names.join(", "), targetRoom);
		},
		aliases: ['lbmanagers'],
	},
	leaderboard: {
		command(target, room, user, cmd) {
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
			let leaderboardType: LeaderboardType;
			if (gameLeaderboardAliases.includes(cmd)) {
				leaderboardType = 'gameLeaderboard';
			} else if (tournamentLeaderboardAliases.includes(cmd)) {
				leaderboardType = 'tournamentLeaderboard';
			} else {
				leaderboardType = Storage.getDefaultLeaderboardType(database);
			}

			const leaderboardName = (leaderboardType === 'tournamentLeaderboard' ? 'tournament ' : leaderboardType === 'gameLeaderboard' ?
				'game ' : '') + "leaderboard";
			const leaderboard = database[leaderboardType];
			if (!leaderboard) {
				return this.say("There is no " + leaderboardName + " for the " + leaderboardRoom.title + " room.");
			}

			const game = leaderboardType === 'gameLeaderboard';
			let startPosition = 0;
			let source: IFormat | IGameFormat | undefined;
			let annual = false;
			for (const option of targets) {
				const id = Tools.toId(option);
				if (Tools.isInteger(id)) {
					if (startPosition) return this.say("You can only specify 1 position on the " + leaderboardName + ".");
					startPosition = parseInt(id);
				} else if (id === 'annual' || id === 'alltime') {
					annual = true;
				} else {
					if (game) {
						const gameFormat = Games.getFormat(option);
						if (!Array.isArray(gameFormat)) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						}
					} else {
						const format = Dex.getFormat(option);
						if (format && format.effectType === 'Format') {
							if (source) return this.say("You can only specify 1 point source.");
							source = format;
						}
					}
				}
			}

			let cachedEntries: ICachedLeaderboardEntry[] | undefined;
			if (annual) {
				if (source) {
					cachedEntries = Storage.getAnnualSourcePointsCache(leaderboardRoom, leaderboardType, source.id);
				} else {
					cachedEntries = Storage.getAnnualPointsCache(leaderboardRoom, leaderboardType);
				}
			} else {
				if (source) {
					cachedEntries = Storage.getCurrentSourcePointsCache(leaderboardRoom, leaderboardType, source.id);
				} else {
					cachedEntries = Storage.getCurrentPointsCache(leaderboardRoom, leaderboardType);
				}
			}

			if (!cachedEntries || !cachedEntries.length) {
				return this.say("The " + leaderboardRoom.title + (source ? " " + source.name : "") + " leaderboard is empty.");
			}

			if (startPosition) {
				if (startPosition > cachedEntries.length) startPosition = cachedEntries.length;
				startPosition -= 10;
				if (startPosition < 0) startPosition = 0;
			}

			const output: string[] = [];
			const positions = 10;
			for (let i = startPosition; i < cachedEntries.length; i++) {
				if (!cachedEntries[i]) break;
				output.push(Tools.toNumberOrderString(i + 1) + ": __" + leaderboard.entries[cachedEntries[i].id].name + "__ (" +
					cachedEntries[i].points + ")");
				if (output.length === positions) break;
			}
			let endPosition = startPosition + positions;
			if (endPosition > cachedEntries.length) endPosition = cachedEntries.length;
			this.say("``" + (annual ? "Annual " : "") + (source ? source.name + " " : "") + "Top " + endPosition + " of " +
				cachedEntries.length + "``: " + output.join(", "));
		},
		aliases: ['lb', 'top'].concat(tournamentLeaderboardAliases, gameLeaderboardAliases),
	},
	rank: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			const database = Storage.getDatabase(targetRoom);
			let leaderboardType: LeaderboardType;
			if (tournamentRankAliases.includes(cmd)) {
				leaderboardType = 'tournamentLeaderboard';
			} else if (gameRankAliases.includes(cmd)) {
				leaderboardType = 'gameLeaderboard';
			} else {
				leaderboardType = Storage.getDefaultLeaderboardType(database);
			}

			const leaderboardName = (leaderboardType === 'tournamentLeaderboard' ? 'tournament ' : leaderboardType === 'gameLeaderboard' ?
				'game ' : '') + "leaderboard";
			const leaderboard = database[leaderboardType];
			if (!leaderboard) {
				return this.say("There is no " + leaderboardName + " for the " + targetRoom.title + " room.");
			}

			const game = leaderboardType === 'gameLeaderboard';
			let targetUser = '';
			let position = 0;
			let source: IFormat | IGameFormat | undefined;
			for (const option of targets) {
				const id = Tools.toId(option);
				if (Tools.isInteger(id)) {
					if (position) return this.say("You can only specify 1 position on the leaderboard.");
					position = parseInt(id);
				} else {
					if (game) {
						const gameFormat = Games.getFormat(option);
						if (!Array.isArray(gameFormat)) {
							if (source) return this.say("You can only specify 1 point source.");
							source = gameFormat;
						} else {
							targetUser = id;
						}
					} else {
						const format = Dex.getFormat(option);
						if (format && format.effectType === 'Format') {
							if (source) return this.say("You can only specify 1 point source.");
							source = format;
						} else {
							targetUser = id;
						}
					}
				}
			}

			if (targetUser && position) return this.say("You cannot specify both a username and a position.");

			let currentCache: ICachedLeaderboardEntry[] | undefined;
			let annualCache: ICachedLeaderboardEntry[] | undefined;
			if (source) {
				currentCache = Storage.getCurrentSourcePointsCache(targetRoom, leaderboardType, source.id);
				annualCache = Storage.getAnnualSourcePointsCache(targetRoom, leaderboardType, source.id);
			} else {
				currentCache = Storage.getCurrentPointsCache(targetRoom, leaderboardType);
				annualCache = Storage.getAnnualPointsCache(targetRoom, leaderboardType);
			}

			const pointsName = game ? "bit" : "point";
			const results: string[] = [];
			if (position) {
				const index = position - 1;

				if (currentCache && currentCache[index]) {
					results.push("#" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") + " " +
						leaderboardName + " is " + leaderboard.entries[currentCache[index].id].name + " with " +
						currentCache[index].points + " " + pointsName + (currentCache[index].points !== 1 ? "s" : "") + ".");
				}

				if (annualCache && annualCache[index]) {
					results.push("#" + position + " on the annual " + targetRoom.title + " " + (source ? source.name + " " : "") +
						" " + leaderboardName + " is " + leaderboard.entries[annualCache[index].id].name + " with " +
						annualCache[index].points + " " + pointsName + (annualCache[index].points !== 1 ? "s" : "") + ".");
				}

				if (!results.length) {
					return this.say("No one is #" + position + " on the " + targetRoom.title + " " + (source ? source.name + " " : "") +
						leaderboardName + ".");
				}
			} else {
				if (!targetUser) targetUser = user.id;
				const self = targetUser === user.id;

				if (currentCache) {
					let currentIndex = -1;
					for (let i = 0; i < currentCache.length; i++) {
						if (currentCache[i].id === targetUser) {
							currentIndex = i;
							break;
						}
					}

					if (currentIndex !== -1) {
						results.push((self ? "You are" : leaderboard.entries[targetUser].name + " is") + " #" + (currentIndex + 1) + " " +
							"on the " + targetRoom.title + " " + (source ? source.name + " " : "") + " " + leaderboardName + " with " +
							currentCache[currentIndex].points + " " + pointsName + (currentCache[currentIndex].points !== 1 ? "s" : "") +
							".");
					}
				}

				if (annualCache) {
					let annualIndex = -1;
					for (let i = 0; i < annualCache.length; i++) {
						if (annualCache[i].id === targetUser) {
							annualIndex = i;
							break;
						}
					}

					if (annualIndex !== -1) {
						results.push((self ? "You are" : leaderboard.entries[targetUser].name + " is") + " #" + (annualIndex + 1) + " " +
							"on the annual " + targetRoom.title + " " + (source ? source.name + " " : "") + " " + leaderboardName + " " +
							"with " + annualCache[annualIndex].points + " " + pointsName +
							(annualCache[annualIndex].points !== 1 ? "s" : "") + ".");
					}
				}

				if (!results.length) {
					return this.say((self ? "You are" : targetUser in leaderboard ? leaderboard.entries[targetUser].name :
						targetUser + " is") + " not " + "on the " + targetRoom.title + " " + (source ? source.name + " " : "") +
						leaderboardName + ".");
				}
			}
			this.say(results.join(" "));
		},
		aliases: ['points'].concat(tournamentRankAliases, gameRankAliases),
	},
	clearleaderboard: {
		command(target, room, user) {
			if (this.isPm(room) || (!user.hasRank(room, 'roomowner') && !user.isDeveloper())) return;
			const database = Storage.getDatabase(room);
			let leaderboards = 0;
			for (const type of Storage.allLeaderboardTypes) {
				if (database[type]) leaderboards++;
			}

			if (!leaderboards) return this.say("There is no leaderboard for the " + room.title + " room.");

			const leaderboardTypes: LeaderboardType[] = [];
			if (target) {
				const targets = target.split(",");
				for (const type of targets) {
					const id = Tools.toId(type) as LeaderboardType;
					if (!Storage.allLeaderboardTypes.includes(id)) {
						return this.say("'" + type.trim() + "' is not a valid leaderboard type.");
					}
					leaderboardTypes.push(id);
				}
			}

			Storage.clearLeaderboard(room.id, leaderboardTypes);
			this.say("The leaderboard" + (leaderboards > 1 ? "s were" : " was") + " cleared.");
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
				if (!database.tournamentLeaderboard) {
					return this.say("There is no tournament leaderboard for the " + eventRoom.title + " room.");
				}
				if (!(targetUser in database.tournamentLeaderboard.entries)) {
					return this.say(this.sanitizeResponse(targets[1].trim() + " does not have any event points."));
				}
				let eventPoints = 0;
				for (const source in database.tournamentLeaderboard.entries[targetUser].sources) {
					if (eventInformation.formatIds.includes(source)) {
						eventPoints += database.tournamentLeaderboard.entries[targetUser].sources[source];
					}
				}
				this.say(database.tournamentLeaderboard.entries[targetUser].name + " has " + eventPoints + " points in" +
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
};

/* eslint-enable */