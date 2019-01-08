// tslint:disable
declare namespace NodeJS {
	interface Global {
		Client: import('./client').Client;
		CommandParser: import('./command-parser').CommandParser;
		Commands: import('./command-parser').CommandsDict;
		Config: typeof import('./config-example');
		Dex: import('./dex').Dex;
		Games: import('./games').Games;
		Rooms: import('./rooms').Rooms;
		Storage: import('./storage').Storage;
		Tools: import('./tools').Tools;
		Tournaments: import('./tournaments').Tournaments;
		Users: import('./users').Users;
	}
}
// tslint:enable
