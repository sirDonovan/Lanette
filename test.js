const path = require('path');

require('./get-options.js')(__filename);

(async () => {
	await require(path.join(__dirname, 'lint.js'));
	await require(path.join(__dirname, 'mocha.js'));
})();