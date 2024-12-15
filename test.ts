import path = require('path');

import { getInputFolders, getRunOptions } from './tools';

getRunOptions(__filename);

module.exports = (async() => {
	const rootFolder = getInputFolders().root;
	const lintPath = path.join(rootFolder.buildPath, 'lint.js');
	const mochaPath = path.join(rootFolder.buildPath, 'mocha.js');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	await require(lintPath);
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	await require(mochaPath);
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
