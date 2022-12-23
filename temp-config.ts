import { getRunOptions, initializeSrc, setExceptionHandler } from './tools';

global.tempConfig = true;

getRunOptions(__filename);

module.exports = (async() => {
	await initializeSrc();

	setExceptionHandler();

	Client.connect();
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
