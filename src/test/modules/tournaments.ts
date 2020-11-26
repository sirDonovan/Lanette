import type { IPastTournament } from "../../types/storage";
import type { IRoomTournamentSchedule, ITournamentEndJson } from "../../types/tournaments";
import { assert, assertStrictEqual } from "../test-tools";

/* eslint-env mocha */

// eslint-disable-next-line max-len
const tournamentEndJson = '{"results":[["Player 1"]],"format":"gen8randombattle","generator":"Single Elimination","bracketData":{"type":"tree","rootNode":{"children":[{"children":[{"team":"Player 2"},{"team":"Player 1"}],"state":"finished","team":"Player 1","result":"loss","score":[0,1]},{"children":[{"team":"Player 3"},{"team":"Player 4"}],"state":"finished","team":"Player 4","result":"loss","score":[0,1]}],"state":"finished","team":"Player 1","result":"win","score":[1,0]}}}';

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
		let scheduled = 0;
		let validated = 0;
		const errors: string[] = [];
		for (const room in Tournaments.schedules) {
			const schedule = Tournaments.schedules[room];
			for (const month in schedule.months) {
				date.setMonth(parseInt(month) - 1, 1);
				const totalDays = Tools.getLastDayOfMonth(date);

				const monthScheduled = Object.keys(schedule.months[month].formats).length;
				scheduled += monthScheduled;
				assert(monthScheduled === totalDays, "Month " + month + " in " + room + " has " + monthScheduled + " formats scheduled " +
					"but " + totalDays + " are required");

				for (let i = 1; i <= totalDays; i++) {
					const day = '' + i;
					try {
						Dex.validateFormat(schedule.months[month].formats[day]);
						Dex.getExistingFormat(schedule.months[month].formats[day], true);
						validated++;
					} catch (e) {
						errors.push((e as Error).message + " on " + month + "/" + day + " in " + room);
					}
				}
			}
		}

		assert(validated === scheduled, "\n\t" + errors.join("\n\t"));
	});
	it('should properly set scheduled formats according to configured times', () => {
		const room = Rooms.get('mocha')!;
		const date = new Date();
		const month = date.getMonth() + 1;
		const lastDayOfMonth = Tools.getLastDayOfMonth(date);

		const formats: Dict<string> = {1: "gen8ou", 2: "gen8uu", 3: "gen8ru"};
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
		let startIndex = times.length * (day - 1);
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

	it('should properly calculate all point multiplers', () => {
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(16), 1);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(32), 1.5);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(48), 1.5);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(64), 2);
	});

	it('should properly convert client nodes to elimination nodes', () => {
		const tournamentEnd = JSON.parse(tournamentEndJson) as ITournamentEndJson;
		const eliminationNode = Tournaments.clientToEliminationNode(tournamentEnd.bracketData.rootNode!);
		assertStrictEqual(eliminationNode.user, "Player 1");
		assert(eliminationNode.children);

		const childA = eliminationNode.children[0];
		const childB = eliminationNode.children[1];
		assert(childA);
		assertStrictEqual(childA.user, "Player 1");
		assert(childA.children);

		assert(childB);
		assertStrictEqual(childB.user, "Player 4");
		assert(childB.children);

		const grandchildA = childA.children[0];
		const grandchildB = childA.children[1];
		assert(grandchildA);
		assert(!grandchildA.children);
		assertStrictEqual(grandchildA.user, "Player 2");
		assert(grandchildB);
		assert(!grandchildB.children);
		assertStrictEqual(grandchildB.user, "Player 1");

		const grandchildC = childB.children[0];
		const grandchildD = childB.children[1];
		assert(grandchildC);
		assert(!grandchildC.children);
		assertStrictEqual(grandchildC.user, "Player 3");
		assert(grandchildD);
		assert(!grandchildD.children);
		assertStrictEqual(grandchildD.user, "Player 4");
	});

	it('should properly determine places from EliminationNode', () => {
		const tournamentEnd = JSON.parse(tournamentEndJson) as ITournamentEndJson;
		const eliminationNode = Tournaments.clientToEliminationNode(tournamentEnd.bracketData.rootNode!);
		const places = Tournaments.getPlacesFromTree(eliminationNode);
		assert(places.winner);
		assertStrictEqual(places.winner, "Player 1");

		assert(places.runnerup);
		assertStrictEqual(places.runnerup, "Player 4");

		assert(places.semifinalists);
		assertStrictEqual(places.semifinalists.length, 2);
		assertStrictEqual(places.semifinalists[0], "Player 2");
		assertStrictEqual(places.semifinalists[1], "Player 3");
	});
});
