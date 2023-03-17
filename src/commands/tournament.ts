import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IBattleGameData } from "../types/games";
import type { IFormat } from "../types/pokemon-showdown";

export const commands: BaseCommandDefinitions = {
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
				if (target) {
					this.run('createtournament');
					return;
				}
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}

			if (!tournamentRoom.tournament) return this.say("A tournament is not in progress in this room.");
			const tournament = tournamentRoom.tournament;
			let html = "<b>" + tournament.name + " " + (tournament.isRoundRobin ? "Round Robin " : "") + "tournament</b><br />";
			if (tournament.started) {
				if (tournament.willAwardPoints()) {
					const multiplier = Tournaments.getCombinedPointMultiplier(tournament.format, tournament.totalPlayers,
						tournament.official);
					html += "<b>Points to be awarded</b>: " + Tournaments.getSemiFinalistPoints(multiplier) + "/" +
						Tournaments.getRunnerUpPoints(multiplier) + "/" + Tournaments.getWinnerPoints(multiplier) + "<br />";
				}

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
		pmSyntax: ["[room]"],
		description: ["displays information about the current server tournament"],
	},
	createtournament: {
		command(target, room, user) {
			if (this.isPm(room) || !Tournaments.canCreateTournament(room, user)) return;
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
				return this.sayError(['disabledTournamentFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);
			if (room.tournament) return this.say("There is already a tournament in progress in this room.");

			const resolvedFormat = Tournaments.resolveFormatFromInput(target.split(","), room);
			if (typeof resolvedFormat === 'string') return this.say(resolvedFormat);

			if (!resolvedFormat.tournamentPlayable) return this.sayError(['invalidTournamentFormat', resolvedFormat.name]);

			Tournaments.createTournament(room, {format: resolvedFormat, cap: Tournaments.getDefaultPlayerCap(room)});
		},
		chatOnly: true,
		aliases: ['ct', 'createtour'],
		syntax: ["[format]"],
		description: ["creates a server tournament in the given format"],
	},
	tournamentcap: {
		command(target, room, user) {
			if (this.isPm(room) || !room.tournament || room.tournament.started || !Tournaments.canCreateTournament(room, user)) return;
			const cap = parseInt(target);
			if (isNaN(cap)) return this.say("You must specify a valid player cap.");
			if (cap < Tournaments.minPlayerCap || cap > Tournaments.maxPlayerCap) {
				return this.say("The tournament's player cap must be between " + Tournaments.minPlayerCap + " and " +
					Tournaments.maxPlayerCap + ".");
			}
			room.tournament.adjustCap(cap);
		},
		chatOnly: true,
		aliases: ['tcap', 'tourcap'],
		syntax: ["[players]"],
		description: ["sets the current tournament player cap to the given number of players"],
	},
	tournamentenablepoints: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !room.tournament || !Tournaments.canCreateTournament(room, user)) return;
			if (!(Config.rankedTournaments && Config.rankedTournaments.includes(room.id) && !(Config.rankedCustomTournaments &&
				Config.rankedCustomTournaments.includes(room.id)))) {
				return this.say("A tournament leaderboard is not enabled for this room.");
			}

			if (!room.tournament.isSingleElimination) return this.say("Only single elimination tournaments award points.");

			if (cmd === 'tournamentenablepoints' || cmd === 'tourenablepoints') {
				if ((room.tournament.formatAwardsPoints() && room.tournament.manuallyEnabledPoints === undefined) ||
					room.tournament.manuallyEnabledPoints) {
					return this.say("The " + room.tournament.name + " tournament will already award leaderboard points.");
				}
				room.tournament.manuallyEnabledPoints = true;
				this.say("The " + room.tournament.name + " tournament will now award leaderboard points.");
			} else {
				if ((!room.tournament.formatAwardsPoints() && room.tournament.manuallyEnabledPoints === undefined) ||
					room.tournament.manuallyEnabledPoints === false) {
					return this.say("The " + room.tournament.name + " tournament will already not award leaderboard points.");
				}
				room.tournament.manuallyEnabledPoints = false;
				this.say("The " + room.tournament.name + " tournament will no longer award leaderboard points.");
			}
		},
		chatOnly: true,
		aliases: ['tourenablepoints', 'tournamentdisablepoints', 'tourdisablepoints'],
		description: ["enables the current tournament to award points"],
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
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
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

			let playerBattle: IBattleGameData | undefined;
			for (const currentBattle of tournamentRoom.tournament.currentBattles) {
				if (currentBattle.playerA === targetPlayer || currentBattle.playerB === targetPlayer) {
					const battleRoom = Rooms.get(currentBattle.roomid);
					if (battleRoom) {
						playerBattle = tournamentRoom.tournament.battleData.get(battleRoom);
						break;
					}
				}
			}

			if (!playerBattle) return this.say(targetPlayer.name + " is not currently in a tournament battle.");
			const slots = Tools.shuffle(Object.keys(playerBattle.remainingPokemon));
			this.say("The score of " + targetPlayer.name + "'s current battle is " + (slots.length < 2 ? "not yet available" :
				playerBattle.remainingPokemon[slots[0]] + " - " + playerBattle.remainingPokemon[slots[1]]) + ".");
		},
		aliases: ['tbscore', 'tbattlescore'],
		syntax: ["[user]"],
		pmSyntax: ["[room], [user]"],
		description: ["displays the score of the given user's current tournament battle"],
	},
	scheduledtournament: {
		command(target, room, user) {
			const nextOfficialTournaments = Tournaments.getNextOfficialTournaments();
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
				if (!(targetRoom.id in nextOfficialTournaments)) {
					return this.say("There is no official tournament scheduled for " + targetRoom.title + ".");
				}
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				if (!(room.id in nextOfficialTournaments)) return this.say("There is no official tournament scheduled for this room.");
				tournamentRoom = room;
			}

			const officialTournament = nextOfficialTournaments[tournamentRoom.id];
			const format = Tournaments.getFormat(officialTournament.format, tournamentRoom);
			if (!format) return this.say("The scheduled official tournament is no longer playable.");

			const now = Date.now();
			let html = "<b>Next" + (this.pm ? " " + tournamentRoom.title : "") + " official tournament</b>: " +
				Dex.getCustomFormatName(format) + (format.customFormatName ? " (Base format: " + format.name + ")" : "") + "<br />";
			if (now > officialTournament.time) {
				html += "<b>Delayed</b><br />";
			} else {
				html += "<b>Starting in</b>: " + Tools.toDurationString(officialTournament.time - now) + "<br />";
			}

			if (format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(format);
			this.sayHtml(html, tournamentRoom);
		},
		aliases: ['official', 'scheduledtour', 'officialtournament', 'officialtour'],
		pmSyntax: ["[room]"],
		description: ["displays information about the room's next official tournament"],
	},
	gettournamentschedule: {
		command(target, room, user) {
			const targets = target.split(',');
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				if (!user.hasRank(targetRoom, 'moderator') && !Tournaments.canCreateTournament(targetRoom, user) &&
					!user.isDeveloper()) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(targetRoom.id)) {
					return this.sayError(['disabledTournamentFeatures', targetRoom.title]);
				}
				tournamentRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'moderator') && !Tournaments.canCreateTournament(room, user)) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				tournamentRoom = room;
			}

			const month = Tools.toId(targets[0]);
			if (isNaN(parseInt(month))) return this.say("You must specify the month between 1 and 12.");

			const year = parseInt(targets[1]);
			if (isNaN(year)) return this.say("You must specify the year.");

			const schedule = Tournaments.getTournamentScheduleHtml(tournamentRoom, year, month, true);
			if (!schedule) return this.say("No tournament schedule found for " + month + "/" + year + " in " + tournamentRoom.title + ".");
			this.sayCode(schedule);
		},
		aliases: ['gettourschedule'],
		syntax: ["[month]"],
		pmSyntax: ["[room], [month]"],
		description: ["provides the tournament schedule HTML for the given month"],
	},
	validateformat: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;

			const resolved = Tournaments.resolveFormatFromInput(target.split(","));
			if (typeof resolved === 'string') return this.say(resolved);
			return this.say("The specified format is valid (" + Dex.getCustomFormatName(resolved) + ").");
		},
		aliases: ['vformat'],
		syntax: ["[format], [rules]"],
		description: ["checks the given format and custom rules for errors"],
	},
	queuetournament: {
		command(target, room, user, cmd) {
			if (this.isPm(room) || !Tournaments.canCreateTournament(room, user)) return;
			if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
				return this.sayError(['disabledTournamentFeatures', room.title]);
			}
			if (!Users.self.hasRank(room, 'bot')) return this.sayError(['missingBotRankForFeatures', 'tournament']);

			const database = Storage.getDatabase(room);
			if (database.queuedTournament && !cmd.startsWith('force')) {
				const format = Tournaments.getFormat(database.queuedTournament.formatid, room);
				if (format && format.effectType === 'Format') {
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
			const id = Tools.toId(targets[0]);

			const nextOfficialTournaments = Tournaments.getNextOfficialTournaments();
			let official = false;
			let format: IFormat | undefined;
			if (id === 'scheduled' || id === 'official') {
				if (!(room.id in nextOfficialTournaments)) return this.say("There is no official tournament schedule for this room.");
				official = true;
				format = Tournaments.getFormat(nextOfficialTournaments[room.id].format, room);
				if (!format) return this.say("The scheduled official tournament is no longer playable.");
			} else {
				if (room.id in nextOfficialTournaments && Date.now() > nextOfficialTournaments[room.id].time) {
					return this.say("The official tournament is delayed so you must wait until after it starts.");
				}

				const resolved = Tournaments.resolveFormatFromInput(targets, room);
				if (typeof resolved === 'string') return this.say(resolved);

				format = resolved;
			}

			let playerCap = Tournaments.getDefaultPlayerCap(room);

			if (!official) {
				for (const option of targets) {
					const trimmed = option.trim();
					if (Tools.isInteger(trimmed)) {
						playerCap = parseInt(trimmed);
						if (playerCap < Tournaments.minPlayerCap || playerCap > Tournaments.maxPlayerCap) {
							return this.say("You must specify a player cap between " + Tournaments.minPlayerCap + " and " +
								Tournaments.maxPlayerCap + ".");
						}
					}
				}
			}

			let time: number = 0;
			if (official) {
				time = nextOfficialTournaments[room.id].time;
			} else if (!room.tournament) {
				const now = Date.now();
				if (database.lastTournamentTime) {
					if (database.lastTournamentTime + Tournaments.queuedTournamentTime < now) {
						time = now + Tournaments.delayedOfficialTournamentTime;
					} else {
						time = database.lastTournamentTime + Tournaments.queuedTournamentTime;
					}
				} else {
					database.lastTournamentTime = now;
					time = now + Tournaments.queuedTournamentTime;
				}
			}

			database.queuedTournament = {
				formatid: format.customFormatName ? format.customFormatName : Dex.joinNameAndCustomRules(format, format.customRules),
				playerCap: official ? Tournaments.maxPlayerCap : playerCap,
				official,
				time,
				tournamentName: format.tournamentName || format.customFormatName,
			};

			if (official) {
				Tournaments.setOfficialTournamentTimer(room);
			} else if (time) {
				Tournaments.setTournamentTimer(room, time, format, playerCap, false, database.queuedTournament.tournamentName);
			}
			this.run('queuedtournament', '');

			Storage.tryExportDatabase(room.id);
		},
		chatOnly: true,
		aliases: ['forcenexttour', 'forcequeuetournament', 'forcenexttournament'],
		syntax: ["[format | 'official'], {player cap | custom rules}"],
		description: ["sets the next server tournament to the given format, optionally with the given player cap or custom rules"],
	},
	queuedtournament: {
		command(target, room, user, cmd) {
			const privateHtml = cmd === 'nexttourprivate';

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
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
				if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) {
					return this.sayError(['disabledTournamentFeatures', room.title]);
				}
				if (target) {
					this.run('queuetournament');
					return;
				}
				tournamentRoom = room;
			}

			const database = Storage.getDatabase(tournamentRoom);
			const errorText = "There is no tournament scheduled for " + (this.pm ? tournamentRoom.title : "this room") + ".";
			if (!database.queuedTournament) {
				if (privateHtml) {
					tournamentRoom.sayPrivateHtml(user, errorText);
				} else {
					this.say(errorText);
				}

				return;
			}

			const format = Tournaments.getFormat(database.queuedTournament.formatid, tournamentRoom);
			if (!format || format.effectType !== 'Format') {
				if (privateHtml) {
					tournamentRoom.sayPrivateHtml(user, errorText);
				} else {
					this.say(errorText);
				}

				delete database.queuedTournament;
				Storage.tryExportDatabase(tournamentRoom.id);
				return;
			}

			const customFormatName = Dex.getCustomFormatName(format);
			let tournamentName: string;
			if (database.queuedTournament.tournamentName) {
				tournamentName = database.queuedTournament.tournamentName;

				if (customFormatName !== database.queuedTournament.tournamentName) {
					tournamentName += " (" + customFormatName + ")";
				}
			} else {
				tournamentName = customFormatName + (format.customFormatName ? " (Base format: " + format.name + ")" : "");
			}

			const defaultPlayerCap = Tournaments.getDefaultPlayerCap(tournamentRoom);

			let html = "<div class='infobox infobox-limited'><b>Next scheduled" + (this.pm ? " " + tournamentRoom.title : "") + " " +
				"tournament</b>: " + (database.queuedTournament.playerCap !== defaultPlayerCap ?
				database.queuedTournament.playerCap + "-player " : "") + tournamentName +
				(database.queuedTournament.official ? " <i>(official)</i>" : "") + "<br />";
			const multiplier = Tournaments.getCombinedPointMultiplier(format, database.queuedTournament.playerCap,
				database.queuedTournament.official);
			html += "<b>Points to be awarded at player cap</b>: " + Tournaments.getSemiFinalistPoints(multiplier) + "/" +
				Tournaments.getRunnerUpPoints(multiplier) + "/" + Tournaments.getWinnerPoints(multiplier) + "<br />";

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

			if (format.teams) html += "<br /><a href='" + format.teams + "'><b>Sample teams</b></a><br />";
			if (format.customRules) html += "<br /><b>Custom rules:</b><br />" + Dex.getCustomRulesHtml(format);
			html += "</div>";

			if (privateHtml) {
				tournamentRoom.sayPrivateUhtml(user, room.id + "-queued-tournament-" + format.id, html);
			} else {
				this.sayUhtml(room.id + "-queued-tournament-" + format.id, html, tournamentRoom);
			}
		},
		aliases: ['nexttour', 'queuedtour', 'nexttournament', 'nexttourprivate'],
		pmSyntax: ["[room]"],
		description: ["displays information about the queued server tournament"],
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
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
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
				const format = Tournaments.getFormat(pastTournament.inputTarget, tournamentRoom);
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
		pmSyntax: ["[room], {times}"],
		syntax: ["{times}"],
		description: ["displays the previously played server tournaments in the room, optionally with the times they ended"],
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
				if (!user.hasRank(room, 'star') && !Tournaments.canCreateTournament(room, user)) return;
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

			const format = Tournaments.getFormat(targets[0], tournamentRoom);
			if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', target]);
			if (!database.lastTournamentFormatTimes || !(format.id in database.lastTournamentFormatTimes)) {
				return this.say(format.name + " has not been played in " + tournamentRoom.title + ".");
			}
			this.say("The last " + format.name + " tournament in " + tournamentRoom.title + " ended **" +
				Tools.toDurationString(Date.now() - database.lastTournamentFormatTimes[format.id]) + "** ago.");
		},
		aliases: ['lasttour'],
		pmSyntax: ["[room], [game]"],
		syntax: ["[game]"],
		description: ["displays the last time the given tournament format was played"],
	},
	usercreatedformats: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			this.say('Approved and user-created formats: http://pstournaments.weebly.com/formats.html');
		},
		aliases: ['userhostedformats', 'userformats'],
		description: ["links to the approved user-created formats list"],
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
		pmOnly: true,
		aliases: ['gettourapproval'],
		syntax: ["[room], [bracket link], [signups link]"],
		description: ["starts the approval process for the given Challonge tournament"],
	},
	reviewuserhostedtournament: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			if (targets.length !== 2) return this.say("You must specify the room and Challonge link.");

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
				if (link in targetRoom.newUserHostedTournaments! && !targetRoom.newUserHostedTournaments![link].approvalStatus &&
					targetRoom.newUserHostedTournaments![link].reviewer === user.id) {
					targetRoom.newUserHostedTournaments![link].reviewer = '';
					Tournaments.showUserHostedTournamentApprovals(targetRoom);
				}
			}, 10 * 60 * 1000);
			Tournaments.showUserHostedTournamentApprovals(targetRoom);
		},
		pmOnly: true,
		aliases: ['reviewuserhostedtour'],
		syntax: ["[room], [link]"],
		description: ["starts the review process for the given Challonge tournament"],
	},
	approveuserhostedtournament: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			if (targets.length !== 2) return this.say("You must specify the room and Challonge link.");

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
					clearTimeout(targetRoom.newUserHostedTournaments[link].reviewTimer);
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
		pmOnly: true,
		aliases: ['approveuserhostedtour', 'rejectuserhostedtournament', 'rejectuserhostedtour'],
		syntax: ["[room], [link]"],
		description: ["approves the given Challonge tournament to be posted in the room"],
	},
	removeuserhostedtournament: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			if (targets.length !== 2) return this.say("You must specify the room and Challonge link.");

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
		pmOnly: true,
		aliases: ['removeuserhostedtour'],
		syntax: ["[room], [link]"],
		description: ["removes the given Challonge tournament from the room's approval queue"],
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
		pmOnly: true,
		aliases: ['viewuserhostedtours'],
		syntax: ["[room]"],
		description: ["displays the room's Challonge tournament approval queue"],
	},
	addtournamentmanager: {
		command(target, room, user) {
			const targets = target.split(",");
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				tournamentRoom = targetRoom;
			} else {
				tournamentRoom = room;
			}

			if (!user.hasRank(tournamentRoom, 'roomowner')) return;

			const database = Storage.getDatabase(tournamentRoom);
			if (!database.tournamentManagers) database.tournamentManagers = [];

			const ids: string[] = [];
			for (const targetUser of targets) {
				if (!Tools.isUsernameLength(targetUser)) return this.say("'" + targetUser.trim() + "' is not a valid username.");
				const id = Tools.toId(targetUser);
				if (database.tournamentManagers.includes(id)) {
					return this.say("'" + targetUser.trim() + "' is already a tournament manager.");
				}
				if (ids.includes(id)) return this.say("You can only specify each user once.");

				ids.push(id);
			}

			database.tournamentManagers = database.tournamentManagers.concat(ids);
			this.say("The specified user(s) can now use tournament commands in " + tournamentRoom.title + ".");
			Storage.tryExportDatabase(tournamentRoom.id);
		},
		aliases: ['addtourmanager', 'addtournamentmanagers', 'addtourmanagers'],
		syntax: ["[user]"],
		pmSyntax: ["[room], [user]"],
		description: ["adds the given user to the room's tournament managers"],
	},
	removetournamentmanager: {
		command(target, room, user) {
			const targets = target.split(",");
			let tournamentRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				targets.shift();
				tournamentRoom = targetRoom;
			} else {
				tournamentRoom = room;
			}

			if (!user.hasRank(tournamentRoom, 'roomowner')) return;

			const database = Storage.getDatabase(tournamentRoom);
			if (!database.tournamentManagers || !database.tournamentManagers.length) {
				return this.say("There are no tournament managers for " + tournamentRoom.title + ".");
			}

			const ids: string[] = [];
			for (const targetUser of targets) {
				if (!Tools.isUsernameLength(targetUser)) return this.say("'" + targetUser.trim() + "' is not a valid username.");
				const id = Tools.toId(targetUser);
				if (!database.tournamentManagers.includes(id)) {
					return this.say("'" + targetUser.trim() + "' is not a tournament manager.");
				}
				if (ids.includes(id)) return this.say("You can only specify each user once.");

				ids.push(id);
			}

			for (const id of ids) {
				database.tournamentManagers.splice(database.tournamentManagers.indexOf(id), 1);
			}

			this.say("The specified user(s) can no longer use tournament commands for " + tournamentRoom.title + ".");
			Storage.tryExportDatabase(tournamentRoom.id);
		},
		aliases: ['removetourmanager', 'removetournamentmanagers', 'removetourmanagers'],
		syntax: ["[user]"],
		pmSyntax: ["[room], [user]"],
		description: ["removes the given user from the room's tournament managers"],
	},
	tournamentmanagers: {
		command(target, room) {
			if (!this.isPm(room)) return;

			const targetRoom = Rooms.search(target);
			if (!targetRoom) return this.sayError(['invalidBotRoom', target]);

			const database = Storage.getDatabase(targetRoom);
			if (!database.tournamentManagers || !database.tournamentManagers.length) {
				return this.say("There are no tournament managers for " + targetRoom.title + ".");
			}

			const names: string[] = [];
			for (const id of database.tournamentManagers) {
				let name = id;
				const manager = Users.get(id);
				if (manager) name = manager.name;
				names.push(name);
			}

			this.sayHtml("<b>" + targetRoom.title + "</b> tournament managers:<br /><br />" + names.join(", "), targetRoom);
		},
		pmOnly: true,
		aliases: ['tourmanagers'],
		syntax: ["[room]"],
		description: ["displays the room's tournament managers"],
	},
};
