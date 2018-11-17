// tslint:disable
declare namespace NodeJS {
	interface Global {
		Client: import('./client').Client;
		CommandParser: import('./command-parser').CommandParser;
		Commands: import('./command-parser').CommandsDict;
		Config: typeof import('./config-example');
		Rooms: import('./rooms').Rooms;
		Tools: import('./tools').Tools;
		Users: import('./users').Users;
	}
}
// tslint:enable
