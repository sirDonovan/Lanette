declare namespace NodeJS {
	// eslint-disable-next-line @typescript-eslint/interface-name-prefix
	interface Global {
		BaseCommands: import('./command-parser').CommandsDict;
		Client: import('./client').Client;
		CommandParser: import('./command-parser').CommandParser;
		Commands: import('./command-parser').CommandsDict;
		Config: Partial<typeof import('./config-example')>;
		Dex: import('./dex').Dex;
		Games: import('./games').Games;
		Rooms: import('./rooms').Rooms;
		Storage: import('./storage').Storage;
		tempConfig: boolean;
		toID: (input: string | number | {id: string} | undefined) => string;
		Tools: import('./tools').Tools;
		Tournaments: import('./tournaments').Tournaments;
		Users: import('./users').Users;
	}
}
