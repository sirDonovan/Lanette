const path = require('path');

global.tempConfig = true;

require(path.join(__dirname, 'get-options.js'))(__filename);

(async () => {
	await require(path.join(__dirname, 'app.js'));
})();