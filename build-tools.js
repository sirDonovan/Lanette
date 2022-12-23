const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const tsConfig = path.join(__dirname, "tsconfig.json");
const buildFolder = path.join(__dirname, "build");
const srcFolder = path.join(__dirname, "src");

exports.buildFolder = buildFolder;
exports.srcFolder = srcFolder;

if (!global._esbuildResults) global._esbuildResults = {};

// Modified from https://stackoverflow.com/a/32197381
const deleteFolderRecursive = function(folder) {
	folder = folder.trim();
	if (!folder || folder === '/' || folder === '.') return;
	let exists = false;
	try {
		fs.accessSync(folder);
		exists = true;
	} catch (e) {}
	if (exists) {
		const contents = fs.readdirSync(folder);
		for (let i = 0; i < contents.length; i++) {
			const curPath = path.join(folder, contents[i]);
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		}

		if (folder !== buildFolder) fs.rmdirSync(folder);
	}
}

exports.deleteFolderRecursive = deleteFolderRecursive;

const listFilesRecursive = function(folder) {
	folder = folder.trim();
	if (!folder || folder === '/' || folder === '.') return [];
	let fileList = [];
	let exists = false;
	try {
		fs.accessSync(folder);
		exists = true;
	} catch (e) {}
	if (exists) {
		const contents = fs.readdirSync(folder);
		for (let i = 0; i < contents.length; i++) {
			const curPath = path.join(folder, contents[i]);
			if (fs.lstatSync(curPath).isDirectory()) {
				fileList = fileList.concat(listFilesRecursive(curPath));
			}
			fileList.push(curPath);
		}
	}
	return fileList;
}

exports.listFilesRecursive = listFilesRecursive;

exports.transpile = async function(options) {
    const srcFiles = listFilesRecursive(srcFolder);

    for (const filepath of srcFiles) {
        if (filepath in _esbuildResults) {
            _esbuildResults[filepath] = await _esbuildResults[filepath].rebuild();
        } else {
            if (!filepath.endsWith('.ts') || filepath.endsWith('.d.ts')) continue;

            let subDirectory = "";
            const relativeFilepath = filepath.substr(srcFolder.length + 1);
            const index = relativeFilepath.lastIndexOf('/');
            if (index !== -1) {
                subDirectory = "/" + relativeFilepath.substr(0, index);
            }

            const result = await esbuild.build({
                entryPoints: [filepath],
                format: 'cjs',
                platform: 'node',
                sourcemap: true,
                incremental: true,
				tsconfig: tsConfig,
                outdir: 'build' + subDirectory,
            }).catch((e) =>  {
				console.log("Error building file " + filepath);
				process.exit(1);
			});

            if (!options || !options.ci) {
                _esbuildResults[filepath] = result;
            } else {
                result.rebuild.dispose();
            }
        }
    }

    for (const filepath in _esbuildResults) {
        if (!srcFiles.includes(filepath)) {
            _esbuildResults[filepath].rebuild.dispose();
            delete _esbuildResults[filepath];

            try {
                fs.unlinkSync(filepath);
            } catch (e) {}
        }
    }
};
