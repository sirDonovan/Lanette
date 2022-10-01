import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase } from "../types/storage";
import type { ITournamentScheduleDay } from "../types/tournaments";
import type { User } from "../users";
import { FormatTextInput } from "./components/format-text-input";
import { NumberTextInput } from "./components/number-text-input";
import { TextInput } from "./components/text-input";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const baseCommand = 'officialtournamentscheduler';
const baseAlias = 'ots';
const chooseYearCommand = 'chooseyear';
const chooseMonthCommand = 'choosemonth';
const chooseDayCommand = 'chooseday';
const chooseTournamentIndexCommand = 'choosetournamentindex';
const newMonthInputCommand = 'addnewmonth';
const formatsInputCommand = 'setformat';
const tournamentTimeInputCommand = 'settournamenttime';
const addDayTournamentCommand = 'adddaytournament';
const removeDayTournamentCommand = 'removedaytournament';

export const pageId = 'official-tournament-scheduler';
export const pages: Dict<OfficialTournamentScheduler> = {};

const defaultTime: [number, number][] = [[2, 30], [9, 30], [15, 30], [20, 30]];
const defaultTimes: Dict<Dict<[number, number][]>> = {
	'showdown': {
		'tournaments': defaultTime,
		'toursplaza': [[5, 30], [12, 30], [18, 30], [23, 30]],
	},
};
const maxTournamentsPerDay = 24;

class OfficialTournamentScheduler extends HtmlPageBase {
	pageId = pageId;

	currentYear: number;
	selectedYear: number;
	selectedMonth: string;
	selectedDay: number = 1;
	selectedTournamentIndex: number = 0;
	lastDayOfSelectedMonth: number;

	canCreateTournament: boolean;
	newMonthInput: NumberTextInput;
	dayFormatInput: FormatTextInput;
	tournamentTimeInput: TextInput;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		this.canCreateTournament = Tournaments.canCreateTournament(room, user);
		this.setCloseButton();

		const date = new Date();
		this.currentYear = date.getFullYear();
		this.selectedYear = this.currentYear;
		this.selectedMonth = "" + (date.getMonth() + 1);
		this.lastDayOfSelectedMonth = Tools.getLastDayOfMonth(date);

		this.newMonthInput = new NumberTextInput(this, this.commandPrefix, newMonthInputCommand, {
			label: "Add new month",
			min: 1,
			max: 12,
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.addMonth(output),
			reRender: () => this.send(),
		});

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];

		this.dayFormatInput = new FormatTextInput(this, this.commandPrefix, formatsInputCommand, {
			currentInput: this.selectedMonth in schedule.months && this.selectedDay in schedule.months[this.selectedMonth].days ?
				schedule.months[this.selectedMonth].days[this.selectedDay]!.format : "",
			label: "Update format",
			submitText: "Submit",
			maxFormats: 1,
			hideClearButton: true,
			customRules: true,
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setDayFormat(output),
			reRender: () => this.send(),
		});

		this.tournamentTimeInput = new TextInput(this, this.commandPrefix, tournamentTimeInputCommand, {
			label: "Update time",
			submitText: "Submit",
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setTournamentTime(output),
			reRender: () => this.send(),
		});

		this.components = [this.newMonthInput, this.dayFormatInput, this.tournamentTimeInput];
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		if (!database.officialTournamentSchedule) database.officialTournamentSchedule = {years: {}};
		if (!(this.selectedYear in database.officialTournamentSchedule.years)) {
			database.officialTournamentSchedule.years[this.selectedYear] = {months: {}};
		}

		return database;
	}

	chooseYearCommand(year: string): void {
		const yearNumber = parseInt(year);
		if (isNaN(yearNumber) || yearNumber < (this.currentYear - 1) || yearNumber > (this.currentYear + 1)) return;

		this.selectedYear = yearNumber;

		// create 'years' entry if needed
		this.getDatabase();
		this.updateLastDayOfSelectedMonth();
		this.send();
	}

	chooseMonthCommand(month: string, dontRender?: boolean): void {
		this.selectedMonth = month;

		this.updateLastDayOfSelectedMonth();
		this.chooseDayCommand("1", true);
		if (!dontRender) this.send();
	}

	chooseDayCommand(day: string, dontRender?: boolean): void {
		const dayNumber = parseInt(day);
		if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > this.lastDayOfSelectedMonth) return;

		this.selectedDay = dayNumber;

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months && this.selectedDay in schedule.months[this.selectedMonth].days) {
			this.dayFormatInput.parentSetInput(schedule.months[this.selectedMonth].days[this.selectedDay]!.format);
		}

		this.chooseTournamentIndexCommand("0", true);

		if (!dontRender) this.send();
	}

	chooseTournamentIndexCommand(time: string, dontRender?: boolean): void {
		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];

		const index = parseInt(time);
		if (isNaN(index) || index < 0 || (this.selectedMonth in schedule.months &&
			index >= schedule.months[this.selectedMonth].days[this.selectedDay]!.times.length)) return;

		this.selectedTournamentIndex = index;

		const times = schedule.months[this.selectedMonth].days[this.selectedDay]!.times[index];
		this.tournamentTimeInput.parentSetInput(times[0] + ":" + (times[1] < 10 ? "0" : "") + times[1]);

		if (!dontRender) this.send();
	}

	addDayTournamentCommand(): void {
		if (!this.canCreateTournament) return;

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months &&
			schedule.months[this.selectedMonth].days[this.selectedDay]!.times.length < maxTournamentsPerDay) {
			const times = schedule.months[this.selectedMonth].days[this.selectedDay]!.times;
			const lastScheduledTime = times[times.length - 1];
			times.push([lastScheduledTime[0], lastScheduledTime[1] + 1]);

			this.setOfficialTournament();
		}

		this.send();
	}

	removeDayTournamentCommand(): void {
		if (!this.canCreateTournament) return;

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months &&
			schedule.months[this.selectedMonth].days[this.selectedDay]!.times.length > 1) {
			schedule.months[this.selectedMonth].days[this.selectedDay]!.times.splice(this.selectedTournamentIndex, 1);
			this.selectedTournamentIndex--;
			if (this.selectedTournamentIndex < 0) this.selectedTournamentIndex = 0;

			const times = schedule.months[this.selectedMonth].days[this.selectedDay]!.times[this.selectedTournamentIndex];
			this.tournamentTimeInput.parentSetInput(times[0] + ":" + (times[1] < 10 ? "0" : "") + times[1]);

			this.setOfficialTournament();
		}

		this.send();
	}

	setDayFormat(output: string): void {
		if (!this.canCreateTournament) return;

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months) {
			if (schedule.months[this.selectedMonth].days[this.selectedDay]!.format === output) return;

			schedule.months[this.selectedMonth].days[this.selectedDay]!.format = output;

			this.setOfficialTournament();
		}

		this.send();
	}

	setTournamentTime(output: string): void {
		if (!this.canCreateTournament) return;

		const parts = output.trim().split(":");
		const hour = parseInt(parts[0]);
		const minute = parts[1] ? parseInt(parts[1]) : -1;
		if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
			this.tournamentTimeInput.parentSetErrors(["You must specify a time between 0:00 and 23:59"]);
			this.send();
			return;
		}

		const database = this.getDatabase();
		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months &&
			schedule.months[this.selectedMonth].days[this.selectedDay]!.times[this.selectedTournamentIndex]) {

			const times = schedule.months[this.selectedMonth].days[this.selectedDay]!.times;
			const previousIndex = this.selectedTournamentIndex - 1;
			if (times[previousIndex]) {
				if (hour === times[previousIndex][0] && minute === times[previousIndex][1]) {
					this.tournamentTimeInput.parentSetErrors(["The specified time is already set for tournament #" + (previousIndex + 1)]);
					this.send();
					return;
				}

				if (hour < times[previousIndex][0]) {
					this.tournamentTimeInput.parentSetErrors(["The specified time is before the time set for tournament #" +
						(previousIndex + 1)]);
					this.send();
					return;
				}
			}

			const nextIndex = this.selectedTournamentIndex + 1;
			if (times[nextIndex]) {
				if (hour === times[nextIndex][0] && minute === times[nextIndex][1]) {
					this.tournamentTimeInput.parentSetErrors(["The specified time is already set for tournament #" + (nextIndex + 1)]);
					this.send();
					return;
				}

				if (hour > times[nextIndex][0]) {
					this.tournamentTimeInput.parentSetErrors(["The specified time is after the time set for tournament #" +
						(nextIndex + 1)]);
					this.send();
					return;
				}
			}

			times[this.selectedTournamentIndex][0] = hour;
			times[this.selectedTournamentIndex][1] = minute;

			this.setOfficialTournament();
		}

		this.send();
	}

	updateLastDayOfSelectedMonth(): void {
		const date = new Date();
		date.setFullYear(this.selectedYear);
		date.setMonth(parseInt(this.selectedMonth) - 1, 1);

		this.lastDayOfSelectedMonth = Tools.getLastDayOfMonth(date);
	}

	addMonth(month: string): void {
		if (!this.canCreateTournament) return;

		const database = this.getDatabase();
		if (month in database.officialTournamentSchedule!.years[this.selectedYear].months) {
			this.newMonthInput.parentSetErrors(["A schedule already exists for " + month + "/" + this.selectedYear]);
			this.send();
			return;
		}

		const serverId = Client.getServerId();
		const times = serverId in defaultTimes && this.room.id in defaultTimes[serverId] ? defaultTimes[serverId][this.room.id].slice() :
			defaultTime.slice();

		const date = new Date();
		date.setFullYear(this.selectedYear);
		date.setMonth(parseInt(month) - 1, 1);
		const lastDayOfNewMonth = Tools.getLastDayOfMonth(date);

		const days: Dict<ITournamentScheduleDay> = {};
		for (let i = 1; i <= lastDayOfNewMonth; i++) {
			days[i] = {format: "", times};
		}

		database.officialTournamentSchedule!.years[this.selectedYear].months[month] = {
			days,
		};

		this.chooseMonthCommand(month, true);

		this.send();
	}

	setOfficialTournament(): void {
		if (!this.canCreateTournament) return;

		Tournaments.loadRoomSchedule(this.room.id);
		Tournaments.setOfficialTournament(this.room);
	}

	render(): string {
		const database = this.getDatabase();

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Official Tournament " +
			"Scheduler</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "<br /><br />";
		html += "</center>";

		const years: number[] = [this.selectedYear];
		const months: string[] = [];
		for (const year in database.officialTournamentSchedule!.years) {
			const yearNumber = parseInt(year);
			if (!years.includes(yearNumber)) years.push(yearNumber);

			if (yearNumber === this.selectedYear) {
				for (const month in database.officialTournamentSchedule!.years[year].months) {
					months.push(month);
				}
			}
		}

		html += "<b>Years</b>:";
		const previousYear = this.currentYear - 1;
		if (years.includes(previousYear)) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseYearCommand + ", " + previousYear, "" + previousYear,
			{selectedAndDisabled: this.selectedYear === previousYear});
		}

		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseYearCommand + ", " + this.currentYear,
			"" + this.currentYear, {selectedAndDisabled: this.selectedYear === this.currentYear});

		const nextYear = this.currentYear + 1;
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseYearCommand + ", " + nextYear, "" + nextYear,
				{selectedAndDisabled: this.selectedYear === nextYear});

		html += "<br /><br />";

		if (months.length) {
			html += "<b>Months</b>:";
			for (const month of months) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseMonthCommand + ", " + month, month,
					{selectedAndDisabled: this.selectedMonth === month});
			}
			html += "<br /><br />";
		}

		if (this.canCreateTournament) html += this.newMonthInput.render();

		const schedule = database.officialTournamentSchedule!.years[this.selectedYear];
		if (this.selectedMonth in schedule.months) {
			html += "<br />";
			html += "<b>Schedule for " + this.selectedMonth + "/" + this.selectedYear + "</b>:";
			html += "<br /><br />";
			html += Tournaments.getTournamentScheduleHtml(this.room, this.selectedYear, this.selectedMonth);

			html += "<br />";
			html += "<b>Days</b>:";
			for (let i = 1; i <= this.lastDayOfSelectedMonth; i++) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseDayCommand + ", " + i, "" + i,
					{selectedAndDisabled: this.selectedDay === i});
			}

			html += "<br /><br />";
			if (this.canCreateTournament) html += this.dayFormatInput.render();

			if (this.selectedDay in schedule.months[this.selectedMonth].days) {
				const format = Tournaments.getFormat(schedule.months[this.selectedMonth].days[this.selectedDay]!.format, this.room);
				if (format) {
					html += "<br />";
					html += "<b>Current format</b>:&nbsp;" + Dex.getCustomFormatName(format) +
						(format.customFormatName ? " (Base format: " + format.name + ")" : "");

					if (format.customRules) {
						html += "<br />";
						html += "<b>Current rules</b>:";
						html += "<br />";
						html += Dex.getCustomRulesHtml(format);
					}
				}

				html += "<br /><br />";
				html += "<b>Tournaments on the " + Tools.toNumberOrderString(this.selectedDay) + "</b>:";
				const times = schedule.months[this.selectedMonth].days[this.selectedDay]!.times;
				for (let i = 0; i < times.length; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseTournamentIndexCommand + ", " + i,
						"" + (i + 1), {selectedAndDisabled: this.selectedTournamentIndex === i});
				}

				if (this.canCreateTournament) {
					const lastScheduledTime = times[times.length - 1];
					html += "<br />";
					html += this.getQuietPmButton(this.commandPrefix + ", " + addDayTournamentCommand,
							"Add a tournament", {disabled: times.length === maxTournamentsPerDay ||
							(lastScheduledTime[0] === 23 && lastScheduledTime[1] === 59)});
					if (times.length > 1) {
						html += " | " + this.getQuietPmButton(this.commandPrefix + ", " + removeDayTournamentCommand,
							"Remove tournament #" + (this.selectedTournamentIndex + 1));
					}
				}

				html += "<br /><br />";

				const date = new Date();
				const minutes = date.getMinutes();
				html += "Tournament #" + (this.selectedTournamentIndex + 1) + " starts at " + times[this.selectedTournamentIndex][0] + ":" +
					(times[this.selectedTournamentIndex][1] < 10 ? "0" : "") + times[this.selectedTournamentIndex][1] +
					" (" + Users.self.name + "'s current time is " + date.getHours() + ":" + (minutes < 10 ? "0" : "") + minutes + ")";

				if (this.canCreateTournament) {
					html += "<br /><br />";
					html += this.tournamentTimeInput.render();
				}
			}
		}

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);

			targets.shift();

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new OfficialTournamentScheduler(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new OfficialTournamentScheduler(targetRoom, user);

			if (cmd === chooseYearCommand) {
				pages[user.id].chooseYearCommand(targets[0].trim());
			} else if (cmd === chooseMonthCommand) {
				pages[user.id].chooseMonthCommand(targets[0].trim());
			} else if (cmd === chooseDayCommand) {
				pages[user.id].chooseDayCommand(targets[0].trim());
			} else if (cmd === chooseTournamentIndexCommand) {
				pages[user.id].chooseTournamentIndexCommand(targets[0].trim());
			} else if (cmd === addDayTournamentCommand) {
				pages[user.id].addDayTournamentCommand();
			} else if (cmd === removeDayTournamentCommand) {
				pages[user.id].removeDayTournamentCommand();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseAlias],
	},
};