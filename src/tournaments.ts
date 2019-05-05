import { Tournament } from "./room-tournament";
import { Room } from "./rooms";
import * as schedules from './tournament-schedules';
import { IFormat, ISeparatedCustomRules } from "./types/in-game-data-types";
import { User } from "./users";

for (const i in schedules) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		schedules[id] = schedules[i];
		delete schedules[i];
	}
}

export class Tournaments {
	createListeners: Dict<{format: IFormat, scheduled: boolean}> = {};
	defaultCap: number = 64;
	defaultCustomRules: Dict<Partial<ISeparatedCustomRules>> = {
		tournaments: {
			bans: ['Leppa Berry'],
		},
		toursplaza: {
			bans: ['Leppa Berry'],
		},
	};
	maxCap: number = 128;
	schedules: typeof schedules = schedules;
	scheduledTournaments: Dict<{format: IFormat, time: number}> = {};
	tournamentTimers: Dict<NodeJS.Timer> = {};

	canCreateTournaments(room: Room, user: User): boolean {
		if (!user.hasRank(room, '%')) return false;
		if (!Config.allowTournaments.includes(room.id)) {
			room.say("Tournament features are not enabled for this room.");
			return false;
		}
		if (Users.self.rooms.get(room) !== '*') {
			room.say(Users.self.name + " requires Bot rank (*) to use tournament features.");
			return false;
		}
		return true;
	}

	createTournament(room: Room, format: IFormat, generator: string, playerCap: number): Tournament {
		const tournament = new Tournament(room);
		tournament.initialize(format, generator, playerCap);

		return tournament;
	}

	createTournamentFromJSON(room: Room, update: {format: string, teambuilderFormat?: string, generator: string, playerCap?: number}) {
		if (!update.format && !update.teambuilderFormat) return;
		const format = update.teambuilderFormat ? Dex.getExistingFormat(update.teambuilderFormat) : Dex.getExistingFormat(update.format);
		room.tournament = this.createTournament(room, format, update.generator, update.playerCap || 0);
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
		const format = Dex.getExistingFormat(schedule.months[month][day], true);
		this.scheduledTournaments[room.id] = {format, time: nextScheduledTime};
		this.setTournamentTimer(room, nextScheduledTime - now, format, this.maxCap, true);
	}

	setTournamentTimer(room: Room, time: number, format: IFormat, cap: number, scheduled?: boolean) {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);
		this.tournamentTimers[room.id] = setTimeout(() => {
			this.createListeners[room.id] = {format, scheduled: scheduled || false};
			room.sayCommand("/tour new " + format.id + ", elimination, " + cap);
			delete this.tournamentTimers[room.id];
		}, time);
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
			html += "<td style='padding: 4px'><b>" + i + "</b> - " + Dex.getCustomFormatName(room, Dex.getExistingFormat(schedule.months[month][i]), true) + "</td>";
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
