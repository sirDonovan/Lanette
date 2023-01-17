const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const rootBuildFolder = path.join(__dirname, "build");
const tsConfig = path.join(__dirname, "tsconfig.json");
const buildSrcPath = path.join(rootBuildFolder, "build-src.js");
const toolsPath = path.join(rootBuildFolder, "tools.js");

const rootFiles = fs.readdirSync(__dirname);

(async() => {
    const entryPoints = [];
    for (const file of rootFiles) {
        if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
        entryPoints.push(path.join(__dirname, file));
    }

    const result = esbuild.buildSync({
        entryPoints,
        format: 'cjs',
        platform: 'node',
        sourcemap: true,
        tsconfig: tsConfig,
        outdir: rootBuildFolder,
    });

    if (result.errors.length) {
        console.log("Error building root folder: " + result.errors.map(x => x.text).join("\n"));
        process.exit(1);
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
