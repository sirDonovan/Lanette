import { currentGenString } from "./dex";
import { Tournament } from "./room-tournament";
import { Room } from "./rooms";
import * as schedules from './tournament-schedules';
import { IFormat, ISeparatedCustomRules } from "./types/in-game-data-types";

for (const i in schedules) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		schedules[id] = schedules[i];
		delete schedules[i];
	}
}

const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;

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
	readonly schedules: typeof schedules = schedules;
	scheduledTournaments: Dict<{format: IFormat, time: number}> = {};
	tournamentTimers: Dict<NodeJS.Timer> = {};

	onReload(previous: Tournaments) {
		this.createListeners = previous.createListeners;
		this.scheduledTournaments = previous.scheduledTournaments;
		this.tournamentTimers = previous.tournamentTimers;

		const now = Date.now();
		Users.self.rooms.forEach((rank, room) => {
			if (room.id in this.schedules && (!(room.id in this.scheduledTournaments) || now < this.scheduledTournaments[room.id].time)) this.setScheduledTournament(room);
		});
	}

	createTournament(room: Room, format: IFormat, generator: string, playerCap: number, name?: string): Tournament {
		if (room.id in this.tournamentTimers) {
			clearTimeout(this.tournamentTimers[room.id]);
			delete this.tournamentTimers[room.id];
		}
		const tournament = new Tournament(room);
		tournament.initialize(format, generator, playerCap, name);

		return tournament;
	}

	createTournamentFromJSON(room: Room, update: {format: string, teambuilderFormat?: string, generator: string, isStarted?: boolean, playerCap?: number}) {
		if (!Config.allowTournaments || !Config.allowTournaments.includes(room.id) || (!update.format && !update.teambuilderFormat)) return;
		const format = update.teambuilderFormat ? Dex.getExistingFormat(update.teambuilderFormat) : Dex.getExistingFormat(update.format);
		room.tournament = this.createTournament(room, format, update.generator, update.playerCap || 0, update.teambuilderFormat ? update.format : undefined);
		if (update.isStarted) room.tournament.started = true;
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
		const format = Dex.getExistingFormat(schedule.months[month]['daily'] || schedule.months[month][day], true);
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
					const format = Dex.getFormat(database.pastTournaments[i]);
					if (format) pastTournamentIds.push(format.id);
				}
			}

			const formats: IFormat[] = [];
			for (const i in Dex.data.formats) {
				const format = Dex.getExistingFormat(i);
				if (!format.tournamentPlayable || format.unranked || format.mod !== currentGenString || (scheduledFormat && scheduledFormat.id === format.id) || pastTournamentIds.includes(format.id)) continue;
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
			room.sayCommand("/tour new " + format.id + ", elimination, " + cap);
			delete this.tournamentTimers[room.id];
		}, timer);
	}

	getTournamentScheduleHtml(room: Room): string {
		if (!(room.id in this.schedules)) return "";
		const schedule = this.schedules[room.id];
		const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const date = new Date();
		const month = date.getMonth() + 1;
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
			html += "<td style='padding: 4px'><b>" + i + "</b> - " + Dex.getCustomFormatName(room, Dex.getExistingFormat(schedule.months[month]['daily'] || schedule.months[month][i]), true) + "</td>";
			currentDay++;
			if (currentDay === 7) {
				html += "</tr><tr>";
				currentDay = 0;
			}
		}
		html += "</tr></table>";
		return html;
	}
}
