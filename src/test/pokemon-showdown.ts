import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe("Pokemon-Showdown compatibility - ", () => {
	it('data files', () => {
		assert(fs.existsSync(Dex.dataDir));
		assert(fs.lstatSync(Dex.dataDir).isDirectory());
		assert(fs.existsSync(Dex.modsDir));
		assert(fs.lstatSync(Dex.modsDir).isDirectory());
		assert(fs.existsSync(Dex.formatsPath));

		for (const type in Dex.dataFiles) {
			assert(fs.existsSync(path.join(Dex.dataDir, Dex.dataFiles[type] + '.js')));
		}
	});
});
