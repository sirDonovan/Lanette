import path = require('path');

import { getInputFolders, getRunOptions } from './tools';

getRunOptions(__filename);

module.exports = (async() => {
	const rootFolder = getInputFolders().root;
	await require(path.join(rootFolder.buildPath, 'lint.js'));
	await require(path.join(rootFolder.buildPath, 'mocha.js'));
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
