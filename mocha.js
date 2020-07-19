const path = require('path');

const optionNames = ['incrementalBuild', 'modules', 'games', 'gameSeed'];
const options = {};
for (let i = process.argv.indexOf(__filename) + 1; i < process.argv.length; i++) {
	if (!process.argv[i].startsWith('--')) continue;
	const arg = process.argv[i].substr(2);
	if (!arg) continue;

	const equalsIndex = arg.indexOf('=');
	let optionName = arg;
	let value;
	if (equalsIndex === -1) {
		value = 'true';
	} else {
		optionName = arg.substr(0, equalsIndex);
		value = arg.substr(equalsIndex + 1).trim();
	}

	if (!optionNames.includes(optionName)) throw new Error("Unknown test option '" + optionName + "'");
	options[optionName] = value;
}

require(path.join(__dirname, 'create-untracked-files.js'));

require(path.join(__dirname, 'build.js'))(options, async () => {
	await require(path.join(__dirname, 'built', 'test', 'main.js'))(options);
}, () => {
	process.exit(1);
});
