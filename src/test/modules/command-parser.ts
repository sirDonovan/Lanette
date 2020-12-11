import { assert } from './../test-tools';

/* eslint-env mocha */

describe("CommandParser", () => {
	it('should have commands with only 1 function type each', () => {
		for (const i in Commands) {
			assert(Commands[i].command);
		}
	});
});
