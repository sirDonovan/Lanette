import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { dataDir, dataFiles, formatsPath, modsDir } from '../dex';

describe("Pokemon-Showdown compatibility - ", () => {
	it('data files', () => {
		assert(fs.existsSync(dataDir));
		assert(fs.lstatSync(dataDir).isDirectory());
		assert(fs.existsSync(modsDir));
		assert(fs.lstatSync(modsDir).isDirectory());
		assert(fs.existsSync(formatsPath));

		for (const type in dataFiles) {
			assert(fs.existsSync(path.join(dataDir, dataFiles[type] + '.js')));
		}
	});
});
