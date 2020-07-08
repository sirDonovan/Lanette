declare namespace NodeJS {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Global {
		BaseCommands: import('./types/command-parser').BaseLoadedCommands;
		Client: import('./client').Client;
		CommandParser: import('./command-parser').CommandParser;
		Commands: import('./types/command-parser').BaseLoadedCommands;
		Config: Partial<typeof import('./config-example')>;
		Dex: import('./dex').Dex;
		Games: import('./games').Games;
		ParseMessagePlugins: string[] | undefined;
		Plugins: import('./types/plugins').LoadedPlugin[] | undefined;
		Rooms: import('./rooms').Rooms;
		Storage: import('./storage').Storage;
		tempConfig: boolean;
		Tools: import('./tools').Tools;
		Tournaments: import('./tournaments').Tournaments;
		Users: import('./users').Users;

		// define plugin modules here
	}
}
