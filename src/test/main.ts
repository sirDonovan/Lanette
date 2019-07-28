import fs = require('fs');
import path = require('path');
import stream = require('stream');

const rootFolder = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(__dirname, 'modules');
const moduleTests = fs.readdirSync(modulesDir);
const configFile = path.join(rootFolder, 'built', 'config.js');

// create default config if running on Travis CI
if (!fs.existsSync(configFile)) {
	fs.writeFileSync(configFile, fs.readFileSync(path.join(rootFolder, 'built', 'config-example.js')));
}

// tslint:disable-next-line no-empty
const noOp = () => {};
const methodsToNoOp = ['appendFile', 'chmod', 'rename', 'rmdir', 'symlink', 'unlink', 'watchFile', 'writeFile'];
for (let i = 0; i < methodsToNoOp.length; i++) {
	// @ts-ignore
	fs[methodsToNoOp[i]] = noOp;
	// @ts-ignore
	fs[methodsToNoOp[i] + 'Sync'] = noOp;
}

Object.assign(fs, {createWriteStream() {
	return new stream.Writable();
}});

// tslint:disable-next-line no-var-requires
require(path.join(rootFolder, 'built', 'app.js'));

// tslint:disable-next-line no-var-requires
require(path.join(__dirname, 'pokemon-showdown'));

console.log("Loading data for tests...");
Dex.loadData();

for (let i = 0; i < moduleTests.length; i++) {
	// tslint:disable-next-line no-var-requires
	require(path.join(modulesDir, moduleTests[i]));
}
