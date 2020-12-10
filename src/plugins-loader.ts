import fs = require('fs');
import path = require('path');

import type { IPluginFile, LoadedPlugin } from './types/plugins';

export function load(): void {
	const plugins: LoadedPlugin[] = [];
	const parseMessagePlugins: string[] = [];

	const pluginsDirectory = path.join(__dirname, 'plugins');
	const pluginFiles = fs.readdirSync(pluginsDirectory);
	for (const fileName of pluginFiles) {
		// comment out the following line to experiment with the example plugins
		if (fileName.startsWith('example-')) continue;

		if (!fileName.endsWith('.js')) continue;

		const pluginPath = path.join(pluginsDirectory, fileName);
		const pluginName = fileName.substr(0, fileName.length - 3);

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const file = require(pluginPath) as IPluginFile;
		if (!file.commands && !file.Module) {
			throw new Error("No support data is exported from " + pluginName + ".");
		}

		if (file.Module) {
			const moduleInstance = new file.Module();
			if (!moduleInstance.name) {
				throw new Error("The module exported from " + pluginName + " is missing a name.");
			}

			if (moduleInstance.name in global) {
				let previousInstance = false;
				if (global.Plugins) {
					for (const plugin of global.Plugins) {
						if (plugin.moduleName === moduleInstance.name) {
							if (moduleInstance.onReload) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
								moduleInstance.onReload((global as any)[moduleInstance.name]);
							}
							previousInstance = true;
							break;
						}
					}
				}

				if (!previousInstance) {
					throw new Error("Module '" + moduleInstance.name + "' exported from " + pluginName + " already exists in the " +
						"global namespace");
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			(global as any)[moduleInstance.name] = moduleInstance;

			if (moduleInstance.loadData) moduleInstance.loadData();

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
