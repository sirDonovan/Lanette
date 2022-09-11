const optionNames = ['offline', 'incrementalBuild', 'modules', 'games', 'gameSeed', 'noBuild', 'mochaRuns', 'script', 'grep'];
const optionAliases = {
	'local': 'offline',
	'incremental': 'incrementalBuild',
	'module': 'modules',
	'game': 'games'
};

let options;

module.exports = (filename) => {
	if (!options) {
		options = {};
		for (let i = process.argv.indexOf(filename) + 1; i < process.argv.length; i++) {
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

			if (optionName in optionAliases) optionName = optionAliases[optionName];

			if (!optionNames.includes(optionName)) throw new Error("Unknown test option '" + optionName + "'");
			options[optionName] = value;
		}
	}

	return options;
};
