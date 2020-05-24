import type { GroupName } from "./client";
import { Tournament } from "./room-tournament";
import type { Room } from "./rooms";
import { tournamentSchedules } from './tournament-schedules';
import type { IFormat, ISeparatedCustomRules } from "./types/dex";
import type { IPastTournament } from "./types/storage";
import type { ITournamentCreateJson } from "./types/tournaments";

interface IScheduledTournament {
	format: string;
	time: number;
}

const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';

export class Tournaments {
	createListeners: Dict<{format: IFormat; scheduled: boolean}> = {};
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
	nextScheduledTournaments: Dict<IScheduledTournament> = {};
	scheduledTournaments: Dict<IScheduledTournament[]> = {};
	readonly schedules: typeof tournamentSchedules = tournamentSchedules;
	tournamentTimers: Dict<NodeJS.Timer> = {};
	userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timer> = {};

	onReload(previous: Partial<Tournaments>): void {
		if (previous.createListeners) this.createListeners = previous.createListeners;
		if (previous.nextScheduledTournaments) this.nextScheduledTournaments = previous.nextScheduledTournaments;
		if (previous.tournamentTimers) this.tournamentTimers = previous.tournamentTimers;
		if (previous.userHostedTournamentNotificationTimeouts) {
			this.userHostedTournamentNotificationTimeouts = previous.userHostedTournamentNotificationTimeouts;
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

		for (const room in this.schedules) {
			this.scheduledTournaments[room] = [];

			for (const month in this.schedules[room].months) {
				for (const day in this.schedules[room].months[month].formats) {
					const formatid = this.schedules[room].months[month].formats[day];
					if (formatid.includes(',') && !formatid.includes('@@@')) {
						const parts = formatid.split(',');
						const customRules: string[] = [];
						let customFormatid = parts[0].trim();
						for (let i = 1; i < parts.length; i++) {
							const part = parts[i].trim();
							if (part && part !== '0') customRules.push(part);
						}
						if (customRules.length) customFormatid += '@@@' + customRules.join(',');
						this.schedules[room].months[month].formats[day] = customFormatid;
					}
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
				for (const roomId of Config.tournamentRoomAdvertisements[room.id]) {
					const advertisementRoom = Rooms.get(roomId);
					if (advertisementRoom) advertisementRoom.sayHtml('<a href="/' + room.id + '" class="ilink"><strong>' + tournament.name +
						'</strong> tournament created in <strong>' + room.title + '</strong>.</a>');
				}
			}
		}
	}

	setScheduledTournament(room: Room): void {
		if (!(room.id in this.scheduledTournaments)) return;
		delete this.nextScheduledTournaments[room.id];

		const now = Date.now();
		let nextScheduledIndex = -1;

		for (let i = 0; i < this.scheduledTournaments[room.id].length; i++) {
			const date = new Date(this.scheduledTournaments[room.id][i].time);
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

	setRandomTournamentTimer(room: Room, minutes: number): void {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);
		this.tournamentTimers[room.id] = setTimeout(() => {
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
				if (!format.tournamentPlayable || format.unranked || format.mod !== 'gen7' ||
					(scheduledFormat && scheduledFormat.id === format.id) || pastTournamentIds.includes(format.id)) continue;
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

	setTournamentTimer(room: Room, startTime: number, format: IFormat, cap: number, scheduled?: boolean): void {
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
				Dex.getCustomFormatName(Dex.getExistingFormat(schedule.months[month].formats[i]), room, true) + "</td>";
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
				row += '--- <button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter +
					'reviewuserhostedtour ' + room.id + ', ' + link + '">Review</button>';
			}
			row += '</center></td>';

			row += '<td><center>';
			if (tournament.approvalStatus === 'changes-requested') {
				row += 'Changes requested | <button class="button" name="send" value="/pm ' + Users.self.name + ', ' +
					Config.commandCharacter + 'removeuserhostedtour ' + room.id + ', ' + link + '">Remove</button> | ' +
					'<button class="button" name="send" value="/pm ' + Users.self.name + ', .approveuserhostedtour ' + room.id + ',' +
					link + '">Approve</button>';
			} else {
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter +
					'approveuserhostedtour ' + room.id + ', ' + link + '">Approve</button>';
				row += ' | ';
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', ' + Config.commandCharacter +
					'rejectuserhostedtour ' + room.id + ', ' + link + '">Reject</button>';
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
