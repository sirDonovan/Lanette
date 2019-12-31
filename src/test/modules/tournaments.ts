import { IPastTournament } from "../../types/storage";
import { assert } from "../test-tools";

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
				if (schedule.months[month]!['daily']) {
					assert(Dex.validateFormat(schedule.months[month]!['daily']));
					continue;
				}
				let validated = 0;
				const errors: string[] = [];
				let totalDays = 0;
				if (month === '2') {
					if (date.getFullYear() % 4 === 0) {
						totalDays = 29;
					} else {
						totalDays = 28;
					}
				} else if (['4', '6', '9', '11'].includes(month)) {
					totalDays = 30;
				} else {
					totalDays = 31;
				}

				const scheduled = Object.keys(schedule.months[month]!).length;
				assert(scheduled === totalDays, "Month " + month + " in " + room + " has " + scheduled + " formats scheduled but " + totalDays + " are required");

				for (let i = 1; i <= totalDays; i++) {
					const day = '' + i;
					try {
						Dex.validateFormat(schedule.months[month]![day]);
						validated++;
					} catch (e) {
						errors.push(e.message + " on " + month + "/" + day + " in " + room);
					}
				}
				assert(validated === scheduled, "\n\t" + errors.join("\n\t"));
			}
		}
	});
});
