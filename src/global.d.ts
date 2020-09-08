import { Client } from './client';
import { CommandParser } from './command-parser';
import * as config from './config-example';
import { Dex } from './dex';
import { Games } from './games';
import { Rooms } from './rooms';
import { Storage } from './storage';
import { Tools } from './tools';
import { Tournaments } from './tournaments';
import type { BaseLoadedCommands } from "./types/command-parser";
import { LoadedPlugin } from './types/plugins';
import { User, Users } from './users';

/* eslint-disable no-redeclare, no-undef, @typescript-eslint/naming-convention */
declare global {
	const BaseCommands: BaseLoadedCommands;
	const Client: Client;
	const CommandParser: CommandParser;
	const Commands: BaseLoadedCommands;
	const Config: Partial<typeof config>;
	const Dex: Dex;
	const Games: Games;
	const ParseMessagePlugins: string[] | undefined;
	const Plugins: LoadedPlugin[] | undefined;
	const __reloadInProgress: boolean;
	const __reloadModules: (username: string, modules: string[]) => Promise<void>;
	const Rooms: Rooms;
	const Storage: Storage;
	const tempConfig: boolean;
	const Tools: Tools;
	const Tournaments: Tournaments;
	const Users: Users;

	// define plugin modules here
}
/* eslint-enable */
