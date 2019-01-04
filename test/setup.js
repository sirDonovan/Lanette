const path = require('path');

const rootFolder = path.resolve(__dirname, './..');

require(path.join(rootFolder, 'build.js'))(() => {
	require(path.join(rootFolder, "built/test/main.js"));
	run();
}, () => process.exit(1));
