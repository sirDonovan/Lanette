import { GroupName } from "./client";
import { Tournament } from "./room-tournament";
import { Room } from "./rooms";
import { tournamentSchedules } from './tournament-schedules';
import { IFormat, ISeparatedCustomRules } from "./types/in-game-data-types";
import { IPastTournament } from "./types/storage";

export interface IUserHostedTournament {
	approvalStatus: 'changes-requested' | 'approved' | '';
	hostId: string;
	hostName: string;
	reviewer: string;
	startTime: number;
	reviewTimer?: NodeJS.Timer;
	urls: string[];
}

const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';

export class Tournaments {
	createListeners: Dict<{format: IFormat, scheduled: boolean}> = {};
	readonly defaultCustomRules: Dict<Partial<ISeparatedCustomRules>> = {
		tournaments: {
			bans: ['Leppa Berry'],
		},
		toursplaza: {
			bans: ['Leppa Berry'],
		},
	};
	readonly delayedScheduledTournamentTime: number = 15 * 1000;
	readonly maxPlayerCap: number = 128;
	readonly minPlayerCap: number = 4;
	queuedTournamentTime: number = 5 * 60 * 1000;
	scheduledTournaments: Dict<{format: IFormat, time: number}> = {};
	readonly schedules: typeof tournamentSchedules = tournamentSchedules;
	tournamentTimers: Dict<NodeJS.Timer> = {};
	userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timer> = {};

	onReload(previous: Partial<Tournaments>) {
		if (previous.createListeners) this.createListeners = previous.createListeners;
		if (previous.scheduledTournaments) this.scheduledTournaments = previous.scheduledTournaments;
		if (previous.tournamentTimers) this.tournamentTimers = previous.tournamentTimers;
		if (previous.userHostedTournamentNotificationTimeouts) this.userHostedTournamentNotificationTimeouts = previous.userHostedTournamentNotificationTimeouts;

		this.loadSchedules();

		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (room.id in this.schedules && (!(room.id in this.scheduledTournaments) || now < this.scheduledTournaments[room.id].time)) this.setScheduledTournament(room);
		});
	}

	loadSchedules() {
		const rooms = Object.keys(this.schedules);
		for (let i = 0; i < rooms.length; i++) {
			const room = rooms[i];
			const id = Tools.toRoomId(room);
			if (id !== room) {
				this.schedules[id] = this.schedules[room];
				delete this.schedules[room];
			}
		}

		for (const room in this.schedules) {
			for (const month in this.schedules[room].months) {
				for (const day in this.schedules[room].months[month]) {
					const formatid = this.schedules[room].months[month]![day];
					if (formatid.includes(',') && !formatid.includes('@@@')) {
						const parts = formatid.split(',');
						const customRules: string[] = [];
						let customFormatid = parts[0].trim();
						for (let i = 1; i < parts.length; i++) {
							const part = parts[i].trim();
							if (part && part !== '0') customRules.push(part);
						}
						if (customRules.length) customFormatid += '@@@' + customRules.join(',');
						this.schedules[room].months[month]![day] = customFormatid;
					}
				}
			}
		}
	}

	createTournament(room: Room, json: {format: string, generator: string, isStarted?: boolean, playerCap?: number, teambuilderFormat?: string}) {
		if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id)) return;
		const format = json.teambuilderFormat ? Dex.getFormat(json.teambuilderFormat) : Dex.getFormat(json.format);
		if (!format) return;
		if (room.id in this.tournamentTimers) {
			clearTimeout(this.tournamentTimers[room.id]);
			delete this.tournamentTimers[room.id];
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
					const format = Dex.getFormat(database.queuedTournament.formatid, true);
					if (!format || tournament.format.id === format.id) {
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
			if ((!tournament.format.team && Config.disallowTournamentScouting && Config.disallowTournamentScouting.includes(room.id)) || (Config.disallowTournamentScoutingFormats &&
				room.id in Config.disallowTournamentScoutingFormats && Config.disallowTournamentScoutingFormats[room.id].includes(tournament.format.id))) {
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
				if (formatInfo) {
					let divClass = '';
					if (tournament.format.team) {
						divClass = 'green';
					} else if (tournament.format.gameType === 'singles') {
						divClass = 'blue';
					} else {
						divClass = 'red';
					}
					room.sayHtml("<div class='broadcast-" + divClass + "'><b>" + tournament.name + "</b>:</div>" + formatInfo);
				}
			}

			if (Config.tournamentRoomAdvertisements && room.id in Config.tournamentRoomAdvertisements) {
				for (let i = 0; i < Config.tournamentRoomAdvertisements[room.id].length; i++) {
					const advertisementRoom = Rooms.get(Config.tournamentRoomAdvertisements[room.id][i]);
					if (advertisementRoom) advertisementRoom.sayHtml('<a href="/' + room.id + '" class="ilink"><strong>' + tournament.name + '</strong> tournament created in <strong>' + room.title + '</strong>.</a>');
				}
			}
		}
	}

	setScheduledTournament(room: Room) {
		if (!(room.id in this.schedules)) return;
		const schedule = this.schedules[room.id];
		const now = Date.now();
		const date = new Date();
		let month = date.getMonth() + 1;
		let day = date.getDate();
		let nextScheduledTime = 0;
		for (let i = 0; i < schedule.times.length; i++) {
			date.setHours(schedule.times[i][0], schedule.times[i][1], 0, 0);
			const time = date.getTime();
			if (now <= time) {
				nextScheduledTime = time;
				break;
			}
		}

		// after the last scheduled tournament for the day
		if (!nextScheduledTime) {
			day++;
			if (day > Tools.getLastDayOfMonth(date)) {
				day = 1;
				const nextMonth = month === 12 ? 1 : month + 1;
				if (schedule.months[nextMonth]) {
					month = nextMonth;
				}
			}
			date.setHours(schedule.times[0][0] + 24, schedule.times[0][1], 0, 0);
			nextScheduledTime = date.getTime();
		}
		if (!(month in schedule.months)) return;
		const format = Dex.getExistingFormat(schedule.months[month]!['daily'] || schedule.months[month]![day], true);
		this.scheduledTournaments[room.id] = {format, time: nextScheduledTime};
		this.setScheduledTournamentTimer(room);
	}

	setScheduledTournamentTimer(room: Room) {
		this.setTournamentTimer(room, this.scheduledTournaments[room.id].time, this.scheduledTournaments[room.id].format, this.maxPlayerCap, true);
	}

	canSetRandomTournament(room: Room): boolean {
		if (!(room.id in this.scheduledTournaments)) return true;
		return this.scheduledTournaments[room.id].time - Date.now() > SCHEDULED_TOURNAMENT_BUFFER_TIME;
	}

	setRandomTournamentTimer(room: Room, minutes: number) {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);
		this.tournamentTimers[room.id] = setTimeout(() => {
			let scheduledFormat: IFormat | null = null;
			if (room.id in this.scheduledTournaments) scheduledFormat = this.scheduledTournaments[room.id].format;
			const database = Storage.getDatabase(room);
			const pastTournamentIds: string[] = [];
			if (database.pastTournaments) {
				for (let i = 0; i < database.pastTournaments.length; i++) {
					const format = Dex.getFormat(database.pastTournaments[i].inputTarget);
					pastTournamentIds.push(format ? format.id : Tools.toId(database.pastTournaments[i].name));
				}
			}

			const formats: IFormat[] = [];
			for (const i in Dex.data.formats) {
				const format = Dex.getExistingFormat(i);
				if (!format.tournamentPlayable || format.unranked || format.mod !== 'gen7' || (scheduledFormat && scheduledFormat.id === format.id) || pastTournamentIds.includes(format.id)) continue;
				formats.push(format);
			}

			if (!formats.length) return;

			let playerCap: number = 0;
			if (Config.defaultTournamentPlayerCaps && room.id in Config.defaultTournamentPlayerCaps) {
				playerCap = Config.defaultTournamentPlayerCaps[room.id];
			}

			this.setTournamentTimer(room, 0, Tools.sampleOne(formats), playerCap);
		}, minutes * 60 * 1000);
	}

	setTournamentTimer(room: Room, startTime: number, format: IFormat, cap: number, scheduled?: boolean) {
		let timer = startTime - Date.now();
		if (timer <= 0) timer = this.delayedScheduledTournamentTime;
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);
		this.tournamentTimers[room.id] = setTimeout(() => {
			if (room.tournament) return;
			this.createListeners[room.id] = {format, scheduled: scheduled || false};
			room.sayCommand("/tour new " + format.id + ", elimination" + (cap ? ", " + cap : ""));
			delete this.tournamentTimers[room.id];
		}, timer);
	}

	getTournamentScheduleHtml(room: Room): string {
		if (!(room.id in this.schedules)) return "";
		const schedule = this.schedules[room.id];
		const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const date = new Date();
		const month = date.getMonth() + 1;
		if (!(month in schedule.months)) return "";
		const currentDate = date.getDate();
		if (currentDate > 1) date.setHours(-24 * (currentDate - 1), 0, 0, 0);
		const firstDay = date.getDay();
		const lastDay = Tools.getLastDayOfMonth(date) + 1;
		let currentDay = firstDay;
		let html = "<table style='overflow: hidden;font-size: 14px;border-collapse: collapse'><tr>" + daysOfTheWeek.map(x => "<th>" + x + "</th>").join("") + "</tr><tr>";
		for (let i = 0; i < currentDay; i++) {
			html += "<td>&nbsp;</td>";
		}
		for (let i = 1; i < lastDay; i++) {
			html += "<td style='padding: 4px'><b>" + i + "</b> - " + Dex.getCustomFormatName(Dex.getExistingFormat(schedule.months[month]!['daily'] || schedule.months[month]![i]), room, true) + "</td>";
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
		let html = '<table border="1" style="width:auto"><tr><th style="width:150px">Username</th><th style="width:150px">Link</th><th style="width:150px">Reviewer</th><th style="width:200px">Status</th></tr>';
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
				row += '--- <button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter + 'reviewuserhostedtour ' + room.id + ', ' + link + '">Review</button>';
			}
			row += '</center></td>';

			row += '<td><center>';
			if (tournament.approvalStatus === 'changes-requested') {
				row += 'Changes requested | <button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter + 'removeuserhostedtour ' + room.id + ', ' + link + '">Remove</button> | <button class="button" name="send" value="/pm ' + Users.self.name + ', .approveuserhostedtour ' + room.id + ',' + link + '">Approve</button>';
			} else {
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter + 'approveuserhostedtour ' + room.id + ', ' + link + '">Approve</button>';
				row += ' | ';
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter + 'rejectuserhostedtour ' + room.id + ', ' + link + '">Reject</button>';
			}
			row += '</center></td>';

			row += '</tr>';
			rows.push(row);
		}

		if (!rows.length) return "";

		html += rows.join("") + '</table>';

		return html;
	}

	showUserHostedTournamentApprovals(room: Room) {
		let rank = USER_HOSTED_TOURNAMENT_RANK;
		if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) rank = Config.userHostedTournamentRanks[room.id].review;
		if (!Object.keys(room.newUserHostedTournaments!).length) {
			if (rank === 'voice') {
				room.sayAuthUhtmlChange("userhosted-tournament-approvals", "<div></div>");
			} else {
				room.sayModUhtmlChange("userhosted-tournament-approvals", "<div></div>", rank);
			}
			if (this.userHostedTournamentNotificationTimeouts[room.id]) {
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
			if (this.userHostedTournamentNotificationTimeouts[room.id]) return;
			room.sayCommand('/notifyrank ' + Client.groupSymbols[rank] + ", " + title + ", " + message);
			this.userHostedTournamentNotificationTimeouts[room.id] = setTimeout(() => {
				delete this.userHostedTournamentNotificationTimeouts[room.id];
				this.showUserHostedTournamentApprovals(room);
			}, USER_HOSTED_TOURNAMENT_TIMEOUT);
		} else if (this.userHostedTournamentNotificationTimeouts[room.id]) {
			clearTimeout(this.userHostedTournamentNotificationTimeouts[room.id]);
			room.sayCommand('/notifyoffrank ' + Client.groupSymbols[rank]);
			delete this.userHostedTournamentNotificationTimeouts[room.id];
		}
	}

	isInPastTournaments(room: Room, input: string, pastTournaments?: IPastTournament[]): boolean {
		if (!pastTournaments) {
			const database = Storage.getDatabase(room);
			if (!database.pastTournaments || !(Config.disallowQueueingPastTournaments && Config.disallowQueueingPastTournaments.includes(room.id))) return false;
			pastTournaments = database.pastTournaments;
		}

		const format = Dex.getFormat(input);
		const formatId = format ? format.id : Tools.toId(input);

		for (let i = 0; i < pastTournaments.length; i++) {
			const pastFormat = Dex.getFormat(pastTournaments[i].inputTarget);
			if (pastFormat && pastFormat.quickFormat) continue;
			const id = pastFormat ? pastFormat.id : Tools.toId(pastTournaments[i].name);
			if (formatId === id) return true;
		}

		return false;
	}
}
