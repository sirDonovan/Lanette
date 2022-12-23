import path = require('path');

import { getRootBuildFolder, getRunOptions } from './tools';

getRunOptions(__filename);

module.exports = (async() => {
	const rootBuildFolder = getRootBuildFolder();
	await require(path.join(rootBuildFolder, 'lint.js'));
	await require(path.join(rootBuildFolder, 'mocha.js'));
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
