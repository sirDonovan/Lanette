import path = require('path');

import { getRunOptions, getSrcBuildFolder, initializeSrc } from './tools';

const options = getRunOptions(__filename);

if (!options.script) {
	console.log("No local script file provided (use --script=filename)");
	process.exit();
}

module.exports = (async() => {
	await initializeSrc();

	require(path.join(getSrcBuildFolder(), "local-scripts", options.script + ".js"));
})().catch((error) => {
	console.error(error);
	process.exit(1);
});