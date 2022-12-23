import { initializeTests } from './src/test/main';
import { getRunOptions, initializeSrc } from './tools';

const options = getRunOptions(__filename);

module.exports = (async() => {
    await initializeSrc();

	initializeTests(options);
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
