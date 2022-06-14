const path = require('path');

const options = require(path.join(__dirname, 'get-options.js'))(__filename);

if (!options.script) {
	console.log("No local script file provided (use --script=filename)");
	process.exit();
}

(async () => {
	await require(path.join(__dirname, 'app.js'));

	require(path.join(__dirname, "build", "local-scripts", options.script + ".js"));
})();