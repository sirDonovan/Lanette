/* eslint-disable no-var */
declare var BaseCommands: import('./types/command-parser').BaseLoadedCommands;
declare var Client: import('./client/client').Client;
declare var CommandParser: import('./command-parser').CommandParser;
declare var Commands: import('./types/command-parser').BaseLoadedCommands;
declare var Config: Partial<typeof import('./config-example')>;
declare var Dex: import('./dex').Dex;
declare var Games: import('./games').Games;
declare var __reloadInProgress: boolean;
declare var __reloadModules: (username: string, modules: string[], formatsUpdate?: boolean) => Promise<string | null>;
declare var Rooms: import('./rooms').Rooms;
declare var Storage: import('./storage').Storage;
declare var tempConfig: boolean;
declare var Tools: import('./tools').Tools;
declare var Tournaments: import('./tournaments').Tournaments;
declare var Users: import('./users').Users;

declare var _inputFolders: import('./types/root').InputFolders | undefined;
declare var _outputFilepaths: string[] | undefined;
declare var _lastPokemonShowdownSha: string | undefined;
declare var _runOptions: import('./types/root').RunOptions | undefined;

// avoid esbuild type error
declare namespace WebAssembly {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Module {}
}
/* eslint-enable */
