const path = require('path');

const options = {};
for (let i = process.argv.indexOf(__filename) + 1; i < process.argv.length; i++) {
	if (!process.argv[i].startsWith('--')) continue;
	const arg = process.argv[i].substr(2);
	const equalsIndex = arg.indexOf('=');
	if (equalsIndex === -1) {
		options[arg] = 'true';
	} else {
		options[arg.substr(0, equalsIndex)] = arg.substr(equalsIndex + 1).trim();
	}
}

require(path.join(__dirname, 'build.js'))(options, async () => {
	await require(path.join(__dirname, 'built', 'test', 'main.js'))(options);
}, () => {
	process.exit(1);
});
