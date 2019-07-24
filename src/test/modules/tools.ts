import * as assert from 'assert';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 30 * day;
const year = 365 * day;

describe("Tools", () => {
	it('should return proper values from toDurationString()', () => {
		assert(Tools.toDurationString(second), '1 second');
		assert(Tools.toDurationString(2 * second), '2 seconds');
		assert(Tools.toDurationString(minute), '1 minute');
		assert(Tools.toDurationString(2 * minute), '2 minutes');
		assert(Tools.toDurationString(hour), '1 hour');
		assert(Tools.toDurationString(2 * hour), '2 hours');
		assert(Tools.toDurationString(day), '1 day');
		assert(Tools.toDurationString(2 * day), '2 days');
		assert(Tools.toDurationString(month), '1 month');
		assert(Tools.toDurationString(2 * month), '2 months');
		assert(Tools.toDurationString(year), '1 year');
		assert(Tools.toDurationString(2 * year), '2 years');
		assert(Tools.toDurationString(year + month + day + hour + minute + second), '1 year, 1 month, 1 day, 1 hour, 1 minute, and 1 second');
		assert(Tools.toDurationString((2 * year) + (2 * month) + (2 * day) + (2 * hour) + (2 * minute) + (2 * second)), '2 years, 2 months, 2 days, 2 hours, 2 minutes, and 2 seconds');
	});
});
