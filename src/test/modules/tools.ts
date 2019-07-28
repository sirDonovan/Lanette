import assert = require('assert');

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 31 * day;
const year = 365 * day;

describe("Tools", () => {
	it('should return proper values from isInteger()', () => {
		assert(Tools.isInteger('0'));
		assert(Tools.isInteger('1'));
		assert(Tools.isInteger('01'));
		assert(Tools.isInteger('10'));
		assert(Tools.isInteger('-1'));
		assert(!Tools.isInteger('0.1'));
		assert(!Tools.isInteger('-0.1'));
		assert(!Tools.isInteger('a'));
		assert(!Tools.isInteger('-a'));
		assert(!Tools.isInteger('0a'));
		assert(!Tools.isInteger('-0a'));
		assert(!Tools.isInteger('a0'));
		assert(!Tools.isInteger('-a0'));
		assert(!Tools.isInteger(''));
		assert(!Tools.isInteger(' '));
		assert(!Tools.isInteger('-'));
	});
	it('should return proper values from isFloat()', () => {
		assert(Tools.isFloat('0'));
		assert(Tools.isFloat('1'));
		assert(Tools.isFloat('01'));
		assert(Tools.isFloat('10'));
		assert(Tools.isFloat('-1'));
		assert(Tools.isFloat('0.1'));
		assert(Tools.isFloat('-0.1'));
		assert(!Tools.isFloat('a'));
		assert(!Tools.isFloat('-a'));
		assert(!Tools.isFloat('0a'));
		assert(!Tools.isFloat('-0a'));
		assert(!Tools.isFloat('a0'));
		assert(!Tools.isFloat('-a0'));
		assert(!Tools.isFloat(''));
		assert(!Tools.isFloat(' '));
		assert(!Tools.isFloat('-'));
	});
	it('should return proper values from toDurationString()', () => {
		assert.strictEqual(Tools.toDurationString(second), '1 second');
		assert.strictEqual(Tools.toDurationString(2 * second), '2 seconds');
		assert.strictEqual(Tools.toDurationString(minute), '1 minute');
		assert.strictEqual(Tools.toDurationString(2 * minute), '2 minutes');
		assert.strictEqual(Tools.toDurationString(hour), '1 hour');
		assert.strictEqual(Tools.toDurationString(2 * hour), '2 hours');
		assert.strictEqual(Tools.toDurationString(day), '1 day');
		assert.strictEqual(Tools.toDurationString(2 * day), '2 days');
		assert.strictEqual(Tools.toDurationString(month), '1 month');
		assert.strictEqual(Tools.toDurationString(month + (28 * day)), '2 months');
		assert.strictEqual(Tools.toDurationString(year), '1 year');
		assert.strictEqual(Tools.toDurationString(2 * year), '2 years');
		assert.strictEqual(Tools.toDurationString(minute + second), '1 minute and 1 second');
		assert.strictEqual(Tools.toDurationString(hour + minute + second), '1 hour, 1 minute, and 1 second');
	});
});
