import { Client } from './client';
import { CommandParser } from './command-parser';
import * as commands from './commands';
import * as config from './config-example';
import { Rooms } from './rooms';
import { Tools } from './tools';
import { Users } from './users';

declare global {
	const Client: Client;
	const CommandParser: CommandParser;
	const Commands: typeof commands;
	const Config: typeof config;
	const Rooms: Rooms;
	const Tools: Tools;
	const Users: Users;
}
