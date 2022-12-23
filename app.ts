import net = require('net');

import { start } from './src/repl';
import { initializeSrc, setExceptionHandler } from './tools';

module.exports = (async() => {
	await initializeSrc();

	if (Config.repl && Config.repl.enabled) {
		const replPort = Config.repl.port || 3001;
		net.createServer(socket => {
			start(socket);
		}).listen(replPort, () => console.log("REPL server listening on port " + replPort));
	}

	setExceptionHandler();

	if (require.main === module) {
		Client.connect();
	}
})();
