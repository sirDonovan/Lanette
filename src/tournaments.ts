import { EliminationNode } from "./lib/elimination-node";
import { Tournament } from "./room-tournament";
import type { Room } from "./rooms";
import { tournamentSchedules } from './tournament-schedules';
import type { GroupName } from "./types/client";
import type { IFormat } from "./types/pokemon-showdown";
import type { IPastTournament, LeaderboardType } from "./types/storage";
import type {
	IClientTournamentNode, IScheduledTournament, ITournamentCreateJson, ITreeRootPlaces,
	TournamentPlace
} from "./types/tournaments";

const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const SCHEDULED_TOURNAMENT_QUICK_BUFFER_TIME = 30 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';

export class Tournaments {
	// exported constants
	readonly maxPlayerCap: number = 128;
	readonly minPlayerCap: number = 4;
	readonly winnerPoints: number = 3;
	readonly runnerUpPoints: number = 2;
	readonly semiFinalistPoints: number = 1;

	createListeners: Dict<{format: IFormat; scheduled: boolean}> = {};
	readonly delayedScheduledTournamentTime: number = 15 * 1000;
	queuedTournamentTime: number = 5 * 60 * 1000;
	nextScheduledTournaments: Dict<IScheduledTournament> = {};
	scheduledTournaments: Dict<IScheduledTournament[]> = {};
	readonly schedules: typeof tournamentSchedules = tournamentSchedules;
	tournamentTimerData: Dict<{cap: number, formatid: string, startTime: number, scheduled: boolean}> = {};
	tournamentTimers: Dict<NodeJS.Timer> = {};
	userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timer> = {};

	onReload(previous: Partial<Tournaments>): void {
		if (previous.createListeners) Object.assign(this.createListeners, previous.createListeners);
		if (previous.nextScheduledTournaments) Object.assign(this.nextScheduledTournaments, previous.nextScheduledTournaments);

		if (previous.tournamentTimerData) {
			for (const i in previous.tournamentTimerData) {
				const room = Rooms.get(i);
				if (room) {
					const data = previous.tournamentTimerData[i];
					const format = Dex.getFormat(data.formatid);
					if (format) this.setTournamentTimer(room, data.startTime, format, data.cap, data.scheduled);
				}
			}
		}

		if (previous.tournamentTimers) {
			for (const i in previous.tournamentTimers) {
				clearTimeout(previous.tournamentTimers[i]);
				delete previous.tournamentTimers[i];
			}
		}

		if (previous.userHostedTournamentNotificationTimeouts) {
			for (const i in previous.userHostedTournamentNotificationTimeouts) {
				clearTimeout(previous.userHostedTournamentNotificationTimeouts[i]);
				delete previous.userHostedTournamentNotificationTimeouts[i];

				const room = Rooms.get(i);
				if (room) this.setUserHostedTournamentNotificationTimer(room);
			}
		}

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}

		this.loadSchedules();

		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (room.id in this.schedules && (!(room.id in this.nextScheduledTournaments) ||
			now < this.nextScheduledTournaments[room.id].time)) {
				this.setScheduledTournament(room);
			}
		});
	}

	loadSchedules(): void {
		const rooms = Object.keys(this.schedules);
		for (const room of rooms) {
			const id = Tools.toRoomId(room);
			if (id !== room) {
				this.schedules[id] = this.schedules[room];
				delete this.schedules[room];
			}
		}

		const currentMonth = new Date().getMonth();
		for (const room in this.schedules) {
			this.scheduledTournaments[room] = [];

			for (const month in this.schedules[room].months) {
				for (const day in this.schedules[room].months[month].formats) {
					const formatid = this.schedules[room].months[month].formats[day];
					if (formatid.includes(',') && !formatid.includes('@@@')) {
						const parts = formatid.split(',');
						const customRules: string[] = [];
						let customFormatid = Dex.getExistingFormat(parts[0]).id;
						for (let i = 1; i < parts.length; i++) {
							const part = parts[i].trim();
							if (part && part !== '0') customRules.push(part);
						}
						if (customRules.length) customFormatid += '@@@' + customRules.join(',');
						this.schedules[room].months[month].formats[day] = customFormatid;
					} else {
						this.schedules[room].months[month].formats[day] =
							Dex.getExistingFormat(this.schedules[room].months[month].formats[day]).id;
					}

					this.schedules[room].months[month].formats[day] = Dex.validateFormat(this.schedules[room].months[month].formats[day]);
				}
			}

			const months = Object.keys(this.schedules[room].months).map(x => parseInt(x)).sort((a, b) => a - b);
			let month = months[0];
			months.shift();

			let formats = this.schedules[room].months[month].formats;
			let times = this.schedules[room].months[month].times;
			let formatIndex = times[0][0] > times[1][0] ? 2 : 1;
			const date = new Date();
			let day = 1;
			date.setMonth(month - 1, day);
			date.setDate(day);
			if (currentMonth === 11 && month === 1) date.setFullYear(date.getFullYear() + 1);
			let lastDayOfMonth = Tools.getLastDayOfMonth(date);

			const rolloverDay = (): void => {
				formatIndex++;
				if (!formats[formatIndex]) {
					if (months.length) {
						formats = this.schedules[room].months[months[0]].formats;
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

						times = this.schedules[room].months[month].times;
						lastDayOfMonth = Tools.getLastDayOfMonth(date);
					} else {
						// previousMonth + 1 - 1
						date.setMonth(previousMonth, day);
					}
				}
				date.setDate(day);
			};

			while (month) {
				const format = formats[formatIndex];
				let rolledOverDay = false;
				for (let i = 0; i < times.length; i++) {
					if (i > 0 && times[i][0] < times[i - 1][0]) {
						rolloverDay();
						rolledOverDay = true;
					}

					date.setHours(times[i][0], times[i][1], 0, 0);
					this.scheduledTournaments[room].push({format, time: date.getTime()});
				}

				if (!rolledOverDay) rolloverDay();
			}
		}
	}

	createTournament(room: Room, json: ITournamentCreateJson): void {
		const format = json.teambuilderFormat ? Dex.getFormat(json.teambuilderFormat) : Dex.getFormat(json.format);
		if (!format) return;
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
			if (room.id in this.createListeners && format.id === this.createListeners[room.id].format.id) {
				if (this.createListeners[room.id].scheduled) {
					tournament.scheduled = true;
					this.setScheduledTournament(room);
				}
				tournament.format = this.createListeners[room.id].format;
				if (tournament.format.customRules) {
					tournament.setCustomFormatName();
					room.sayCommand("/tour rules " + tournament.format.customRules.join(","));
				}
				const database = Storage.getDatabase(room);
				if (database.queuedTournament) {
					const queuedFormat = Dex.getFormat(database.queuedTournament.formatid, true);
					if (!queuedFormat || tournament.format.id === queuedFormat.id) {
						delete database.queuedTournament;
						Storage.exportDatabase(room.id);
					}
				}
				delete this.createListeners[room.id];
			}

			if (tournament.playerCap) room.sayCommand("/tour autostart on");

			if (Config.tournamentAutoDQTimers && room.id in Config.tournamentAutoDQTimers) {
				room.sayCommand("/tour autodq " + Config.tournamentAutoDQTimers[room.id]);
			}
			if ((!tournament.format.team && Config.disallowTournamentScouting && Config.disallowTournamentScouting.includes(room.id)) ||
				(Config.disallowTournamentScoutingFormats && room.id in Config.disallowTournamentScoutingFormats &&
				Config.disallowTournamentScoutingFormats[room.id].includes(tournament.format.id))) {
				room.sayCommand("/tour scouting disallow");
			}
			if (Config.disallowTournamentModjoin && Config.disallowTournamentModjoin.includes(room.id)) {
				room.sayCommand("/tour modjoin disallow");
			}

			let startMinutes = 5;
			if (Config.tournamentStartTimers && room.id in Config.tournamentStartTimers) {
				startMinutes = Config.tournamentStartTimers[room.id];
				if (tournament.scheduled) startMinutes *= 2;
				tournament.startTimer = setTimeout(() => room.sayCommand("/tour start"), startMinutes * 60 * 1000);
			}
			if (Config.adjustTournamentCaps && Config.adjustTournamentCaps.includes(room.id)) {
				tournament.adjustCapTimer = setTimeout(() => room.tournament!.adjustCap(), (startMinutes / 2) * 60 * 1000);
			}

			if (Config.displayTournamentFormatInfo && Config.displayTournamentFormatInfo.includes(room.id)) {
				const formatInfo = Dex.getFormatInfoDisplay(tournament.format);
				if (formatInfo) room.sayHtml(formatInfo);
			}

			if (Config.tournamentRoomAdvertisements && room.id in Config.tournamentRoomAdvertisements) {
				for (const roomId of Config.tournamentRoomAdvertisements[room.id]) {
					const advertisementRoom = Rooms.get(roomId);
					if (advertisementRoom) advertisementRoom.sayHtml('<a href="/' + room.id + '" class="ilink"><strong>' + tournament.name +
						'</strong> tournament created in <strong>' + room.title + '</strong>.</a>');
				}
			}
		}
	}

	clientToEliminationNode(clientNode: IClientTournamentNode): EliminationNode<string> {
		const eliminationNode = new EliminationNode({user: clientNode.team});

		if (clientNode.children) {
			const children: EliminationNode<string>[] = [];
			for (const child of clientNode.children) {
				if (child.team) children.push(this.clientToEliminationNode(child));
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
		if (!format.teamLength || !format.teamLength.battle || format.teamLength.battle > 2) {
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

	setScheduledTournament(room: Room): void {
		if (!(room.id in this.scheduledTournaments)) return;
		delete this.nextScheduledTournaments[room.id];

		const now = Date.now();
		let nextScheduledIndex = -1;

		for (let i = 0; i < this.scheduledTournaments[room.id].length; i++) {
			if (this.scheduledTournaments[room.id][i].time >= now) {
				nextScheduledIndex = i;
				break;
			}
		}

		if (nextScheduledIndex === -1) return;

		if (nextScheduledIndex > 0) this.scheduledTournaments[room.id] = this.scheduledTournaments[room.id].slice(nextScheduledIndex);

		this.nextScheduledTournaments[room.id] = this.scheduledTournaments[room.id][0];
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

		const formats: IFormat[] = [];
		for (const i of Dex.data.formatKeys) {
			const format = Dex.getExistingFormat(i);
			if (!format.tournamentPlayable || format.unranked || format.mod !== Dex.currentGenString ||
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

	setTournamentTimer(room: Room, startTime: number, format: IFormat, cap: number, scheduled?: boolean): void {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);

		let timer = startTime - Date.now();
		if (timer <= 0) timer = this.delayedScheduledTournamentTime;

		this.tournamentTimerData[room.id] = {cap, formatid: format.inputTarget, startTime, scheduled: scheduled || false};
		this.tournamentTimers[room.id] = setTimeout(() => {
			if (room.tournament) return;
			this.createListeners[room.id] = {format, scheduled: scheduled || false};
			room.sayCommand("/tour new " + format.id + ", elimination" + (cap ? ", " + cap : ""));
			delete this.tournamentTimers[room.id];
		}, timer);
	}

	getTournamentScheduleHtml(room: Room, month: number): string {
		if (!(room.id in this.schedules)) return "";
		const schedule = this.schedules[room.id];
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
				room.sayCommand('/notifyoffrank ' + Client.groupSymbols[rank]);
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
			room.sayCommand('/notifyrank ' + Client.groupSymbols[rank] + ", " + title + ", " + message +
				", New Challonge tournament to review");
			this.setUserHostedTournamentNotificationTimer(room);
		} else if (room.id in this.userHostedTournamentNotificationTimeouts) {
			clearTimeout(this.userHostedTournamentNotificationTimeouts[room.id]);
			room.sayCommand('/notifyoffrank ' + Client.groupSymbols[rank]);
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
}

export const instantiate = (): void => {
	const oldTournaments = global.Tournaments as Tournaments | undefined;

	global.Tournaments = new Tournaments();

	if (oldTournaments) {
		global.Tournaments.onReload(oldTournaments);
	}
};