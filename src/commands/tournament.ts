import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IBattleGameData } from "../types/games";
import type { IFormat } from "../types/pokemon-showdown";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

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

			let currentBattle: IBattleGameData | undefined;
			for (const battle of tournamentRoom.tournament.currentBattles) {
				if (battle.playerA === targetPlayer || battle.playerB === targetPlayer) {
					currentBattle = tournamentRoom.tournament.battleData.get(battle.room);
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
		command(target, room, user, cmd) {
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

				for (const option of targets) {
					const trimmed = option.trim();
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
			this.run('queuedtournament', '');

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
				if (target) {
					this.run('queuetournament');
					return;
				}
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
				if (link in targetRoom.newUserHostedTournaments! && !targetRoom.newUserHostedTournaments![link].approvalStatus &&
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
};

/* eslint-enable */