import * as assert from 'assert';

describe("Dex", () => {
	it('should load data without error', () => {
		assert(Dex.data);
	});
	it('should support OMoTM# aliases', () => {
		assert(Dex.getFormat('omotm'));
		assert(Dex.getFormat('omotm2'));
	});
});
