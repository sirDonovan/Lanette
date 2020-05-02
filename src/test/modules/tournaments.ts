import { IPastTournament } from "../../types/storage";
import { IRoomTournamentSchedule } from "../../tournament-schedules";
import { assert, assertStrictEqual } from "../test-tools";

describe("Tournaments", () => {
	it('should return proper values from isInPastTournaments()', () => {
		const room = Rooms.get('mocha')!;
		const now = Date.now();
		const pastTournaments: IPastTournament[] = [
			{inputTarget: 'gen8ou', name: '[Gen 8] OU', time: now},
			{inputTarget: 'mocha', name: 'Mocha', time: now},
		];

		assert(Tournaments.isInPastTournaments(room, 'gen8ou', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen7ou', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen8randombattle', pastTournaments));
		assert(Tournaments.isInPastTournaments(room, 'mocha', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen8mocha', pastTournaments));
	});
	it('should have valid formats in schedules', () => {
		const date = new Date();
		for (const room in Tournaments.schedules) {
			const schedule = Tournaments.schedules[room];
			for (const month in schedule.months) {
				date.setMonth(parseInt(month) - 1, 1);
				const totalDays = Tools.getLastDayOfMonth(date);

				const scheduled = Object.keys(schedule.months[month].formats).length;
				assert(scheduled === totalDays, "Month " + month + " in " + room + " has " + scheduled + " formats scheduled but " +
					totalDays + " are required");

				let validated = 0;
				const errors: string[] = [];
				for (let i = 1; i <= totalDays; i++) {
					const day = '' + i;
					try {
						Dex.validateFormat(schedule.months[month].formats[day]);
						validated++;
					} catch (e) {
						errors.push(e.message + " on " + month + "/" + day + " in " + room);
					}
				}
				assert(validated === scheduled, "\n\t" + errors.join("\n\t"));
			}
		}
	});
	it('should properly set scheduled formats according to configured timed', () => {
		const room = Rooms.get('mocha')!;
		const date = new Date();
		const month = date.getMonth() + 1;
		const lastDayOfMonth = Tools.getLastDayOfMonth(date);

		const formats: Dict<string> = {1: "ou", 2: "uu", 3: "ru"};
		const schedule: IRoomTournamentSchedule = {months: {}};

		// 4 officials on 1 day
		let times: [number, number][] = [[2, 30], [9, 30], [15, 30], [20, 30]];
		schedule.months[month] = {formats: {}, times};
		schedule.months[month].formats['1'] = formats['1'];
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[month].formats[i] = formats['2'];
		}

		Tournaments.schedules[room.id] = schedule;
		Tournaments.loadSchedules();
		assertStrictEqual(Tournaments.scheduledTournaments[room.id].length, lastDayOfMonth * times.length);

		let day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats[day]);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		// 1 official on day 1, 3 officials on day 2
		times = [[20, 30], [2, 30], [9, 30], [15, 30]];
		schedule.months[month] = {formats: {}, times};
		schedule.months[month].formats['1'] = formats['1'];
		schedule.months[month].formats['2'] = formats['2'];
		for (let i = 3; i <= lastDayOfMonth; i++) {
			schedule.months[month].formats[i] = formats['3'];
		}

		Tournaments.loadSchedules();
		assertStrictEqual(Tournaments.scheduledTournaments[room.id].length, lastDayOfMonth * times.length);

		day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['2']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		let startIndex = (times.length * (day - 1));
		let endIndex = startIndex + times.length;
		let timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				// month + 1 - 1
				date.setMonth(month, 1);
				date.setDate(1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['3']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		// 2 officials on day 1, 2 officials on day 2
		times = [[15, 30], [20, 30], [2, 30], [9, 30]];
		schedule.months[month] = {formats: {}, times};
		schedule.months[month].formats['1'] = formats['1'];
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[month].formats[i] = formats['2'];
		}

		Tournaments.loadSchedules();
		assertStrictEqual(Tournaments.scheduledTournaments[room.id].length, lastDayOfMonth * times.length);

		date.setMonth(month - 1, 1);
		day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['1']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		startIndex = (times.length * day) - times.length;
		endIndex = startIndex + times.length;
		timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				// month + 1 - 1
				date.setMonth(month, 1);
				date.setDate(1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['2']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		// 3 officials on day 1, 1 official on day 2
		times = [[9, 30], [15, 30], [20, 30], [2, 30]];
		schedule.months[month] = {formats: {}, times};
		schedule.months[month].formats['1'] = formats['1'];
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[month].formats[i] = formats['2'];
		}

		Tournaments.loadSchedules();
		assertStrictEqual(Tournaments.scheduledTournaments[room.id].length, lastDayOfMonth * times.length);

		date.setMonth(month - 1, 1);
		day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['1']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		startIndex = (times.length * day) - times.length;
		endIndex = startIndex + times.length;
		timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				// month + 1 - 1
				date.setMonth(month, 1);
				date.setDate(1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].format, formats['2']);
			assertStrictEqual(Tournaments.scheduledTournaments[room.id][i].time, date.getTime());
		}
	});
});
