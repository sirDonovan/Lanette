import { EliminationNode } from "./lib/elimination-node";
import type { Player } from "./room-activity";
import type { ScriptedGame } from "./room-game-scripted";
import { Tournament } from "./room-tournament";
import type { Room } from "./rooms";
import { tournamentSchedules } from './tournament-schedules';
import type { GroupName } from "./types/client";
import type { TrainerSpriteId } from "./types/dex";
import type { IFormat } from "./types/pokemon-showdown";
import type { IPastTournament, LeaderboardType } from "./types/storage";
import type {
	IClientTournamentNode, IScheduledTournament, ITournamentCreateJson, ITournamentTimerData, ITreeRootPlaces,
	TournamentPlace
} from "./types/tournaments";
import type { User } from "./users";

const TRAINER_BADGE_DIMENSIONS = 24;
const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const SCHEDULED_TOURNAMENT_QUICK_BUFFER_TIME = 30 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';

export class Tournaments {
	// exported constants
	readonly delayedScheduledTournamentTime: number = 15 * 1000;
	readonly maxPlayerCap: number = 128;
	readonly minPlayerCap: number = 4;
	readonly winnerPoints: number = 3;
	readonly queuedTournamentTime: number = 5 * 60 * 1000;
	readonly runnerUpPoints: number = 2;
	readonly semiFinalistPoints: number = 1;

	createListeners: Dict<{format: IFormat; game?: ScriptedGame, scheduled?: boolean, callback?: () => void}> = {};
	private nextScheduledTournaments: Dict<IScheduledTournament> = {};
	private scheduledTournaments: Dict<Dict<IScheduledTournament[]>> = {};
	private readonly schedules: typeof tournamentSchedules = tournamentSchedules;
	private tournamentTimerData: Dict<ITournamentTimerData> = {};
	private tournamentTimers: Dict<NodeJS.Timer> = {};
	private userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timer> = {};

	getNextScheduledTournaments(): DeepImmutable<Dict<IScheduledTournament>> {
		return this.nextScheduledTournaments;
	}

	loadSchedules(): void {
		for (const server in this.schedules) {
			const rooms = Object.keys(this.schedules[server]);
			for (const room of rooms) {
				const id = Tools.toRoomId(room);
				if (id !== room) {
					this.schedules[server][id] = this.schedules[server][room];
					delete this.schedules[server][room];
				}
			}
		}

		for (const server in this.schedules) {
			this.scheduledTournaments[server] = {};

			for (const room in this.schedules[server]) {
				this.scheduledTournaments[server][room] = [];

				for (const month in this.schedules[server][room].months) {
					for (const day in this.schedules[server][room].months[month].formats) {
						const scheduled = this.schedules[server][room].months[month].formats[day];
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
							const format = Dex.getExistingFormat(formatId + (customRules.length ? "@@@" + customRules.join(",") : ""));
							this.schedules[server][room].months[month].formats[day] = Dex
								.validateFormat(Dex.joinNameAndCustomRules(format, format.customRules));
						} catch (e) {
							throw new Error(month + "/" + day + " in " + room + ": " + (e as Error).message);
						}
					}
				}

				const months = Object.keys(this.schedules[server][room].months).map(x => parseInt(x));
				let month = months[0];
				months.shift();

				let formats = this.schedules[server][room].months[month].formats;
				let times = this.schedules[server][room].months[month].times;
				let formatIndex = times[0][0] > times[1][0] ? 2 : 1;
				const date = new Date();
				let day = 1;
				date.setMonth(month - 1, day);
				date.setDate(day);
				date.setFullYear(this.schedules[server][room].months[month].year);
				let lastDayOfMonth = Tools.getLastDayOfMonth(date);

				const rolloverDay = (): void => {
					formatIndex++;
					if (!formats[formatIndex]) {
						if (months.length) {
							formats = this.schedules[server][room].months[months[0]].formats;
							formatIndex = 1;
						} else {
							formatIndex--;
						}
					}

					day++;
					if (day > lastDayOfMonth) {
						day = 1;
						const previousMonth = month;
						month = months[0];
						months.shift();
						if (month) {
							date.setMonth(month - 1, day);
							date.setFullYear(this.schedules[server][room].months[month].year);

							times = this.schedules[server][room].months[month].times;
							lastDayOfMonth = Tools.getLastDayOfMonth(date);
						} else {
							// previousMonth + 1 - 1
							date.setMonth(previousMonth, day);
						}
					}
					date.setDate(day);
				};

				// month is eventually undefined due to rolloverDay()
				while (month) {
					const format = formats[formatIndex];
					let rolledOverDay = false;
					for (let i = 0; i < times.length; i++) {
						if (i > 0 && times[i][0] < times[i - 1][0]) {
							rolloverDay();
							rolledOverDay = true;
						}

						date.setHours(times[i][0], times[i][1], 0, 0);
						this.scheduledTournaments[server][room].push({format, time: date.getTime()});
					}

					if (!rolledOverDay) rolloverDay();
				}

				this.scheduledTournaments[server][room].sort((a, b) => a.time - b.time);
			}
		}
	}

	canCreateTournament(room: Room, user: User): boolean {
		const database = Storage.getDatabase(room);
		if (database.tournamentManagers && database.tournamentManagers.includes(user.id)) return true;
		return user.hasRank(room, 'driver');
	}

	createTournament(room: Room, json: ITournamentCreateJson): Tournament | undefined {
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

			if (room.id in this.createListeners && format.id === this.createListeners[room.id].format.id) {
				if (this.createListeners[room.id].scheduled) {
					tournament.scheduled = true;
					this.setScheduledTournament(room);
				}

				if (this.createListeners[room.id].game) {
					tournament.battleRoomGame = this.createListeners[room.id].game;
				}

				tournament.format = this.createListeners[room.id].format;
				if (tournament.format.customRules) {
					tournament.setCustomFormatName();
					room.setTournamentRules(tournament.format.customRules.join(","));
				}

				if (this.createListeners[room.id].callback) {
					this.createListeners[room.id].callback!();
				}

				const database = Storage.getDatabase(room);
				if (database.queuedTournament) {
					const queuedFormat = Dex.getFormat(database.queuedTournament.formatid, true);
					if (!queuedFormat || queuedFormat.effectType !== 'Format' || tournament.format.id === queuedFormat.id) {
						delete database.queuedTournament;
						updatedDatabase = true;
					}
				}

				delete this.createListeners[room.id];
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
				if (tournament.scheduled) startMinutes *= 2;
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
			format = Dex.getFormat(targets[0]);
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
			format = Dex.getFormat(formatName);
			if (!format && targets.length) {
				tournamentName = formatName;
				formatName = targets[0];
				id = Tools.toId(formatName);
				targets.shift();

				format = Dex.getFormat(formatName);
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

	getPlayersPointMultiplier(players: number): number {
		return 1 + (Math.floor(players / 32) * 0.5);
	}

	getCombinedPointMultiplier(format: IFormat, players: number, scheduled: boolean): number {
		let multiplier = 1;
		const ruleTable = Dex.getRuleTable(format);
		if (!ruleTable.pickedTeamSize || ruleTable.pickedTeamSize > 2) {
			if (players >= 32) {
				multiplier = this.getPlayersPointMultiplier(players);
			}
		}

		if (scheduled) multiplier *= 2.5;

		return multiplier;
	}

	getPlacePoints(place: TournamentPlace, format: IFormat, players: number, scheduled: boolean): number {
		const multiplier = this.getCombinedPointMultiplier(format, players, scheduled);

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
		this.setScheduledTournament(room);

		const database = Storage.getDatabase(room);
		if (database.queuedTournament && (!(room.id in this.nextScheduledTournaments) ||
			database.queuedTournament.time < this.nextScheduledTournaments[room.id].time)) {
			const format = Dex.getFormat(database.queuedTournament.formatid);
			if (format && format.effectType === 'Format') {
				const now = Date.now();
				if (database.queuedTournament.time <= now) database.queuedTournament.time = now + this.delayedScheduledTournamentTime;

				this.setTournamentTimer(room, database.queuedTournament.time, format, database.queuedTournament.playerCap, false,
					database.queuedTournament.tournamentName);
			}
		}
	}

	setScheduledTournament(room: Room): void {
		const serverId = Client.getServerId();
		if (!(serverId in this.scheduledTournaments) || !(room.id in this.scheduledTournaments[serverId])) return;

		delete this.nextScheduledTournaments[room.id];

		const now = Date.now();
		let nextScheduledIndex = -1;

		for (let i = 0; i < this.scheduledTournaments[serverId][room.id].length; i++) {
			if (this.scheduledTournaments[serverId][room.id][i].time >= now) {
				nextScheduledIndex = i;
				break;
			}
		}

		if (nextScheduledIndex === -1) return;

		if (nextScheduledIndex > 0) {
			this.scheduledTournaments[serverId][room.id] = this.scheduledTournaments[serverId][room.id].slice(nextScheduledIndex);
		}

		this.nextScheduledTournaments[room.id] = this.scheduledTournaments[serverId][room.id][0];
		this.setScheduledTournamentTimer(room);
	}

	setScheduledTournamentTimer(room: Room): void {
		this.setTournamentTimer(room, this.nextScheduledTournaments[room.id].time,
			Dex.getExistingFormat(this.nextScheduledTournaments[room.id].format, true), this.maxPlayerCap, true);
	}

	canSetRandomTournament(room: Room): boolean {
		if (!(room.id in this.nextScheduledTournaments)) return true;
		return this.nextScheduledTournaments[room.id].time - Date.now() > SCHEDULED_TOURNAMENT_BUFFER_TIME;
	}

	canSetRandomQuickTournament(room: Room): boolean {
		if (!(room.id in this.nextScheduledTournaments)) return true;
		return this.nextScheduledTournaments[room.id].time - Date.now() > SCHEDULED_TOURNAMENT_QUICK_BUFFER_TIME;
	}

	setRandomTournamentTimer(room: Room, minutes: number, quickFormat?: boolean): void {
		let scheduledFormat: IFormat | null = null;
		if (room.id in this.nextScheduledTournaments) {
			scheduledFormat = Dex.getExistingFormat(this.nextScheduledTournaments[room.id].format, true);
		}
		const database = Storage.getDatabase(room);
		const pastTournamentIds: string[] = [];
		if (database.pastTournaments) {
			for (const pastTournament of database.pastTournaments) {
				const format = Dex.getFormat(pastTournament.inputTarget);
				pastTournamentIds.push(format ? format.id : Tools.toId(pastTournament.name));
			}
		}

		const currentGen = Dex.getCurrentGenString();
		const formats: IFormat[] = [];
		for (const i of Dex.getData().formatKeys) {
			const format = Dex.getExistingFormat(i);
			if (!format.tournamentPlayable || format.unranked || format.mod !== currentGen ||
				(scheduledFormat && scheduledFormat.id === format.id)) continue;

			if (quickFormat) {
				if (!format.quickFormat) continue;
			} else {
				if (format.quickFormat || pastTournamentIds.includes(format.id)) continue;
			}

			formats.push(format);
		}

		if (!formats.length) return;

		let playerCap: number = 0;
		if (Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
			playerCap = Config.defaultTournamentPlayerCaps[room.id];
		}

		this.setTournamentTimer(room, Date.now() + (minutes * 60 * 1000) + this.delayedScheduledTournamentTime, Tools.sampleOne(formats),
			playerCap);
	}

	setTournamentTimer(room: Room, startTime: number, format: IFormat, cap: number, scheduled?: boolean, tournamentName?: string): void {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);

		let timer = startTime - Date.now();
		if (timer <= 0) timer = this.delayedScheduledTournamentTime;

		this.tournamentTimerData[room.id] = {cap, formatid: format.inputTarget, startTime, scheduled, tournamentName};
		this.tournamentTimers[room.id] = setTimeout(() => {
			if (room.tournament) return;
			this.createListeners[room.id] = {format, scheduled: scheduled || false};
			room.createTournament(format, 'elimination', cap, tournamentName);
			delete this.tournamentTimers[room.id];
		}, timer);
	}

	onTournamentEnd(room: Room, now: number): void {
		// delayed scheduled tournament
		if (room.id in this.nextScheduledTournaments && this.nextScheduledTournaments[room.id].time <= now) {
			this.setScheduledTournamentTimer(room);
		} else {
			const database = Storage.getDatabase(room);
			let queuedTournament = false;

			if (database.queuedTournament) {
				const format = Dex.getFormat(database.queuedTournament.formatid, true);
				if (format && format.effectType === 'Format') {
					queuedTournament = true;
					// the time may be set on room init since room tournament state is unknown
					if (!database.queuedTournament.time || database.queuedTournament.time <= now) {
						database.queuedTournament.time = now + this.queuedTournamentTime;
					}

					this.setTournamentTimer(room, database.queuedTournament.time, format,
						database.queuedTournament.playerCap, database.queuedTournament.scheduled);
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

				const serverId = Client.getServerId();
				if (!setRandomTournament && serverId in this.scheduledTournaments && room.id in this.scheduledTournaments[serverId]) {
					this.setScheduledTournamentTimer(room);
				}
			}
		}
	}

	getTournamentScheduleHtml(room: Room, month: number): string {
		const serverId = Client.getServerId();
		if (!(serverId in this.schedules) || !(room.id in this.schedules[serverId])) return "";

		const schedule = this.schedules[serverId][room.id];
		const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		if (!(month in schedule.months)) return "";
		const date = new Date();
		date.setMonth(month - 1, 1);
		date.setDate(1);
		const firstDay = date.getDay();
		const lastDay = Tools.getLastDayOfMonth(date) + 1;
		let currentDay = firstDay;
		let html = "<table style='overflow: hidden;font-size: 14px;border-collapse: collapse'><tr>" + daysOfTheWeek.map(x => "<th>" + x +
			"</th>").join("") + "</tr><tr>";
		for (let i = 0; i < currentDay; i++) {
			html += "<td>&nbsp;</td>";
		}
		for (let i = 1; i < lastDay; i++) {
			html += "<td style='padding: 4px'><b>" + i + "</b> - " +
				Dex.getCustomFormatName(Dex.getExistingFormat(schedule.months[month].formats[i]), true) + "</td>";
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
			if (!room.newUserHostedTournaments[link].reviewer) {
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

		const format = Dex.getFormat(input);
		const formatId = format ? format.id : Tools.toId(input);

		for (const pastTournament of pastTournaments) {
			const pastFormat = Dex.getFormat(pastTournament.inputTarget);
			if (pastFormat && pastFormat.quickFormat) continue;
			const id = pastFormat ? pastFormat.id : Tools.toId(pastTournament.name);
			if (formatId === id) return true;
		}

		return false;
	}

	getBadgeHtml(id: string): string {
		if (Config.tournamentTrainerCardBadges && id in Config.tournamentTrainerCardBadges) {
			return '<img src="' + Config.tournamentTrainerCardBadges[id].source + '" width=' + TRAINER_BADGE_DIMENSIONS + 'px ' +
				'height=' + TRAINER_BADGE_DIMENSIONS + 'px title="' + Config.tournamentTrainerCardBadges[id].name + '" />';
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
			const globalGroup = user.globalRank in groups ? groups[user.globalRank] : undefined;
			if (roomGroup && roomGroup.name && (!globalGroup || roomGroup.name !== globalGroup.name)) {
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
		if (trainerCard.customAvatar) {
			const dimensions = Dex.getTrainerSpriteDimensions();
			avatarHtml = '<img src="' + trainerCard.customAvatar + '" width=' + dimensions + 'px height=' + dimensions + 'px />';
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
		if (Config.tournamentTrainerCardBadges && trainerCard.badges && trainerCard.badges.length) {
			const badgesPerLine = 15;
			const badgesHtml: string[] = [];
			for (const badge of trainerCard.badges) {
				let badgeHtml = this.getBadgeHtml(badge);
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

		if (trainerCard.bio) {
			html += '<tr style="border: 1px solid; padding: 4px;"><td style="border: 1px solid;' + footerBackground + '" colspan="3">' +
				'<b>Bio</b>: ' + Tools.stripHtmlCharacters(trainerCard.bio) + '</td></tr>';
		}

		html += "</table></div></center>";
		return html;
	}

	showWinnerTrainerCard(room: Room, name: string): void {
		const id = Tools.toId(name);
		const trainerCardRoom = this.getTrainerCardRoom(room);
		if (trainerCardRoom) {
			const database = Storage.getDatabase(trainerCardRoom);
			const user = Users.get(name);
			if (user && (!user.globalRank || !database.tournamentTrainerCards || !(id in database.tournamentTrainerCards))) {
				const updateTrainerCard = (avatar?: string) => {
					Storage.createTournamentTrainerCard(database, user.name);
					if (!database.tournamentTrainerCards![id].avatar && avatar) {
						database.tournamentTrainerCards![id].avatar = avatar as TrainerSpriteId;
					}

					const trainerCard = this.getTrainerCardHtml(room, user.name);
					if (trainerCard) room.sayHtml(trainerCard);
				};

				if (user.avatar && user.globalRank) {
					updateTrainerCard(user.avatar);
				} else {
					Client.getUserDetails(user, (checkedUser) => {
						updateTrainerCard(Dex.getTrainerSpriteId(checkedUser.avatar || ""));
					});
				}
			} else {
				const trainerCard = this.getTrainerCardHtml(room, name);
				if (trainerCard) room.sayHtml(trainerCard);
			}
		}
	}

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	private onReload(previous: Tournaments): void {
		if (previous.createListeners) Object.assign(this.createListeners, previous.createListeners);
		if (previous.nextScheduledTournaments) Object.assign(this.nextScheduledTournaments, previous.nextScheduledTournaments);

		if (previous.tournamentTimers) {
			for (const i in previous.tournamentTimers) {
				clearTimeout(previous.tournamentTimers[i]);
				// @ts-expect-error
				previous.tournamentTimers[i] = undefined;
			}
		}

		this.loadSchedules();

		if (previous.userHostedTournamentNotificationTimeouts) {
			for (const i in previous.userHostedTournamentNotificationTimeouts) {
				clearTimeout(previous.userHostedTournamentNotificationTimeouts[i]);
				// @ts-expect-error
				previous.userHostedTournamentNotificationTimeouts[i] = undefined;

				const room = Rooms.get(i);
				if (room) this.setUserHostedTournamentNotificationTimer(room);
			}
		}

		const serverId = Client.getServerId();
		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (serverId in this.schedules && room.id in this.schedules[serverId] && (!(room.id in this.nextScheduledTournaments) ||
			now < this.nextScheduledTournaments[room.id].time)) {
				this.setScheduledTournament(room);
			}
		});

		if (previous.tournamentTimerData) {
			for (const i in previous.tournamentTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.tournamentTimerData[i];
					const format = Dex.getFormat(data.formatid);
					if (format && format.effectType === 'Format') {
						this.setTournamentTimer(room, data.startTime, format, data.cap, data.scheduled, data.tournamentName);
					}
				}
			}
		}

		Tools.unrefProperties(previous.schedules);
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