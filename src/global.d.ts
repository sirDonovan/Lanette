import type { Client as clientType } from './client';
import type { CommandParser as commandParserType } from './command-parser';
import type * as config from './config-example';
import type { Dex as dexType } from './dex';
import type { Games as gamesType } from './games';
import type { Rooms as roomsType } from './rooms';
import type { Storage as storageType } from './storage';
import type { Tools as toolsType } from './tools';
import type { Tournaments as tournamentsType } from './tournaments';
import type { BaseLoadedCommands } from "./types/command-parser";
import type { Users as usersType } from './users';

/* eslint-disable no-redeclare, no-undef, @typescript-eslint/naming-convention */
declare global {
	const BaseCommands: BaseLoadedCommands;
	const Client: clientType;
	const CommandParser: commandParserType;
	const Commands: BaseLoadedCommands;
	const Config: Partial<typeof config>;
	const Dex: dexType;
	const Games: gamesType;
	const __reloadInProgress: boolean;
	const __reloadModules: (username: string, modules: string[]) => Promise<void>;
	const Rooms: roomsType;
	const Storage: storageType;
	const tempConfig: boolean;
	const Tools: toolsType;
	const Tournaments: tournamentsType;
	const Users: usersType;
}
/* eslint-enable */
