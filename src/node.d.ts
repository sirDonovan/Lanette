// tslint:disable
declare namespace NodeJS {
	interface Global {
		Client: import('./client').Client;
		Config: typeof import('./config-example');
		Rooms: import('./rooms').Rooms;
		Tools: import('./tools').Tools;
		Users: import('./users').Users;
	}
}
// tsline:enable
