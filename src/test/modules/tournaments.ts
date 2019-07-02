import assert = require('assert');

describe("Tournaments", () => {
	it('should have valid formats in schedules', () => {
		const date = new Date();
		for (const room in Tournaments.schedules) {
			const schedule = Tournaments.schedules[room];
			for (const month in schedule.months) {
				if (schedule.months[month]['daily']) {
					assert(Dex.validateFormat(schedule.months[month]['daily']));
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

				for (let i = 1; i <= totalDays; i++) {
					const day = '' + i;
					try {
						Dex.validateFormat(schedule.months[month][day]);
						validated++;
					} catch (e) {
						errors.push(e.message + " on " + month + "/" + day + " in " + room);
					}
				}
				assert(validated === Object.keys(schedule.months[month]).length, "\n\t" + errors.join("\n\t"));
			}
		}
	});
});
