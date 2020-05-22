import fs = require('fs');
import path = require('path');

import { IPluginFile, LoadedPlugin } from './types/plugins';

export async function load(): Promise<void> {
	const plugins: LoadedPlugin[] = [];
	const parseMessagePlugins: string[] = [];

	const pluginsDirectory = path.join(__dirname, 'plugins');
	const pluginFiles = fs.readdirSync(pluginsDirectory);
	for (const fileName of pluginFiles) {
		// comment out the following line to experiment with the example plugins
		if (fileName.startsWith('example-')) continue;

		if (!fileName.endsWith('.js')) continue;

		const pluginPath = path.join(pluginsDirectory, fileName);
		const file = require(pluginPath) as IPluginFile;
		if (!file.commands && !file.Module) {
			throw new Error("No support data is exported from " + fileName.substr(0, fileName.length - 3) + ".");
		}

		if (file.Module) {
			const moduleInstance = new file.Module();
			if (!moduleInstance.name) {
				throw new Error("The module exported from " + fileName.substr(0, fileName.length - 3) + " is missing a name.");
			}

			if (moduleInstance.name in global) {
				throw new Error("Module '" + moduleInstance.name + "' exported from " + fileName.substr(0, fileName.length - 3) + " " +
					"already exists in the global namespace");
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			(global as any)[moduleInstance.name] = moduleInstance;

			if (moduleInstance.loadData) await moduleInstance.loadData();

			plugins.push({commands: file.commands, moduleName: moduleInstance.name});
			if (moduleInstance.parseMessage) parseMessagePlugins.push(moduleInstance.name);
		} else {
			plugins.push({commands: file.commands});
		}
	}

	// minor optimization for Client.parseMessage()
	global.ParseMessagePlugins = parseMessagePlugins.length ? parseMessagePlugins : undefined;
	global.Plugins = plugins.length ? plugins : undefined;
}
