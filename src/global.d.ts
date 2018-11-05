import { Client } from './client';
import * as config from './config-example';
import { Rooms } from './rooms';
import { Tools } from './tools';
import { Users } from './users';

declare global {
	const Client: Client;
	const Config: typeof config;
	const Rooms: Rooms;
	const Tools: Tools;
	const Users: Users;
}
