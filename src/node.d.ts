// tslint:disable
declare namespace NodeJS {
	interface Global {
		Client: import('./client').Client;
		CommandParser: import('./command-parser').CommandParser;
		Commands: import('./command-parser').CommandsDict;
		Config: Partial<typeof import('./config-example')>;
		Dex: import('./dex').Dex;
		Games: import('./games').Games;
		Rooms: import('./rooms').Rooms;
		Storage: import('./storage').Storage;
		tempConfig: boolean;
		Tools: import('./tools').Tools;
		Tournaments: import('./tournaments').Tournaments;
		Users: import('./users').Users;
	}
}
// tslint:enable
