const path = require('path');

const options = require('./get-options.js')(__filename);

require(path.join(__dirname, 'create-untracked-files.js'));

require(path.join(__dirname, 'build.js'))(async () => {
	await require(path.join(__dirname, 'built', 'test', 'main.js'))(options);
}, () => {
	process.exit(1);
});
