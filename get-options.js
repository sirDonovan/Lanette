let options;

module.exports = (filename) => {
	if (!options) {
		options = {};
		const optionNames = ['offline', 'incrementalBuild', 'modules', 'games', 'gameSeed'];
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

			if (!optionNames.includes(optionName)) throw new Error("Unknown test option '" + optionName + "'");
			options[optionName] = value;
		}
	}

	return options;
};
