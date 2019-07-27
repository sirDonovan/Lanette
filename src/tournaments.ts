import { GroupName } from "./client";
import { Tournament } from "./room-tournament";
import { Room } from "./rooms";
import * as schedules from './tournament-schedules';
import { IFormat, ISeparatedCustomRules } from "./types/in-game-data-types";
import { User } from "./users";

export interface IUserHostedTournament {
	approvalStatus: 'changes-requested' | 'approved' | '';
	hostId: string;
	hostName: string;
	reviewer: string;
	startTime: number;
	reviewTimer?: NodeJS.Timer;
	urls: string[];
}

for (const i in schedules) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		schedules[id] = schedules[i];
		delete schedules[i];
	}
}

const SCHEDULED_TOURNAMENT_BUFFER_TIME = 90 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_TIMEOUT = 5 * 60 * 1000;
const USER_HOSTED_TOURNAMENT_RANK: GroupName = 'driver';

export class Tournaments {
	// exported constants
	readonly schedules: typeof schedules = schedules;

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
	tournamentTimers: Dict<NodeJS.Timer> = {};
	userHostedTournamentNotificationTimeouts: Dict<NodeJS.Timer> = {};

	onReload(previous: Tournaments) {
		this.createListeners = previous.createListeners;
		this.scheduledTournaments = previous.scheduledTournaments;
		this.tournamentTimers = previous.tournamentTimers;
		this.userHostedTournamentNotificationTimeouts = previous.userHostedTournamentNotificationTimeouts;

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
				if (!format.tournamentPlayable || format.unranked || format.mod !== Dex.currentGenString || (scheduledFormat && scheduledFormat.id === format.id) || pastTournamentIds.includes(format.id)) continue;
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

	async checkChallongeLink(room: Room, user: User, bracketLink: string) {
		const fetchType = 'challonge';
		if (fetchType in Tools.fetchUrlTimeouts) {
			if (!(fetchType in Tools.fetchUrlQueues)) Tools.fetchUrlQueues[fetchType] = [];
			Tools.fetchUrlQueues[fetchType].push(() => this.checkChallongeLink(room, user, bracketLink));
			return;
		}

		const html = await Tools.fetchUrl(bracketLink, fetchType);
		if (typeof html !== 'string') {
			console.log(html);
			return;
		}

		if (!html.includes("<ul class='tabbed-navlist -phone-scrollable -fade' data-js-navtab-fade data-js-sudo-nav>")) return;
		const navigation = html.split("<ul class='tabbed-navlist -phone-scrollable -fade' data-js-navtab-fade data-js-sudo-nav>")[1].split('</ul>')[0].split('<li');

		const urls: string[] = [];
		for (let i = 0; i < navigation.length; i++) {
			if (navigation[i].includes('Register</a>\n</li>') || navigation[i].includes('Standings</a>\n</li>') ||
				(navigation[i].includes('Discussion (') && navigation[i].includes('</a>\n</li>')) || (navigation[i].includes('Log (') && navigation[i].includes('</a>\n</li>'))) {
				urls.push(Tools.getChallongeUrl(navigation[i].split(' href="')[1].split('">')[0])!);
			}
		}

		if (room.newUserHostedTournaments && bracketLink in room.newUserHostedTournaments) {
			room.newUserHostedTournaments[bracketLink].urls = urls;

			this.showUserHostedTournamentApprovals(room);
		} else if (room.approvedUserHostedTournaments && bracketLink in room.approvedUserHostedTournaments) {
			room.approvedUserHostedTournaments[bracketLink].urls = urls;
		}
	}

	newUserHostedTournament(room: Room, user: User, link: string, authOrTHC?: string) {
		const bracketUrl = Tools.extractChallongeBracketUrl(link);
		const now = Date.now();
		if (!room.newUserHostedTournaments) room.newUserHostedTournaments = {};
		room.newUserHostedTournaments[bracketUrl] = {
			hostName: user.name,
			hostId: user.id,
			startTime: now,
			approvalStatus: '',
			reviewer: '',
			urls: [],
		};

		if (authOrTHC) {
			if (!room.approvedUserHostedTournaments) room.approvedUserHostedTournaments = {};
			room.approvedUserHostedTournaments[user.id] = room.newUserHostedTournaments[user.id];
			delete room.newUserHostedTournaments[user.id];

			room.approvedUserHostedTournaments[user.id].approvalStatus = 'approved';
			room.approvedUserHostedTournaments[user.id].reviewer = Tools.toId(authOrTHC);
		}

		this.checkChallongeLink(room, user, bracketUrl);
	}

	showUserHostedTournamentApprovals(room: Room) {
		let html = '<table border="1" style="width:auto"><tr><th style="width:150px">Username</th><th style="width:150px">Links</th><th style="width:150px">Reviewer</th><th style="width:200px">Status</th></tr>';
		const rows: string[] = [];
		let needReview = 0;
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
				row += '--- <button class="button" name="send" value="/pm ' + Users.self.name + ', .reviewuserhostedtour ' + room.id + ',' + link + '">Review</button>';
				needReview++;
			}
			row += '</center></td>';

			row += '<td><center>';
			if (tournament.approvalStatus === 'changes-requested') {
				row += 'Changes requested | <button class="button" name="send" value="/pm ' + Users.self.name + ', .removeuserhostedtour ' + room.id + ',' + link + '">Remove</button> | <button class="button" name="send" value="/pm ' + Users.self.name + ', .approveuserhostedtour ' + room.id + ',' + link + '">Approve</button>';
			} else {
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', .approveuserhostedtour ' + room.id + ',' + link + '">Approve</button>';
				row += ' | ';
				row += '<button class="button" name="send" value="/pm ' + Users.self.name + ', .rejectuserhostedtour ' + room.id + ',' + link + '">Reject</button>';
			}
			row += '</center></td>';

			row += '</tr>';
			rows.push(row);
		}

		let rank = USER_HOSTED_TOURNAMENT_RANK;
		if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) rank = Config.userHostedTournamentRanks[room.id].review;
		if (!rows.length) {
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
		html += rows.join("");
		html += '</table>';
		if (rank === 'voice') {
			room.sayAuthUhtml("userhosted-tournament-approvals", html);
		} else {
			room.sayModUhtml("userhosted-tournament-approvals", html, rank);
		}

		if (needReview) {
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
}
