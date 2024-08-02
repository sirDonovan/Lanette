import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";
import type { IFormat } from "../types/pokemon-showdown";
import type { ICachedLeaderboardEntry, LeaderboardType } from "../types/storage";
import type { TournamentPlace } from "../types/tournaments";

const AWARDED_BOT_GREETING_DURATION = 60 * 24 * 60 * 60 * 1000;

// aliases
const tournamentLeaderboardAliases = ['tournamentleaderboard', 'tourleaderboard', 'tourlb', 'tournamenttop', 'tourtop'];
const gameLeaderboardAliases = ['gameleaderboard', 'gamelb', 'gametop', 'topbits', 'topbitsprivate'];
const tournamentRankAliases = ['tournamentrank', 'tourrank', 'tournamentpoints', 'tourpoints'];
const gameRankAliases = ['gamerank', 'gamepoints', 'bits'];
const addGamePointsAliases = ['addbits', 'addbit', 'abits', 'abit', 'removebits', 'removebit', 'rbits', 'rbit'];

export const commands: BaseCommandDefinitions = {
	offlinemessage: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Config.allowMail) return this.say("Offline messages are not enabled.");
			if (user.autoconfirmed === null) {
				Client.getUserDetails(user, (checkedUser) => {
					CommandParser.parse(checkedUser, checkedUser, Config.commandCharacter + "offlinemessage " + target, Date.now());
				});
				return;
			}

			if (!user.autoconfirmed) return this.say("You must be autoconfirmed to send offline messages.");

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

			if (Client.checkFilters(message)) return this.say("Your message contains words that are banned in " + Users.self.name + ".");
			if (!Storage.storeOfflineMessage(user.name, recipientId, message)) return this.say("Sorry, you have too many messages queued " +
				"for " + recipient + ".");
			this.say("Your message has been sent to " + recipient + ".");
		},
		pmOnly: true,
		aliases: ['mail', 'offlinepm'],
		syntax: ["[user], [message]"],
		description: ["sends the given message to the given offline user's mailbox"],
	},
	clearofflinemessages: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			if (!Storage.clearOfflineMessages(user)) return this.say("You do not have any offline messages stored.");
			this.say("Your offline messages were cleared.");
		},
		pmOnly: true,
		aliases: ['clearmail', 'deleteofflinemessages', 'deletemail'],
		description: ["clears your mailbox"],
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
		pmOnly: true,
		aliases: ['seen'],
		syntax: ["[user]"],
		description: ["displays when the given user was last seen by " + Users.self.name],
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
				Storage.afterAddPoints(leaderboardRoom, leaderboardType, Storage.manualSource);
				Storage.tryExportDatabase(leaderboardRoom.id);
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
						return this.say("You must use ``" + Config.commandCharacter + (game ? "removebits" : "removepoints") +
							"`` instead of a negative number.");
					}
				} else {
					if (!Tools.isUsernameLength(id)) return this.say("'" + name.trim() + "' is not a valid username.");
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
					Storage.removePoints(leaderboardRoom, leaderboardType, users[i], points, Storage.manualSource,
						this.runningMultipleTargets ? true : false);
				} else {
					Storage.addPoints(leaderboardRoom, leaderboardType, users[i], points, Storage.manualSource,
						this.runningMultipleTargets ? true : false);
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
					leaderboardRoom.modnote(user.name + " removed " + points + " " + pointsName + " from " +
						userList + ".");
				}
			} else {
				this.say("Added " + points + " " + pointsName + " for " + userList + ".");
				if (isPm) {
					leaderboardRoom.modnote(user.name + " added " + points + " " + pointsName + " for " +
						userList + ".");
				}
			}

			if (!this.runningMultipleTargets) Storage.tryExportDatabase(leaderboardRoom.id);
		},
		aliases: ['apt', 'addpoint', 'removepoint', 'removepoints', 'apoint', 'apoints', 'rpoint', 'rpoints', 'rpt']
			.concat(addGamePointsAliases),
		syntax: ["[user], [points]"],
		description: ["adds the given number of the points to the given user"],
	},
	addsemifinalistpoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !user.hasRank(room, 'driver')) return;

			const game = cmd.endsWith('bits');
			if (game) {
				if (!Config.allowTournamentGames || !Config.allowTournamentGames.includes(room.id)) return;
			} else {
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return;
			}

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
				return this.say("Usage: ``" + Config.commandCharacter + cmd + " " + "[" + placeName + "], [format], [players]" +
					(!game ? ", [official]" : "") + "``");
			}

			if (!Tools.isUsernameLength(targets[0])) return this.say("Please specify a valid username.");

			const players = parseInt(targets[2]);
			if (isNaN(players) || players <= 0) return this.say("Please specify a valid number of players in the tournament.");
			if (players < Tournaments.minPlayerCap || players > Tournaments.maxPlayerCap) {
				return this.say("Tournaments can only award points for between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + " players.");
			}

			let official = false;
			let points = 0;
			let sourceName = "";
			let sourceId = "";
			if (game) {
				const format = Games.getFormat(targets[1]);
				if (Array.isArray(format) || !format.tournamentGame) return this.sayError(['invalidGameFormat', targets[1].trim()]);

				sourceName = format.name + " tournament game";
				sourceId = format.id;

				const multiplier = Tournaments.getPlayersPointMultiplier(players);
				if (placeName === 'semifinalist') {
					points = Tournaments.getSemiFinalistPoints(multiplier);
				} else if (placeName === 'runnerup') {
					points = Tournaments.getRunnerUpPoints(multiplier);
				} else {
					points = Tournaments.getWinnerPoints(multiplier);
				}
			} else {
				const format = Tournaments.getFormat(targets[1], room);
				if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', targets[1].trim()]);

				sourceName = format.name + " tournament";
				sourceId = format.id;

				const officialOption = Tools.toId(targets[3]);
				official = officialOption === 'official' || officialOption === 'scheduled';

				points = Tournaments.getPlacePoints(placeName, format, players, official);
			}

			let targetUserName = targets[0].trim();
			const targetUser = Users.get(targetUserName);
			if (targetUser) targetUserName = targetUser.name;

			Storage.addPoints(room, game ? Storage.gameLeaderboard : Storage.tournamentLeaderboard, targetUserName, points, sourceId);

			const pointsString = points + " " + (game ? "bit" : "point") + (points > 1 ? "s" : "");
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded " + pointsString + " for being " + (placeName === "semifinalist" ? "a" : "the") + " " +
					placeName + " in " + (official ? "an official " : "a ") + sourceName + "! To see your total amount, use " +
					"this command: ``" + Config.commandCharacter + (game ? "bits" : "rank") + " " + room.title + "``.");
			}

			room.modnote(user.name + " awarded " + targetUserName + " " + placeName + " points (" + points + ") for " +
				(official ? "an official " : "a ") + players + "-player " + sourceName);

			Storage.tryExportDatabase(room.id);
		},
		chatOnly: true,
		aliases: ['addsemipoints', 'addsemispoints', 'addsemifinalpoints', 'addrunneruppoints', 'addrunnerpoints', 'addwinnerpoints',
		'addsemifinalistbits', 'addsemibits', 'addsemisbits', 'addsemifinalbits', 'addrunnerupbits', 'addrunnerbits', 'addwinnerbits'],
		syntax: ["[user], [format], [players], {official}"],
		description: ["adds missing points for the given user based on the given number of players and optional official status"],
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
			const format = Tournaments.getFormat(targets[1], room);
			if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', targets[1].trim()]);

			const players = parseInt(targets[2]);
			if (isNaN(players) || players <= 0) return this.say("Please specify a valid number of players in the tournament.");
			if (players < Tournaments.minPlayerCap || players > Tournaments.maxPlayerCap) {
				return this.say("Tournaments can only award points for between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + " players.");
			}

			const officialPoints = Tournaments.getPlacePoints(placeName, format, players, true);
			const regularPoints = Tournaments.getPlacePoints(placeName, format, players, false);
			const points = officialPoints - regularPoints;
			const pointsString = points + " missing point" + (points > 1 ? "s" : "");

			let targetUserName = targets[0].trim();
			const targetUser = Users.get(targetUserName);
			if (targetUser) targetUserName = targetUser.name;

			Storage.addPoints(room, Storage.tournamentLeaderboard, targetUserName, points, format.id);
			this.say("Added " + pointsString + " for " + targetUserName + ".");
			if (targetUser && targetUser.rooms.has(room)) {
				targetUser.say("You were awarded your " + pointsString + " for being " +
					(placeName === "semifinalist" ? "a" : "the") + " " + placeName + " in an official " + format.name + " tournament! " +
					"To see your total amount, use this command: ``" + Config.commandCharacter + "rank " + room.title + "``.");
			}

			room.modnote(user.name + " awarded " + targetUserName + " missing " + placeName + " points (" + points + ") " +
				"for an official " + players + "-player " + format.name + " tournament");

			Storage.tryExportDatabase(room.id);
		},
		chatOnly: true,
		aliases: ['makesemipointsofficial', 'makesemispointsofficial', 'makesemifinalpointsofficial', 'makerunneruppointsofficial',
			'makerunnerpointsofficial', 'makewinnerpointsofficial'],
		syntax: ["[user], [format], [players]"],
		description: ["adds missing official points for the given user based on the given number of players"],
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
			Storage.tryExportDatabase(leaderboardRoom.id);
		},
		aliases: ['addlbmanager', 'addleaderboardmanagers', 'addlbmanagers'],
		syntax: ["[user]"],
		pmSyntax: ["[room], [user]"],
		description: ["adds the given user to the room's leaderboard managers"],
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
			Storage.tryExportDatabase(leaderboardRoom.id);
		},
		aliases: ['removelbmanager', 'removeleaderboardmanagers', 'removelbmanagers'],
		syntax: ["[user]"],
		pmSyntax: ["[room], [user]"],
		description: ["removes the given user from the room's leaderboard managers"],
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
		pmOnly: true,
		aliases: ['lbmanagers'],
		syntax: ["[room]"],
		description: ["displays the room's leaderboard managers"],
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
				if (!user.hasRank(room, 'star')) return;
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
						const format = Tournaments.getFormat(option, leaderboardRoom);
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
					cachedEntries = Storage.getAnnualSourcePointsCache(leaderboardRoom, leaderboardType, [source.id]);
				} else {
					cachedEntries = Storage.getAnnualPointsCache(leaderboardRoom, leaderboardType);
				}
			} else {
				if (source) {
					cachedEntries = Storage.getSourcePointsCache(leaderboardRoom, leaderboardType, [source.id]);
				} else {
					cachedEntries = Storage.getPointsCache(leaderboardRoom, leaderboardType);
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
				output.push("<b>" + Tools.toNumberOrderString(i + 1) + "</b>: " + leaderboard.entries[cachedEntries[i].id].name + " (" +
					cachedEntries[i].points + ")");
				if (output.length === positions) break;
			}

			let endPosition = startPosition + positions;
			if (endPosition > cachedEntries.length) endPosition = cachedEntries.length;

			const html = "<b>" + (annual ? "Annual " : "") + (source ? source.name + " " : "") + "Top " + endPosition + " of " +
				cachedEntries.length + "</b><hr />" + output.join(", ");

			if (cmd === 'topprivate' || cmd === 'topbitsprivate') {
				leaderboardRoom.sayPrivateHtml(user, html);
			} else {
				this.sayHtml(html, leaderboardRoom);
			}
		},
		aliases: ['top', 'lb', 'topprivate'].concat(tournamentLeaderboardAliases, gameLeaderboardAliases),
		syntax: ["{format | starting position | annual}"],
		pmSyntax: ["[room], {format | starting position | annual}"],
		description: ["displays the room's leaderboard, optionally for the given format, from the given starting position, or " +
			"the sannual leaderboard"],
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
						const format = Tournaments.getFormat(option, targetRoom);
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
				currentCache = Storage.getSourcePointsCache(targetRoom, leaderboardType, [source.id]);
				annualCache = Storage.getAnnualSourcePointsCache(targetRoom, leaderboardType, [source.id]);
			} else {
				currentCache = Storage.getPointsCache(targetRoom, leaderboardType);
				annualCache = Storage.getAnnualPointsCache(targetRoom, leaderboardType);
			}

			const pointsName = game ? "bit" : "point";
			const results: string[] = [];
			if (position) {
				const index = position - 1;

				if (currentCache[index]) {
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
		pmOnly: true,
		aliases: ['points'].concat(tournamentRankAliases, gameRankAliases),
		syntax: ["[room], {format}, {annual}"],
		description: ["displays your rank on the room's leaderboard, optionally for the given format or the annual leaderboard"],
	},
	clearleaderboard: {
		command(target, room, user) {
			if (this.isPm(room) || (!user.hasRank(room, 'roomowner') && user !== Users.self)) return;
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
					if (!(id in Storage.allLeaderboardTypesById)) {
						return this.say("'" + type.trim() + "' is not a valid leaderboard type.");
					}
					leaderboardTypes.push(Storage.allLeaderboardTypesById[id]);
				}
			}

			Storage.clearLeaderboard(room.id, leaderboardTypes)
				.then(() => {
					const currentRoom = Rooms.get(room.id);
					if (currentRoom) currentRoom.say("The leaderboard" + (leaderboards > 1 ? "s were" : " was") + " cleared.");
				})
				.catch((e: Error) => {
					const currentRoom = Rooms.get(room.id);
					if (currentRoom) {
						currentRoom.say("An error occurred while clearing the leaderboard" + (leaderboards > 1 ? "s" : "") + ".");
					}

					Tools.logException(e, Config.commandCharacter + "clearleaderboard " + target + " in " + room.id);
				});
		},
		chatOnly: true,
		aliases: ['resetleaderboard'],
		description: ["ends the current leaderboard cycle and starts a new one"],
	},
	clearleaderboardpoints: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'roomowner')) return;
			const database = Storage.getDatabase(room);
			let leaderboards = 0;
			for (const type of Storage.allLeaderboardTypes) {
				if (database[type]) leaderboards++;
			}

			if (!leaderboards) return this.say("There is no leaderboard for the " + room.title + " room.");

			const targets = target.split(",");
			if (targets.length !== 2) return this.say("You must specify a leaderboard type and user.");

			let leaderboardTypeId = Tools.toId(targets[0]);
			if (leaderboardTypeId + 'leaderboard' in Storage.allLeaderboardTypesById) {
				leaderboardTypeId += 'leaderboard';
			} else if (!(leaderboardTypeId in Storage.allLeaderboardTypesById)) {
				return this.say("'" + targets[0].trim() + "' is not a valid leaderboard type.");
			}

			if (Storage.removeAllPoints(room, Storage.allLeaderboardTypesById[leaderboardTypeId], targets[1])) {
				this.say("Cleared all " + Storage.allLeaderboardNames[Storage.allLeaderboardTypesById[leaderboardTypeId]] +
					" points for " + targets[1].trim() + ".");
			} else {
				this.say(targets[1].trim() + " does not have any " +
					Storage.allLeaderboardNames[Storage.allLeaderboardTypesById[leaderboardTypeId]] + " points.");
			}
		},
		chatOnly: true,
		aliases: ['resetleaderboardpoints'],
		syntax: ["[leaderboard type], [user]"],
		description: ["clears the user's points from the specified leaderboard"],
	},
	transferdata: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!user.hasRank(targetRoom, 'roomowner')) return;
			const source = targets[1].trim();
			const destination = targets[2].trim();
			if (!Storage.transferData(targetRoom.id, source, destination)) return;
			this.say("Data from " + source + " in " + targetRoom.title + " has been successfully transferred to " + destination + ".");
			targetRoom.modnote(user.name + " transferred data from " + source + " to " + destination + ".");
		},
		pmOnly: true,
		syntax: ["[room], [user A], [user B]"],
		description: ["transfers room data from user A to user B"],
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
			const achievements = Games.getAchievements();
			if (database.gameAchievements && id in database.gameAchievements) {
				for (const achievement of database.gameAchievements[id]) {
					if (achievement in achievements) unlockedAchievements.push(achievements[achievement].name);
				}
			}
			if (!unlockedAchievements.length) {
				return this.say((id === user.id ? "You have" : name + " has") + " not unlocked any game achievements in " +
					targetRoom.title + ".");
			}
			this.sayHtml("<b>" + (id === user.id ? "Your" : name + "'s") + " unlocked game achievements</b>:<br />" +
				unlockedAchievements.join(", "), targetRoom);
		},
		pmOnly: true,
		aliases: ['chieves', 'achievements'],
		syntax: ["[room], {user}"],
		description: ["displays your or the given user's unlocked achievements in the room"],
	},
	unlockedgameachievements: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
			if (!Config.allowScriptedGames || !Config.allowScriptedGames.includes(targetRoom.id)) {
				return this.sayError(['disabledGameFeatures', targetRoom.title]);
			}

			if (targets.length !== 2) return this.say("You must specify a game achievement.");

			const achievements = Games.getAchievements();
			const achievementId = Tools.toId(targets[1]);
			if (!(achievementId in achievements)) return this.say("'" + targets[1].trim() + "' is not a game achievement.");

			const database = Storage.getDatabase(targetRoom);
			const unlockedAchievements: string[] = [];

			if (database.gameAchievements) {
				for (const id in database.gameAchievements) {
					if (database.gameAchievements[id].includes(achievementId)) {
						const unlockedUser = Users.get(id);
						let name: string;
						if (unlockedUser) {
							name = unlockedUser.name;
						} else {
							if (database.gameLeaderboard && id in database.gameLeaderboard.entries) {
								name = database.gameLeaderboard.entries[id].name;
							} else {
								name = id;
							}
						}
						unlockedAchievements.push(name);
					}
				}
			}

			const unlockedAmount = unlockedAchievements.length;
			if (!unlockedAmount) {
				return this.say("No one in " + targetRoom.title + " has unlocked " + achievements[achievementId].name + " yet.");
			}

			this.sayHtml("<b>" + unlockedAmount + "</b> player" + (unlockedAmount > 1 ? "s have" : " has") + " unlocked " +
				achievements[achievementId].name + " in " + targetRoom.title + ":<br /><br /><details><summary>Player names</summary>" +
				unlockedAchievements.join(", ") + "</details>", targetRoom);
		},
		pmOnly: true,
		aliases: ['chieved', 'unlockedachievements', 'unlockedchieves'],
		syntax: ["[room], [achievement]"],
		description: ["displays the list of users who have unlocked the given achievement in the room"],
	},
	tournamentprofile: {
		command(target, room, user) {
			if (this.isPm(room)) {
				this.say("To preview your tournament trainer profile, use the command ``" + Config.commandCharacter + "ttc [room]``.");
				return;
			}

			if (!user.hasRank(room, 'star')) return;

			let targetName = target || user.name;
			const targetUser = Users.get(targetName);
			if (targetUser) {
				targetName = targetUser.name;
			}

			if (!Tournaments.getTrainerCardHtml(room, targetName)) {
				return this.say(targetName + " does not have a tournament trainer profile.");
			}

			// update global rank
			Tournaments.displayTrainerCard(room, targetName);
		},
		aliases: ['tourprofile'],
		syntax: ["[user]"],
		description: ["displays the tournament trainer profile of the given user"],
	},
	tournamenttrainercardbadges: {
		command(target, room, user) {
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(target);
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star')) return;
				tournamentRoom = room;
			}

			const badgesHtml: string[] = [];
			const trainerCardRoom = Tournaments.getTrainerCardRoom(tournamentRoom);
			if (trainerCardRoom) {
				const database = Storage.getDatabase(trainerCardRoom);
				if (database.tournamentTrainerCardBadges) {
					for (const i in database.tournamentTrainerCardBadges) {
						const badgeHtml = Tournaments.getBadgeHtml(database, i);
						if (badgeHtml) badgesHtml.push(badgeHtml);
					}
				}
			}

			if (!badgesHtml.length) {
				return this.say("There are no tournament trainer card badges for " + tournamentRoom.title + ".");
			}

			this.sayHtml("<b>" + tournamentRoom.title + " trainer card badges</b>:<br />" + badgesHtml.join(""), tournamentRoom);
		},
		aliases: ['tourtrainercardbadges', 'tourbadges', 'tourbadgelist', 'ttcbadges'],
		syntax: ["[room]"],
		description: ["displays the list of tournament trainer card badges for the given room"],
	},
	tournamenttrainercardbadgeholders: {
		command(target, room, user) {
			const targets = target.split(",");
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				tournamentRoom = targetRoom;
				targets.shift();
			} else {
				if (!user.hasRank(room, 'star')) return;
				tournamentRoom = room;
			}

			const id = Tools.toId(targets[0]);
			if (!id) return this.say("You must specify a badge name.");

			const trainerCardRoom = Tournaments.getTrainerCardRoom(tournamentRoom);
			if (!trainerCardRoom) {
				return this.say("The tournament trainer card badges for " + tournamentRoom.title + " cannot currently be viewed.");
			}

			const database = Storage.getDatabase(trainerCardRoom);
			if (!database.tournamentTrainerCardBadges || !(id in database.tournamentTrainerCardBadges)) {
				return this.say("'" + targets[0].trim() + "' is not a valid tournament trainer card badge.");
			}

			const users: string[] = [];
			if (database.tournamentTrainerCards) {
				for (const i in database.tournamentTrainerCards) {
					if (database.tournamentTrainerCards[i].badges && database.tournamentTrainerCards[i].badges.includes(id)) {
						const badgeUser = Users.get(i);
						users.push(badgeUser ? badgeUser.name : i);
					}
				}
			}

			if (!users.length) return this.say("No one holds the " + database.tournamentTrainerCardBadges[id].name + " badge.");
			this.sayHtml("<b>" + database.tournamentTrainerCardBadges[id].name + " badge holders</b>:<br />" + users.join(", "),
				tournamentRoom);
		},
		aliases: ['tourtrainercardbadgeholders', 'tourbadgeholders', 'ttcbh'],
		syntax: ["[room], [badge]"],
		description: ["displays the list of users who hold the given badge on their tournament trainer card"],
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
				if (!user.hasRank(room, 'star')) return;
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
		syntax: ["[event]"],
		pmSyntax: ["[room], [event]"],
		description: ["displays the link for the given room event"],
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
		chatOnly: true,
		aliases: ['setelink'],
		syntax: ["[event], [link], [description]"],
		description: ["sets the link and description for the given room event"],
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
		chatOnly: true,
		aliases: ['removeelink'],
		syntax: ["[event]"],
		description: ["removes the link from the given room event"],
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
				if (!user.hasRank(room, 'star')) return;
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
					const format = Tournaments.getFormat(formatId, eventRoom);
					if (format) {
						formatNames.push(format.customFormatName || format.name);
					} else {
						formatNames.push(formatId);
					}
				}

				this.say("The format" + (multipleFormats ? "s" : "") + " for " + database.eventInformation[event].name + " " +
					(multipleFormats ? "are " : "is ") + Tools.joinList(formatNames) + ".");
			}
		},
		aliases: ['eformats'],
		syntax: ["[event], {user}"],
		pmSyntax: ["[room], [event], {user}"],
		description: ["displays the formats for the given room event and optionally the format points for the given user"],
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
				const id = Tools.toId(targets[i]);
				const format = Tournaments.getFormat(id, room);
				if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', id]);
				formatIds.push(id);
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
		chatOnly: true,
		aliases: ['seteformats'],
		syntax: ["[event], [formats]"],
		description: ["sets the list of formats for the given room event"],
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
		chatOnly: true,
		aliases: ['removeeformats'],
		syntax: ["[event]"],
		description: ["clears the list of formats for the given room event"],
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
		chatOnly: true,
		syntax: ["[event]"],
		description: ["removes the given room event"],
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
		developerOnly: true,
		pmOnly: true,
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
		developerOnly: true,
		pmOnly: true,
	},
};
