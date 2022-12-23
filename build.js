const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const rootBuildFolder = path.join(__dirname, "build");
const tsConfig = path.join(__dirname, "tsconfig.json");
const buildSrcPath = path.join(rootBuildFolder, "build-src.js");
const toolsPath = path.join(rootBuildFolder, "tools.js");

const rootFiles = fs.readdirSync(__dirname);

(async() => {
    for (const file of rootFiles) {
        if (!file.endsWith('.ts')) continue;
        esbuild.buildSync({
            entryPoints: [file],
            format: 'cjs',
            platform: 'node',
            sourcemap: true,
            tsconfig: tsConfig,
            outdir: rootBuildFolder,
        });
    }

    const options = require(toolsPath).getRunOptions(__filename);
    let previousOffline = options.offline;
    options.offline = true;

    // building here allows normal TypeScript imports of src files in root level files
    await require(buildSrcPath).buildSrc(options).catch(e => {
		console.log(e);
		process.exit(1);
	});

    options.offline = previousOffline;

    process.exit();
})();
