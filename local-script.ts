import path = require('path');

import { getInputFolders, getRunOptions, initializeSrc } from './tools';

const options = getRunOptions(__filename);

if (!options.script) {
	console.log("No local script file provided (use --script=filename)");
	process.exit();
}

module.exports = (async() => {
	await initializeSrc();

	require(path.join(getInputFolders().src.buildPath, "local-scripts", options.script + ".js"));
})().catch((error) => {
	console.error(error);
	process.exit(1);
});