import { EliminationNode } from "./lib/elimination-node";
import type { Player } from "./room-activity";
import { Tournament } from "./room-tournament";
import type { Room } from "./rooms";
import type { GroupName } from "./types/client";
import type { TrainerSpriteId } from "./types/dex";
import type { IFormat } from "./types/pokemon-showdown";
import type { IDatabase, IPastTournament, LeaderboardType } from "./types/storage";
import type {
	IClientTournamentNode, ICreateTournamentOptions, IOfficialTournament, ITournamentCreateJson, ITournamentCreateListener,
	ITournamentTimerData, ITreeRootPlaces, TournamentPlace
} from "./types/tournaments";
import type { User } from "./users";

const TRAINER_BADGE_DIMENSIONS = 24;
const OFFICIAL_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const OFFICIAL_TOURNAMENT_QUICK_BUFFER_TIME = 30 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';
const DEFAULT_OFFICIAL_TOURNAMENT = 'ou';

export class Tournaments {
	// exported constants
	readonly delayedOfficialTournamentTime: number = 15 * 1000;
	readonly maxPlayerCap: number = 128;
	readonly minPlayerCap: number = 4;
	readonly winnerPoints: number = 3;
	readonly queuedTournamentTime: number = 5 * 60 * 1000;
	readonly runnerUpPoints: number = 2;
	readonly semiFinalistPoints: number = 1;

	createListeners: Dict<ITournamentCreateListener | undefined> = {};
	private nextOfficialTournaments: Dict<IOfficialTournament | undefined> = {};
	private officialTournaments: Dict<IOfficialTournament[] | undefined> = {};
	private tournamentTimerData: Dict<ITournamentTimerData | undefined> = {};
	private tournamentTimers: Dict<NodeJS.Timeout | undefined> = {};
	private userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timeout | undefined> = {};

	getNextOfficialTournaments(): DeepImmutable<Dict<IOfficialTournament | undefined>> {
		return this.nextOfficialTournaments;
	}

	loadSchedules(loadAll?: boolean): void {
		const rooms = Storage.getDatabaseIds();
		for (const room of rooms) {
			try {
				this.loadRoomSchedule(room, loadAll);
			} catch (e) {
				Tools.logException(e as Error, "Failed to load tournament schedule for room " + room);
			}
		}
	}

	loadRoomSchedule(room: string, loadAll?: boolean): void {
		const database = Storage.getDatabaseById(room);
		if (!database.officialTournamentSchedule) return;

		this.officialTournaments[room] = [];

		const monthsAndYears: {month: number, year: number}[] = [];
		const date = new Date();
		const currentYear = date.getFullYear();
		const currentMonth = date.getMonth() + 1;
		const currentDate = date.getDate();
		const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

		const years = Object.keys(database.officialTournamentSchedule.years).map(x => parseInt(x)).sort((a, b) => a - b);
		for (const year of years) {
			if (!loadAll && year < currentYear) continue;

			const checkCurrentMonth = year === currentYear;

			const schedule = database.officialTournamentSchedule.years[year];
			const months = Object.keys(schedule.months).map(x => parseInt(x)).sort((a, b) => a - b);
			for (const month of months) {
				if (!loadAll && checkCurrentMonth && month < currentMonth) continue;

				const days = Object.keys(schedule.months[month].days).map(x => parseInt(x)).sort((a, b) => a - b);
				if (!days.length) continue;

				monthsAndYears.push({month, year});

				const checkCurrentDate = month === currentMonth;
				for (const day of days) {
					if (!loadAll && checkCurrentDate && day < currentDate) continue;

					const scheduled = (schedule.months[month].days[day]!.format || DEFAULT_OFFICIAL_TOURNAMENT).trim();
					let formatId = scheduled;
					let customRules: string[] = [];
					if (scheduled.includes('@@@')) {
						const parts = scheduled.split('@@@');
						formatId = parts[0];
						customRules = parts[1].split(',');
					} else if (scheduled.includes(',')) {
						const parts = scheduled.split(',');
						formatId = parts[0];
						for (let i = 1; i < parts.length; i++) {
							const part = parts[i].trim();
							if (part && part !== '0') customRules.push(part);
						}
					}

					try {
						const format = this.getFormat(formatId, undefined, room);
						if (!format) throw new Error("No format returned for '" + formatId + "'");

						if (format.customRules) customRules = customRules.concat(format.customRules);

						const validatedFormatId = Dex.validateFormat(Dex.joinNameAndCustomRules(format,
							Dex.resolveCustomRuleAliases(customRules)));

						const validatedFormat = Dex.getExistingFormat(validatedFormatId, true);
						if (customRules.length && (!validatedFormat.customRules || !validatedFormat.customRules.length)) {
							throw new Error("Custom rules not added");
						}

						if (schedule.months[month].days[day]!.invalidFormat) schedule.months[month].days[day]!.invalidFormat = false;
					} catch (e) {
						const errorMessage = "Invalid format scheduled for " + month + "/" + day + " in " + room + ": " +
							(e as Error).message;
						console.log(errorMessage);

						if (month === currentMonth || month === nextMonth) {
							const possibleRoom = Rooms.get(room);
							if (possibleRoom) possibleRoom.modnote(errorMessage);
						}

						schedule.months[month].days[day]!.invalidFormat = true;
					}
				}
			}
		}

		if (!monthsAndYears.length) return;

		let monthAndYear = monthsAndYears[0];
		let month = monthAndYear.month;
		monthsAndYears.shift();

		let schedule = database.officialTournamentSchedule.years[monthAndYear.year];
		let scheduleDays = schedule.months[month].days;
		let day = 1;
		let scheduleDay = scheduleDays[day] && scheduleDays[day]!.times[1] &&
			scheduleDays[day]!.times[0][0] > scheduleDays[day]!.times[1][0] ? 2 : 1;
		date.setMonth(month - 1, day);
		date.setDate(day);
		date.setFullYear(monthAndYear.year);
		let lastDayOfMonth = Tools.getLastDayOfMonth(date);

		const rolloverDay = (): boolean => {
			scheduleDay++;
			if (!scheduleDays[scheduleDay]) {
				if (monthsAndYears.length) {
					// incomplete schedule
					if (!(monthsAndYears[0].month in schedule.months)) return false;

					scheduleDays = schedule.months[monthsAndYears[0].month].days;
					scheduleDay = 1;
				} else {
					scheduleDay--;
				}
			}

			day++;
			if (day > lastDayOfMonth) {
				day = 1;
				const previousMonth = month;
				monthAndYear = monthsAndYears[0];
				monthsAndYears.shift();
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				month = monthAndYear ? monthAndYear.month : 0;
				if (month) {
					schedule = database.officialTournamentSchedule!.years[monthAndYear.year];

					date.setMonth(month - 1, day);
					date.setFullYear(monthAndYear.year);

					lastDayOfMonth = Tools.getLastDayOfMonth(date);
				} else {
					// previousMonth + 1 - 1
					date.setMonth(previousMonth, day);
				}
			}

			date.setDate(day);
			return true;
		};

		const now = Date.now();

		// month is eventually undefined due to rolloverDay()
		outer:
		while (month) {
			const format = !scheduleDays[scheduleDay]!.format || scheduleDays[scheduleDay]!.invalidFormat ? DEFAULT_OFFICIAL_TOURNAMENT :
				scheduleDays[scheduleDay]!.format;
			let rolledOverDay = false;
			for (let i = 0; i < scheduleDays[scheduleDay]!.times.length; i++) {
				if (i > 0 && scheduleDays[scheduleDay]!.times[i][0] < scheduleDays[scheduleDay]!.times[i - 1][0]) {
					if (!rolloverDay()) break outer;
					rolledOverDay = true;
				}

				date.setHours(scheduleDays[scheduleDay]!.times[i][0], scheduleDays[scheduleDay]!.times[i][1], 0, 0);

				const tournamentTime = date.getTime();
				const remainingTime = tournamentTime - now;
				if (remainingTime < 0) continue;
				if (remainingTime >= Number.MAX_SAFE_INTEGER) break outer;

				this.officialTournaments[room].push({
					format,
					time: tournamentTime,
					official: true,
					endOfCycle: scheduleDays[scheduleDay]!.endOfCycle && scheduleDays[scheduleDay]!.endOfCycle![i],
				});
			}

			if (!rolledOverDay) {
				if (!rolloverDay()) break outer;
			}
		}

		this.officialTournaments[room].sort((a, b) => a.time - b.time);
	}

	getFormat(formatId: string, room?: Room, roomid?: string): IFormat | undefined {
		if (room) roomid = room.id;

		let format = Dex.getFormat(formatId);
		if (format || !roomid) return format;

		const database = Storage.getDatabaseById(roomid);
		if (!database.customFormats) return;

		let id = Tools.toId(formatId);
		if (!(id in database.customFormats)) {
			const currentGen = Dex.getGen();
			for (let i = currentGen; i >= 1; i--) {
				const genId = 'gen' + i + id;
				if (genId in database.customFormats) {
					id = genId;
					break;
				}
			}

			if (!(id in database.customFormats)) return;
		}

		format = Dex.getFormat(database.customFormats[id].formatId);
		if (!format) return;

		format.customFormatName = database.customFormats[id].name;
		return format;
	}

	canCreateTournament(room: Room, user: User): boolean {
		const database = Storage.getDatabase(room);
		if (database.tournamentManagers && database.tournamentManagers.includes(user.id)) return true;
		return user.hasRank(room, 'driver');
	}

	onNewTournament(room: Room, json: ITournamentCreateJson): Tournament | undefined {
		const format = json.teambuilderFormat ? Dex.getFormat(json.teambuilderFormat) : Dex.getFormat(json.format);
		if (!format || format.effectType !== 'Format') return;

		if (room.id in this.tournamentTimers) {
			clearTimeout(this.tournamentTimers[room.id]);
			delete this.tournamentTimers[room.id];
			delete this.tournamentTimerData[room.id];
		}

		const tournament = new Tournament(room);
		room.tournament = tournament;
		tournament.initialize(format, json.generator, json.playerCap || 0, json.teambuilderFormat ? json.format : undefined);

		if (json.isStarted) {
			tournament.started = true;
		} else {
			let updatedDatabase = false;

			if (room.id in this.createListeners && format.id === this.createListeners[room.id]!.format.id) {
				const createListener = this.createListeners[room.id]!;
				if (createListener.official) {
					tournament.official = true;
					this.setOfficialTournament(room);
				}

				if (createListener.endOfCycle) {
					tournament.endOfCycle = true;
				}

				if (createListener.game) {
					tournament.battleRoomGame = createListener.game;
				}

				tournament.format = createListener.format;

				const name = createListener.name || tournament.format.customFormatName;
				if (name) {
					tournament.name = name;
					tournament.manuallyNamed = true;
					if (!createListener.name) room.nameTournament(name, tournament.official);
				}

				if (tournament.format.customRules) {
					tournament.setCustomFormatName();
					room.setTournamentRules(tournament.format.customRules.join(","));
				}

				if (createListener.callback) {
					createListener.callback();
				}

				const database = Storage.getDatabase(room);
				if (database.queuedTournament) {
					const queuedFormat = this.getFormat(database.queuedTournament.formatid, room);
					if (!queuedFormat || queuedFormat.effectType !== 'Format' || tournament.format.id === queuedFormat.id) {
						delete database.queuedTournament;
						updatedDatabase = true;
					}
				}
			}

			room.forcePublicTournament();

			if (tournament.playerCap) room.autoStartTournament();

			let autoDQ: number | undefined;
			if (Config.tournamentRandomAutoDQTimers && room.id in Config.tournamentRandomAutoDQTimers && tournament.format.team) {
				autoDQ = Config.tournamentRandomAutoDQTimers[room.id];
			} else if (Config.tournamentAutoDQTimers && room.id in Config.tournamentAutoDQTimers) {
				autoDQ = Config.tournamentAutoDQTimers[room.id];
			}

			if (autoDQ) {
				room.setTournamentAutoDq(autoDQ);
				tournament.setAutoDqMinutes(autoDQ);
			}

			if ((!tournament.format.team && Config.disallowTournamentScouting && Config.disallowTournamentScouting.includes(room.id)) ||
				(Config.disallowTournamentScoutingFormats && room.id in Config.disallowTournamentScoutingFormats &&
				Config.disallowTournamentScoutingFormats[room.id].includes(tournament.format.id))) {
				room.disallowTournamentScouting();
			}

			if (Config.disallowTournamentModjoin && Config.disallowTournamentModjoin.includes(room.id)) {
				room.disallowTournamentModjoin();
			}

			let startMinutes = 5;
			if (Config.tournamentStartTimers && room.id in Config.tournamentStartTimers) {
				startMinutes = Config.tournamentStartTimers[room.id];
				if (tournament.official) startMinutes *= 2;
				tournament.startTimer = setTimeout(() => {
					if (tournament.playerCount >= 2) {
						room.startTournament();
					} else {
						room.endTournament();
					}
				}, startMinutes * 60 * 1000);
			}

			if (Config.adjustTournamentCaps && Config.adjustTournamentCaps.includes(room.id)) {
				tournament.adjustCapTimer = setTimeout(() => room.tournament!.adjustCap(), (startMinutes / 2) * 60 * 1000);
			}

			if (Config.displayTournamentFormatInfo && Config.displayTournamentFormatInfo.includes(room.id)) {
				const formatInfo = Dex.getFormatInfoDisplay(tournament.format, room.id);
				if (formatInfo) room.sayHtml(formatInfo);

				if (tournament.format.customRules) {
					const customRuleInfo = Dex.getCustomRuleInfoDisplay(tournament.format.customRules);
					if (customRuleInfo) room.sayHtml(customRuleInfo);
				}
			}

			if (Config.tournamentRoomAdvertisements && room.id in Config.tournamentRoomAdvertisements) {
				for (const roomId of Config.tournamentRoomAdvertisements[room.id]) {
					const advertisementRoom = Rooms.get(roomId);
					if (advertisementRoom) advertisementRoom.sayHtml('<a href="/' + room.id + '" class="ilink"><strong>' + tournament.name +
						'</strong> tournament created in <strong>' + room.title + '</strong>.</a>');
				}
			}

			if (updatedDatabase) Storage.tryExportDatabase(room.id);
		}

		delete this.createListeners[room.id];

		return tournament;
	}

	resolveFormatFromInput(originalTargets: readonly string[], room?: Room): string | IFormat {
		const targets = originalTargets.slice();
		let tournamentName: string | undefined;
		let formatName = targets[0];
		let id = Tools.toId(formatName);
		targets.shift();

		const samePokemon: string[] = [];
		let format: IFormat | undefined;

		if (id === 'samesolo') {
			format = Dex.getFormat('1v1');
			const pokemon = Dex.getPokemon(targets[0]);
			if (!pokemon) return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
			if (pokemon.battleOnly) return "You cannot specify battle-only formes.";
			samePokemon.push(pokemon.name);
			targets.shift();
		} else if (id === 'sameduo') {
			if (targets.length < 2) return "You must specify the 2 Pokemon of the duo.";
			format = Dex.getFormat('2v2 Doubles');
			for (let i = 0; i < 2; i++) {
				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
				if (pokemon.battleOnly) return "You cannot specify battle-only formes.";
				if (samePokemon.includes(pokemon.name) || (pokemon.forme && samePokemon.includes(pokemon.baseSpecies))) {
					return "The duo already includes " + pokemon.name + "!";
				}
				samePokemon.push(pokemon.name);
				targets.shift();
			}
		} else if (id === 'samesix') {
			format = this.getFormat(targets[0], room);
			if (!format || !format.tournamentPlayable) {
				return "You must specify a valid format for the Same Six tournament.";
			}
			targets.shift();

			if (targets.length < 6) return "You must specify the 6 Pokemon of the team.";

			for (let i = 0; i < 6; i++) {
				const pokemon = Dex.getPokemon(targets[0]);
				if (!pokemon) return CommandParser.getErrorText(['invalidPokemon', targets[0]]);
				if (pokemon.battleOnly) return "You cannot specify battle-only formes.";
				if (samePokemon.includes(pokemon.name) || (pokemon.forme && samePokemon.includes(pokemon.baseSpecies))) {
					return "The team already includes " + pokemon.name + "!";
				}
				samePokemon.push(pokemon.name);
				targets.shift();
			}
		} else {
			format = this.getFormat(formatName, room);
			if (!format) {
				if (targets.length) {
					tournamentName = formatName;
					formatName = targets[0];
					id = Tools.toId(formatName);
					targets.shift();

					format = this.getFormat(formatName, room);
				} else if (room) {
					const database = Storage.getDatabase(room);
					if (database.eventInformation && id in database.eventInformation && database.eventInformation[id].formatIds &&
						database.eventInformation[id].formatIds!.length) {
						const formatIds = Tools.shuffle(database.eventInformation[id].formatIds!);
						for (const formatId of formatIds) {
							const potentialFormat = this.getFormat(formatId, room);
							if (!potentialFormat || !potentialFormat.tournamentPlayable) continue;

							if ((room.tournament && room.tournament.format.id === potentialFormat.id) ||
								this.isInPastTournaments(room, potentialFormat.inputTarget)) {
								continue;
							}

							formatName = formatId;
							id = Tools.toId(formatName);
							format = potentialFormat;
							if (format.customFormatName) tournamentName = format.customFormatName;
							break;
						}

						if (!format) {
							return "All formats for " + database.eventInformation[id].name + " are either unplayable or on the past " +
								"tournaments list.";
						}
					}
				}
			}
		}

		if (!format || !format.tournamentPlayable) {
			return CommandParser.getErrorText(['invalidTournamentFormat', format ? format.name : formatName]);
		}

		if (room) {
			if (room.tournament && room.tournament.format.id === format.id) {
				return format.name + " is currently being played and cannot be queued.";
			}

			if (this.isInPastTournaments(room, format.inputTarget)) {
				return format.name + " is on the past tournaments list and cannot be queued.";
			}
		}

		if (targets.length || samePokemon.length) {
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
				if (!Tools.isInteger(trimmed)) {
					if (!customRules.includes(trimmed)) customRules.push(trimmed);
				}
			}

			if (customRules.length > existingCustomRules) {
				let formatid = Dex.joinNameAndCustomRules(format, Dex.resolveCustomRuleAliases(customRules));
				try {
					formatid = Dex.validateFormat(formatid);
				} catch (e) {
					return (e as Error).message;
				}

				format = Dex.getExistingFormat(formatid, true);
			}
		}

		if (tournamentName) format.tournamentName = tournamentName;
		return format;
	}

	resultsToEliminationNode(clientNode: IClientTournamentNode): EliminationNode<string> {
		const eliminationNode = new EliminationNode({user: Tools.stripHtmlCharacters(clientNode.team)});

		if (clientNode.children) {
			const children: EliminationNode<string>[] = [];
			for (const child of clientNode.children) {
				if (child.team) children.push(this.resultsToEliminationNode(child));
			}

			if (children.length === 2) eliminationNode.setChildren(children as [EliminationNode<string>, EliminationNode<string>]);
		}

		return eliminationNode;
	}

	bracketToEliminationNode(clientNode: IClientTournamentNode, players: Dict<Player>): EliminationNode<Player> {
		const id = Tools.toId(clientNode.team);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const eliminationNode = new EliminationNode({user: players[id] || null});

		if (clientNode.children) {
			const children: EliminationNode<Player>[] = [];
			for (const child of clientNode.children) {
				children.push(this.bracketToEliminationNode(child, players));
			}

			if (children.length === 2) eliminationNode.setChildren(children as [EliminationNode<Player>, EliminationNode<Player>]);
		}

		return eliminationNode;
	}

	bracketToStringEliminationNode(clientNode: IClientTournamentNode): EliminationNode<string> {
		const eliminationNode = new EliminationNode({user: clientNode.team ? Tools.stripHtmlCharacters(clientNode.team) : ""});

		if (clientNode.children) {
			const children: EliminationNode<string>[] = [];
			for (const child of clientNode.children) {
				children.push(this.bracketToStringEliminationNode(child));
			}

			if (children.length === 2) eliminationNode.setChildren(children as [EliminationNode<string>, EliminationNode<string>]);
		}

		return eliminationNode;
	}

	getPlacesFromTree<T>(treeRoot: EliminationNode<T>): ITreeRootPlaces<T> {
		const places: ITreeRootPlaces<T> = {
			winner: treeRoot.user,
			runnerup: null,
			semifinalists: null,
		};

		if (treeRoot.children) {
			let runnerup: T | null;
			if (treeRoot.children[0].user === treeRoot.user) {
				runnerup = treeRoot.children[1].user;
			} else {
				runnerup = treeRoot.children[0].user;
			}
			places.runnerup = runnerup;

			const semifinalists: T[] = [];
			if (treeRoot.children[0].children) {
				if (treeRoot.children[0].children[0].user === runnerup || treeRoot.children[0].children[0].user === treeRoot.user) {
					if (treeRoot.children[0].children[1].user) semifinalists.push(treeRoot.children[0].children[1].user);
				} else {
					if (treeRoot.children[0].children[0].user) semifinalists.push(treeRoot.children[0].children[0].user);
				}
			}

			if (treeRoot.children[1].children) {
				if (treeRoot.children[1].children[0].user === runnerup || treeRoot.children[1].children[0].user === treeRoot.user) {
					if (treeRoot.children[1].children[1].user) semifinalists.push(treeRoot.children[1].children[1].user);
				} else {
					if (treeRoot.children[1].children[0].user) semifinalists.push(treeRoot.children[1].children[0].user);
				}
			}

			if (semifinalists.length === 2) places.semifinalists = semifinalists;
		}

		return places;
	}

	getDefaultPlayerCap(room: Room): number {
		if (Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
			return Config.defaultTournamentPlayerCaps[room.id];
		} else {
			return this.maxPlayerCap;
		}
	}

	getPlayersPointMultiplier(players: number): number {
		return 1 + (Math.floor(players / 32) * 0.5);
	}

	getCombinedPointMultiplier(format: IFormat, players: number, official: boolean): number {
		let multiplier = 1;
		const ruleTable = Dex.getRuleTable(format);
		if (!ruleTable.pickedTeamSize || ruleTable.pickedTeamSize > 2) {
			if (players >= 32) {
				multiplier = this.getPlayersPointMultiplier(players);
			}
		}

		if (official) multiplier *= 2.5;

		return multiplier;
	}

	getPlacePoints(place: TournamentPlace, format: IFormat, players: number, official: boolean): number {
		const multiplier = this.getCombinedPointMultiplier(format, players, official);

		if (place === 'semifinalist') {
			return this.getSemiFinalistPoints(multiplier);
		} else if (place === 'runnerup') {
			return this.getRunnerUpPoints(multiplier);
		} else {
			return this.getWinnerPoints(multiplier);
		}
	}

	getSemiFinalistPoints(multiplier: number): number {
		return Math.round(this.semiFinalistPoints * multiplier);
	}

	getRunnerUpPoints(multiplier: number): number {
		return Math.round(this.runnerUpPoints * multiplier);
	}

	getWinnerPoints(multiplier: number): number {
		return Math.round(this.winnerPoints * multiplier);
	}

	getPlacesHtml(leaderboardType: LeaderboardType, tournamentName: string, winners: string[], runnersUp: string[], semiFinalists: string[],
		winnerPoints: number, runnerUpPoints: number, semiFinalistPoints: number): string {
		const pointsName = leaderboardType === 'gameLeaderboard' ? 'bit' : 'point';
		const placesHtml: string[] = [];

		const runnersUpHtml = "runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '<b>', '</b>') + " for " +
			"earning " + runnerUpPoints + " " + pointsName + "s";
		if (winners.length) {
			placesHtml.push(runnersUpHtml);
			placesHtml.push("winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '<b>', '</b>') + " for earning " +
				winnerPoints + " " + pointsName + "s in the " + tournamentName + " tournament!");
		} else {
			placesHtml.push(runnersUpHtml + " in the " + tournamentName + " tournament!");
		}

		if (semiFinalists.length) {
			placesHtml.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " +
				Tools.joinList(semiFinalists, '<b>', '</b>') + " for earning " + semiFinalistPoints + " " + pointsName +
				(semiFinalistPoints > 1 ? "s" : ""));
		}

		return "Congratulations to " + Tools.joinList(placesHtml);
	}

	getFormatLeaderboardHtml(room: Room, format: IFormat): string {
		const database = Storage.getDatabase(room);
		if (!database.tournamentLeaderboard) return "";

		const players: string[] = [];
		for (const i in database.tournamentLeaderboard.entries) {
			if (format.id in database.tournamentLeaderboard.entries[i].sources) {
				players.push(i);
				if (players.length > 100) break;
			}
		}

		if (!players.length) return "";

		players.sort((a, b) => {
			return database.tournamentLeaderboard!.entries[b].sources[format.id] -
				database.tournamentLeaderboard!.entries[a].sources[format.id];
		});

		let html = "<center><b>" + format.name + " leaderboard</b><br /><br /><table border='2' style='table-layout: fixed;width: 500px'>" +
			"<tr><th>Place</th><th>Name</th><th>Points</th></tr>";
		for (let i = 0; i < players.length; i++) {
			const id = players[i];
			let place = Tools.toNumberOrderString(i + 1);
			let name = database.tournamentLeaderboard.entries[id].name;
			let points = "" + database.tournamentLeaderboard.entries[id].sources[format.id];
			if (i === 0) {
				place = "<b>" + place + "</b>";
				name = "<b>" + name + "</b>";
				points = "<b>" + points + "</b>";
			}

			html += "<tr><td>" + place + "</td><td>" + name + "</td><td>" + points + "</td></tr>";
		}

		html += "</table></center>";
		return html;
	}

	setNextTournament(room: Room): void {
		this.setOfficialTournament(room);

		const database = Storage.getDatabase(room);
		if (database.queuedTournament && (!(room.id in this.nextOfficialTournaments) ||
			database.queuedTournament.time < this.nextOfficialTournaments[room.id]!.time)) {
			const format = this.getFormat(database.queuedTournament.formatid, room);
			if (format && format.effectType === 'Format') {
				const now = Date.now();
				if (database.queuedTournament.time <= now) database.queuedTournament.time = now + this.delayedOfficialTournamentTime;

				this.setTournamentTimer(room, database.queuedTournament.time, {format, cap: database.queuedTournament.playerCap,
					name: database.queuedTournament.tournamentName});
			}
		}
	}

	setOfficialTournament(room: Room): void {
		if (!(room.id in this.officialTournaments)) return;

		delete this.nextOfficialTournaments[room.id];

		const now = Date.now();
		let nextOfficialIndex = -1;

		for (let i = 0; i < this.officialTournaments[room.id]!.length; i++) {
			if (this.officialTournaments[room.id]![i].time >= now) {
				nextOfficialIndex = i;
				break;
			}
		}

		if (nextOfficialIndex === -1) return;

		if (nextOfficialIndex > 0) {
			this.officialTournaments[room.id] = this.officialTournaments[room.id]!.slice(nextOfficialIndex);
		}

		this.nextOfficialTournaments[room.id] = this.officialTournaments[room.id]![0];
		this.setOfficialTournamentTimer(room);
	}

	setOfficialTournamentTimer(room: Room): void {
		if (!(room.id in this.nextOfficialTournaments)) return;

		const format = this.getFormat(this.nextOfficialTournaments[room.id]!.format, room) ||
			Dex.getExistingFormat(DEFAULT_OFFICIAL_TOURNAMENT);

		this.setTournamentTimer(room, this.nextOfficialTournaments[room.id]!.time, {format, cap: this.maxPlayerCap,
			official: true, endOfCycle: this.nextOfficialTournaments[room.id]!.endOfCycle, name: format.customFormatName});
	}

	canSetRandomTournament(room: Room): boolean {
		if (!(room.id in this.nextOfficialTournaments)) return true;
		return this.nextOfficialTournaments[room.id]!.time - Date.now() > OFFICIAL_TOURNAMENT_BUFFER_TIME;
	}

	canSetRandomQuickTournament(room: Room): boolean {
		if (!(room.id in this.nextOfficialTournaments)) return true;
		return this.nextOfficialTournaments[room.id]!.time - Date.now() > OFFICIAL_TOURNAMENT_QUICK_BUFFER_TIME;
	}

	setRandomTournamentTimer(room: Room, minutes: number, quickFormat?: boolean): void {
		let officialFormat: IFormat | undefined;
		if (room.id in this.nextOfficialTournaments) {
			officialFormat = this.getFormat(this.nextOfficialTournaments[room.id]!.format, room);
		}

		const database = Storage.getDatabase(room);
		const pastTournamentIds: string[] = [];
		if (database.pastTournaments) {
			for (const pastTournament of database.pastTournaments) {
				const format = this.getFormat(pastTournament.inputTarget, room);
				pastTournamentIds.push(format ? format.id : Tools.toId(pastTournament.name));
			}
		}

		const customFormats: string[] = [];
		if (Config.customFormatRandomTournaments && Config.customFormatRandomTournaments.includes(room.id) && database.customFormats) {
			for (const i in database.customFormats) {
				const format = this.getFormat(database.customFormats[i].name, room);
				if (!format) continue;

				customFormats.push(database.customFormats[i].name);
			}
		}

		let allowPastGen = false;
		let allowUnranked = false;
		let canAddCustomRules = true;
		let formatsPool: readonly string[];
		if (customFormats.length) {
			allowPastGen = true;
			canAddCustomRules = false;
			formatsPool = customFormats;
		} else if (database.randomTournamentFormats && database.randomTournamentFormats.length) {
			allowPastGen = true;
			allowUnranked = true;
			formatsPool = database.randomTournamentFormats;
		} else {
			formatsPool = Dex.getData().formatKeys;
		}

		const currentGenMod = Dex.getCurrentGenMod();
		const validFormats: IFormat[] = [];
		for (const i of formatsPool) {
			const format = this.getFormat(i, room);
			if (!format || !format.tournamentPlayable || (officialFormat && officialFormat.id === format.id) ||
				(format.unranked && !allowUnranked) || (format.mod !== currentGenMod && !allowPastGen)) continue;

			if (quickFormat) {
				if (!format.quickFormat) continue;
			} else {
				if (format.quickFormat || pastTournamentIds.includes(format.id)) continue;
			}

			validFormats.push(format);
		}

		if (!validFormats.length) return;

		let format = Tools.sampleOne(validFormats);
		if (canAddCustomRules && Config.randomTournamentCustomRules && room.id in Config.randomTournamentCustomRules) {
			const rules = Tools.shuffle(Config.randomTournamentCustomRules[room.id]);
			for (const rule of rules) {
				const customRuleFormat = this.getFormat(format.id + "@@@" + rule, room);
				if (customRuleFormat && customRuleFormat.customRules) {
					format = customRuleFormat;
					break;
				}
			}
		}

		this.setTournamentTimer(room, Date.now() + (minutes * 60 * 1000) + this.delayedOfficialTournamentTime, {format,
			cap: this.getDefaultPlayerCap(room)});
	}

	setTournamentTimer(room: Room, startTime: number, options: ICreateTournamentOptions): void {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);

		let timer = startTime - Date.now();
		if (timer <= 0) timer = this.delayedOfficialTournamentTime;

		this.tournamentTimerData[room.id] = {
			cap: options.cap,
			formatid: options.format.inputTarget,
			startTime,
			official: options.official,
			endOfCycle: options.endOfCycle,
			name: options.name,
		};

		this.tournamentTimers[room.id] = setTimeout(() => {
			this.createTournament(room, options);
		}, timer);
	}

	createTournament(room: Room, options: ICreateTournamentOptions): void {
		if (room.tournament) return;

		// may be set by a non-tournament activity
		if (room.id in this.createListeners) {
			if (options.name && !this.createListeners[room.id]!.name) this.createListeners[room.id]!.name = options.name;
		} else {
			this.createListeners[room.id] = options;
		}

		room.createTournament(options.format, options.type || 'elimination', options.cap, options.name);

		if (room.id in this.tournamentTimers) {
			clearTimeout(this.tournamentTimers[room.id]);
			delete this.tournamentTimers[room.id];
			delete this.tournamentTimerData[room.id];
		}
	}

	onTournamentEnd(room: Room, now: number): void {
		// delayed official tournament
		if (room.id in this.nextOfficialTournaments && this.nextOfficialTournaments[room.id]!.time <= now) {
			this.setOfficialTournamentTimer(room);
		} else {
			const database = Storage.getDatabase(room);
			let queuedTournament = false;

			if (database.queuedTournament) {
				const format = this.getFormat(database.queuedTournament.formatid, room);
				if (format && format.effectType === 'Format') {
					queuedTournament = true;
					// the time may be set on room init since room tournament state is unknown
					if (!database.queuedTournament.time || database.queuedTournament.time <= now) {
						database.queuedTournament.time = now + this.queuedTournamentTime;
					}

					this.setTournamentTimer(room, database.queuedTournament.time, {format, cap: database.queuedTournament.playerCap,
						official: database.queuedTournament.official, endOfCycle: database.queuedTournament.endOfCycle});
				} else {
					delete database.queuedTournament;
					Storage.tryExportDatabase(room.id);
				}
			}

			if (!queuedTournament) {
				let setRandomTournament = false;
				if (Config.randomTournamentTimers && room.id in Config.randomTournamentTimers) {
					if (this.canSetRandomTournament(room)) {
						this.setRandomTournamentTimer(room, Config.randomTournamentTimers[room.id]);
						setRandomTournament = true;
					} else if (this.canSetRandomQuickTournament(room)) {
						this.setRandomTournamentTimer(room, Config.randomTournamentTimers[room.id], true);
						setRandomTournament = true;
					}
				}

				if (!setRandomTournament && room.id in this.officialTournaments) {
					this.setOfficialTournamentTimer(room);
				}
			}
		}
	}

	getTournamentScheduleHtml(room: Room, year: number, month: string, websiteHtml?: boolean): string {
		const database = Storage.getDatabase(room);
		if (!database.officialTournamentSchedule || !(year in database.officialTournamentSchedule.years) ||
			!(month in database.officialTournamentSchedule.years[year].months)) return "";

		const schedule = database.officialTournamentSchedule.years[year].months[month];
		const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const date = new Date();
		date.setFullYear(year);
		date.setMonth(parseInt(month) - 1, 1);
		date.setDate(1);
		const firstDay = date.getDay();
		const lastDay = Tools.getLastDayOfMonth(date) + 1;
		let currentDay = firstDay;

		let html = "<table style='overflow: hidden;";
		if (websiteHtml) html += "font-size: 14px;";
		html += "border-collapse: collapse'><tr>" + daysOfTheWeek.map(x => "<th>" + x + "</th>").join("") + "</tr><tr>";

		for (let i = 0; i < currentDay; i++) {
			html += "<td>&nbsp;</td>";
		}
		for (let i = 1; i < lastDay; i++) {
			let name = "";
			if (schedule.days[i]) {
				const format = this.getFormat(schedule.days[i]!.format, room);
				if (format) name = Dex.getCustomFormatName(format, websiteHtml);
			}

			if (!name) name = Dex.getCustomFormatName(Dex.getExistingFormat(DEFAULT_OFFICIAL_TOURNAMENT), websiteHtml);

			html += "<td style='padding: 4px'><b>" + i + "</b> - " + name + "</td>";
			currentDay++;
			if (currentDay === 7) {
				html += "</tr><tr>";
				currentDay = 0;
			}
		}
		html += "</tr></table>";
		return html;
	}

	getUserHostedTournamentApprovalHtml(room: Room): string {
		let html = '<table border="1" style="width:auto"><tr><th style="width:150px">Username</th><th style="width:150px">Link</th>' +
			'<th style="width:150px">Reviewer</th><th style="width:200px">Status</th></tr>';
		const rows: string[] = [];
		for (const link in room.newUserHostedTournaments) {
			if (link !== room.newUserHostedTournaments[link].bracketUrl) continue;

			const tournament = room.newUserHostedTournaments[link];
			let row = '<tr><td>' + tournament.hostName + '</td>';
			row += '<td><center><a href="' + link + '">' + link + '</a></center></td>';

			row += '<td><center>';
			if (tournament.reviewer) {
				let name = tournament.reviewer;
				const reviewer = Users.get(name);
				if (reviewer) name = reviewer.name;
				row += name;
			} else {
				row += "--- " + Client.getPmSelfButton(Config.commandCharacter + "reviewuserhostedtour " + room.id + ", " + link, "Review");
			}
			row += '</center></td>';

			row += '<td><center>';
			if (tournament.approvalStatus === 'changes-requested') {
				row += 'Changes requested | ';
				row += Client.getPmSelfButton(Config.commandCharacter + "removeuserhostedtour " + room.id + ", " + link, "Remove") + " | ";
				row += Client.getPmSelfButton(Config.commandCharacter + "approveuserhostedtour " + room.id + ", " + link, "Approve");
			} else {
				row += Client.getPmSelfButton(Config.commandCharacter + "approveuserhostedtour " + room.id + ", " + link, "Approve") +
					" | ";
				row += Client.getPmSelfButton(Config.commandCharacter + "rejectuserhostedtour " + room.id + ", " + link, "Reject");
			}
			row += '</center></td>';

			row += '</tr>';
			rows.push(row);
		}

		if (!rows.length) return "";

		html += rows.join("") + '</table>';

		return html;
	}

	showUserHostedTournamentApprovals(room: Room): void {
		let rank = USER_HOSTED_TOURNAMENT_RANK;
		if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) {
			rank = Config.userHostedTournamentRanks[room.id].review;
		}
		if (!Object.keys(room.newUserHostedTournaments!).length) {
			if (rank === 'voice') {
				room.sayAuthUhtmlChange("userhosted-tournament-approvals", "<div></div>");
			} else {
				room.sayModUhtmlChange("userhosted-tournament-approvals", "<div></div>", rank);
			}
			if (room.id in this.userHostedTournamentNotificationTimeouts) {
				clearTimeout(this.userHostedTournamentNotificationTimeouts[room.id]);
				room.notifyOffRank(rank);
				delete this.userHostedTournamentNotificationTimeouts[room.id];
			}
			return;
		}

		const html = this.getUserHostedTournamentApprovalHtml(room);
		let unreviewed = false;
		for (const link in room.newUserHostedTournaments) {
			if (link === room.newUserHostedTournaments[link].bracketUrl && !room.newUserHostedTournaments[link].reviewer) {
				unreviewed = true;
				break;
			}
		}

		if (rank === 'voice') {
			room.sayAuthUhtml("userhosted-tournament-approvals", html);
		} else {
			room.sayModUhtml("userhosted-tournament-approvals", html, rank);
		}

		if (unreviewed) {
			const title = 'Unreviewed user-hosted tournaments!';
			const message = 'There are new user-hosted tournaments in ' + room.title;
			if (room.id in this.userHostedTournamentNotificationTimeouts) return;
			room.notifyRank(rank, title, message, "New Challonge tournament to review");
			this.setUserHostedTournamentNotificationTimer(room);
		} else if (room.id in this.userHostedTournamentNotificationTimeouts) {
			clearTimeout(this.userHostedTournamentNotificationTimeouts[room.id]);
			room.notifyOffRank(rank);
			delete this.userHostedTournamentNotificationTimeouts[room.id];
		}
	}

	setUserHostedTournamentNotificationTimer(room: Room): void {
		this.userHostedTournamentNotificationTimeouts[room.id] = setTimeout(() => {
			delete this.userHostedTournamentNotificationTimeouts[room.id];
			this.showUserHostedTournamentApprovals(room);
		}, USER_HOSTED_TOURNAMENT_TIMEOUT);
	}

	isInPastTournaments(room: Room, input: string, pastTournaments?: IPastTournament[]): boolean {
		if (!pastTournaments) {
			const database = Storage.getDatabase(room);
			if (!database.pastTournaments || !(Config.disallowQueueingPastTournaments &&
				Config.disallowQueueingPastTournaments.includes(room.id))) return false;
			pastTournaments = database.pastTournaments;
		}

		const format = this.getFormat(input, room);
		const formatId = format ? format.id : Tools.toId(input);

		for (const pastTournament of pastTournaments) {
			const pastFormat = this.getFormat(pastTournament.inputTarget, room);
			if (pastFormat && pastFormat.quickFormat) continue;
			const id = pastFormat ? pastFormat.id : Tools.toId(pastTournament.name);
			if (formatId === id) return true;
		}

		return false;
	}

	getBadgeHtml(database: IDatabase, id: string): string {
		if (database.tournamentTrainerCardBadges && id in database.tournamentTrainerCardBadges) {
			return '<img src="' + database.tournamentTrainerCardBadges[id].source + '" ' +
				'width=' + database.tournamentTrainerCardBadges[id].width + 'px ' +
				'height=' + database.tournamentTrainerCardBadges[id].height + 'px ' +
				'title="' + database.tournamentTrainerCardBadges[id].name + '" />';
		}

		return "";
	}

	getRibbonHtml(room: Room, database: IDatabase, id: string): string {
		if (database.tournamentTrainerCardRibbons && id in database.tournamentTrainerCardRibbons) {
			return '<img src="' + database.tournamentTrainerCardRibbons[id].source + '" ' +
				'width=' + database.tournamentTrainerCardRibbons[id].width + 'px ' +
				'height=' + database.tournamentTrainerCardRibbons[id].height + 'px ' +
				'title="' + database.tournamentTrainerCardRibbons[id].name + '" />';
		}

		if (Config.tournamentPointsShopRibbons && room.id in Config.tournamentPointsShopRibbons &&
			id in Config.tournamentPointsShopRibbons[room.id]) {
			return '<img src="' + Config.tournamentPointsShopRibbons[room.id][id].source + '" ' +
				'width=' + TRAINER_BADGE_DIMENSIONS + 'px ' +
				'height=' + TRAINER_BADGE_DIMENSIONS + 'px ' +
				'title="' + Config.tournamentPointsShopRibbons[room.id][id].name + '" />';
		}

		return "";
	}

	getTrainerCardRoom(room: Room): Room | undefined {
		if (Config.sharedTournamentTrainerCards && room.id in Config.sharedTournamentTrainerCards) {
			return Rooms.get(Config.sharedTournamentTrainerCards[room.id]);
		}
		return room;
	}

	getTrainerCardHtml(room: Room, name: string): string {
		const id = Tools.toId(name);
		const trainerCardRoom = this.getTrainerCardRoom(room);
		if (!trainerCardRoom) return "";

		const database = Storage.getDatabase(trainerCardRoom);
		if (!database.tournamentTrainerCards || !(id in database.tournamentTrainerCards)) return "";

		const trainerCard = database.tournamentTrainerCards[id];

		let html = '<center><div style="width: 100%"><table style="border-collapse: collapse; width: 500px;">';
		html += '<tr style="border: 1px solid;"><td style="border: 1px solid;' + Tools.getHexBackground(trainerCard.header) +
			'" colspan="3"><center><b>Trainer Profile</b></center></td></tr>';
		html += '<tr style="border: 1px solid;' + Tools.getHexBackground(trainerCard.table) + '">';

		const user = Users.get(name);
		html += '<td style="border: 1px solid; padding: 7px 8px 8px 6px;"><username>' + (user ? user.name : name) + '</username>';
		if (user && user.hasRank(room, 'voice')) {
			const groups = Client.getServerGroups();

			const rank = user.rooms.get(room)!.rank;
			const roomGroup = rank in groups ? groups[rank] : undefined;
			const globalGroup = user.globalRank && user.globalRank in groups ? groups[user.globalRank] : undefined;
			if (roomGroup && roomGroup.name && roomGroup.type !== 'punishment' && user.isRoomauth(room)) {
				html += "<br /><i>" + (!roomGroup.name.startsWith("Room ") ? "Room " : "") + roomGroup.name + "</i>";
			}

			if (globalGroup && globalGroup.name && globalGroup.type !== 'punishment') {
				html += "<br /><i>Global " + globalGroup.name + "</i>";
			}
		}

		const tournamentPoints = Storage.getAnnualPoints(room, Storage.tournamentLeaderboard, name);
		if (tournamentPoints) {
			html += "<br />" + tournamentPoints + " annual point" + (tournamentPoints > 1 ? "s" : "");
		}

		const gamePoints = Storage.getAnnualPoints(room, Storage.gameLeaderboard, name);
		if (gamePoints) {
			html += "<br />" + gamePoints + " annual bit" + (gamePoints > 1 ? "s" : "");
		}

		if (trainerCard.favoriteFormat) html += "<br /><b>Favorite format</b>: " + trainerCard.favoriteFormat;

		html += "</td>";

		if (trainerCard.pokemon) {
			const iconBorder = 1;
			const iconBorderStyle = iconBorder + "px solid";
			const iconsPerLine = 3;
			const pokemonHtml: string[] = [];
			for (let i = 0; i < 6; i++) {
				const pokemon = trainerCard.pokemon[i] ? Dex.getPokemon(trainerCard.pokemon[i]) : undefined;
				let icon = Dex.getPokemonIcon(pokemon, false, iconBorderStyle);
				if (icon) {
					if (pokemonHtml.length && pokemonHtml.length % iconsPerLine === 0) icon = "<br />" + icon;
					pokemonHtml.push(icon);
				}
			}

			if (pokemonHtml.length) {
				const iconWidth = Dex.getPokemonIconWidth() + (iconBorder * 2);
				html += '<td style="border: 1px solid; padding: 0px; width: ' + (iconWidth * iconsPerLine) + 'px;"><center>' +
					pokemonHtml.join("") + '</center></td>';
			}
		}

		html += '<td style="border: 1px solid; padding: 0px; width: 80px;">';
		let avatarHtml = "";
		if (trainerCard.avatar && trainerCard.customAvatar) {
			avatarHtml = Dex.getCustomTrainerSprite(trainerCard.avatar);
		} else {
			let avatarSpriteId: string | undefined;
			if (trainerCard.avatar) {
				avatarSpriteId = Dex.getTrainerSpriteId(trainerCard.avatar);
			}

			avatarHtml = Dex.getTrainerSprite(avatarSpriteId || Dex.getRandomDefaultTrainerSpriteId());
		}
		html += avatarHtml;
		html += "</td>";

		const footerBackground = Tools.getHexBackground(trainerCard.footer || trainerCard.header);
		if (trainerCard.badges && trainerCard.badges.length) {
			const badgesPerLine = 15;
			const badgesHtml: string[] = [];
			for (const badge of trainerCard.badges) {
				let badgeHtml = this.getBadgeHtml(database, badge);
				if (badgeHtml) {
					if (badgesHtml.length && badgesHtml.length % badgesPerLine === 0) badgeHtml = "<br />" + badgeHtml;
					badgesHtml.push(badgeHtml);
				}
			}

			if (badgesHtml.length) {
				html += '<tr style="border: 1px solid; padding: 4px;"><td style="border: 1px solid;' + footerBackground + '" colspan="3">' +
					'<b>Badges</b>: ' + badgesHtml.join(" ") + '</td></tr>';
			}
		}

		if (trainerCard.ribbons && trainerCard.ribbons.length) {
			const ribbonsPerLine = 15;
			const ribbonsHtml: string[] = [];
			for (const ribbon of trainerCard.ribbons) {
				let ribbonHtml = this.getRibbonHtml(trainerCardRoom, database, ribbon);
				if (ribbonHtml) {
					if (ribbonsHtml.length && ribbonsHtml.length % ribbonsPerLine === 0) ribbonHtml = "<br />" + ribbonHtml;
					ribbonsHtml.push(ribbonHtml);
				}
			}

			if (ribbonsHtml.length) {
				html += '<tr style="border: 1px solid; padding: 4px;"><td style="border: 1px solid;' + footerBackground + '" colspan="3">' +
					'<b>Ribbons</b>: ' + ribbonsHtml.join(" ") + '</td></tr>';
			}
		}

		if (trainerCard.bio) {
			html += '<tr style="border: 1px solid; padding: 4px;"><td style="border: 1px solid;' + footerBackground + '" colspan="3">' +
				'<b>Bio</b>: ' + Tools.stripHtmlCharacters(trainerCard.bio) + '</td></tr>';
		}

		html += "</table></div></center>";
		return html;
	}

	displayTrainerCard(room: Room, name: string, htmlBefore?: string, htmlAfter?: string): void {
		const trainerCardRoom = this.getTrainerCardRoom(room);
		if (trainerCardRoom) {
			const sendTrainerCard = (username: string): void => {
				const trainerCard = this.getTrainerCardHtml(room, username);
				if (trainerCard) {
					room.sayHtml((htmlBefore || "") + trainerCard + (htmlAfter || ""));
				} else if (htmlBefore || htmlAfter) {
					room.sayHtml((htmlBefore || "") + (htmlAfter || ""));
				}
			};

			const database = Storage.getDatabase(trainerCardRoom);
			const user = Users.get(name);
			if (user && (!user.globalRank || !database.tournamentTrainerCards || !(user.id in database.tournamentTrainerCards))) {
				const updateTrainerCard = (avatar?: string): void => {
					Storage.createTournamentTrainerCard(database, user.name);
					if (!database.tournamentTrainerCards![user.id].avatar && avatar) {
						database.tournamentTrainerCards![user.id].avatar = avatar as TrainerSpriteId;
					}

					sendTrainerCard(user.name);
				};

				if (user.avatar && user.globalRank) {
					updateTrainerCard(user.avatar);
				} else {
					Client.getUserDetails(user, (checkedUser) => {
						updateTrainerCard(Dex.getTrainerSpriteId(checkedUser.avatar || ""));
					});
				}
			} else {
				sendTrainerCard(name);
			}
		}
	}

	hasTournamentPointsShopItems(room: Room): boolean {
		if (!Config.tournamentPointsShop || !Config.tournamentPointsShop.includes(room.id)) return false;

		const trainerCardRoom = this.getTrainerCardRoom(room);
		if (!trainerCardRoom) return false;

		if (Config.tournamentPointsShopRibbons && trainerCardRoom.id in Config.tournamentPointsShopRibbons) return true;

		return false;
	}

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	private onReload(previous: Tournaments): void {
		if (previous.createListeners) Object.assign(this.createListeners, previous.createListeners);
		if (previous.nextOfficialTournaments) Object.assign(this.nextOfficialTournaments, previous.nextOfficialTournaments);

		if (previous.tournamentTimers) {
			for (const i in previous.tournamentTimers) {
				clearTimeout(previous.tournamentTimers[i]);
				previous.tournamentTimers[i] = undefined;
			}
		}

		this.loadSchedules();

		if (previous.userHostedTournamentNotificationTimeouts) {
			for (const i in previous.userHostedTournamentNotificationTimeouts) {
				clearTimeout(previous.userHostedTournamentNotificationTimeouts[i]);
				previous.userHostedTournamentNotificationTimeouts[i] = undefined;

				const room = Rooms.get(i);
				if (room) this.setUserHostedTournamentNotificationTimer(room);
			}
		}

		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (room.id in this.officialTournaments && (!(room.id in this.nextOfficialTournaments) ||
				now < this.nextOfficialTournaments[room.id]!.time)) {
				this.setOfficialTournament(room);
			}
		});

		if (previous.tournamentTimerData) {
			for (const i in previous.tournamentTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.tournamentTimerData[i]!;
					const format = this.getFormat(data.formatid, room);
					if (format && format.effectType === 'Format') {
						this.setTournamentTimer(room, data.startTime, {format, cap: data.cap,
							official: data.official, endOfCycle: data.endOfCycle, name: data.name});
					}
				}
			}
		}

		Tools.unrefProperties(previous);
	}
	/* eslint-enable */
}

export const instantiate = (): void => {
	let oldTournaments = global.Tournaments as Tournaments | undefined;

	global.Tournaments = new Tournaments();

	if (oldTournaments) {
		// @ts-expect-error
		global.Tournaments.onReload(oldTournaments);
		oldTournaments = undefined;
	}
};