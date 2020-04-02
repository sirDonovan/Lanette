import { Client } from './client';
import { CommandParser, CommandsDict } from './command-parser';
import * as config from './config-example';
import { Dex} from './dex';
import { Games } from './games';
import { Rooms } from './rooms';
import { Storage } from './storage';
import { Tools } from './tools';
import { Tournaments } from './tournaments';
import { Users } from './users';

/* eslint-disable no-redeclare, no-undef */
declare global {
	const BaseCommands: CommandsDict;
	const Client: Client;
	const CommandParser: CommandParser;
	const Commands: CommandsDict;
	const Config: Partial<typeof config>;
	const Dex: Dex;
	const Games: Games;
	const Rooms: Rooms;
	const Storage: Storage;
	const tempConfig: boolean;
	const toID: (input: string | number | {id: string} | undefined) => string;
	const Tools: Tools;
	const Tournaments: Tournaments;
	const Users: Users;
}
/* eslint-enable */
