import { Client } from './client';
import { CommandParser, CommandsDict } from './command-parser';
import * as config from './config-example';
import { Rooms } from './rooms';
import { Tools } from './tools';
import { Users } from './users';

declare global {
	const Client: Client;
	const CommandParser: CommandParser;
	const Commands: CommandsDict;
	const Config: typeof config;
	const Rooms: Rooms;
	const Tools: Tools;
	const Users: Users;
}
