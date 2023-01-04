import http = require('http');
import path = require('path');

import { initializeSrc } from '../../tools';
import * as middleware from './middleware';

(async() => {
    await initializeSrc({
        noRemote: "true",
        noSha: "true",
        incrementalBuild: "true",
    });

    // @ts-expect-error
    global._reloadGameServer = () => {
        const filepath = path.join(Tools.srcBuildFolder, 'game-server/middleware.js');
        Tools.uncacheTree(filepath);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        (require(filepath) as typeof middleware).initializeGameServer();
    };

    middleware.initializeGameServer();

    const server = http.createServer((req, res) => {
        // @ts-expect-error
        global._gameServerListener(req, res); // eslint-disable-line @typescript-eslint/no-unsafe-call
    });
    server.listen(8080);

    console.clear();
    console.log("Game server initialized");
})().catch(e => console.log(e));
