import { Client } from './client';
import { CommandParser, CommandsDict } from './command-parser';
import * as config from './config-example';
import { Dex} from './dex';
import { Games } from './games';
import { Rooms } from './rooms';
import { Tools } from './tools';
import { Tournaments } from './tournaments';
import { Users } from './users';

declare global {
	const Client: Client;
	const CommandParser: CommandParser;
	const Commands: CommandsDict;
	const Config: typeof config;
	const Dex: Dex;
	const Games: Games;
	const Rooms: Rooms;
	const Tools: Tools;
	const Tournaments: Tournaments;
	const Users: Users;
}
