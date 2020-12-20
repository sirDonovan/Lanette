const path = require('path');

const options = require('./get-options.js')(__filename);

require(path.join(__dirname, 'create-untracked-files.js'));

module.exports = (async () => {
	require(path.join(__dirname, 'build.js'))().then(() => {
		require(path.join(__dirname, 'built', 'test', 'main.js'))(options);
	}).catch(e => {
		console.log(e);
		process.exit(1);
	});
})();
