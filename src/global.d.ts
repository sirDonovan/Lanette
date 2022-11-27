/* eslint-disable no-var, @typescript-eslint/naming-convention */
declare var BaseCommands: import('./types/command-parser').BaseLoadedCommands;
declare var Client: import('./client/client').Client;
declare var CommandParser: import('./command-parser').CommandParser;
declare var Commands: import('./types/command-parser').BaseLoadedCommands;
declare var Config: Partial<typeof import('./config-example')>;
declare var Dex: import('./dex').Dex;
declare var Games: import('./games').Games;
declare var __reloadInProgress: boolean;
declare var __reloadModules: (username: string, modules: string[]) => Promise<void>;
declare var Rooms: import('./rooms').Rooms;
declare var Storage: import('./storage').Storage;
declare var tempConfig: boolean;
declare var Tools: import('./tools').Tools;
declare var Tournaments: import('./tournaments').Tournaments;
declare var Users: import('./users').Users;
/* eslint-enable */
