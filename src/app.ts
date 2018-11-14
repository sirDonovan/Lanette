import * as client from './client';
// @ts-ignore - generated after first run
import * as config from './config';
import * as rooms from './rooms';
import * as tools from './tools';
import * as users from './users';

global.Config = config;
global.Tools = new tools.Tools();

global.Client = new client.Client();
global.Rooms = new rooms.Rooms();
global.Users = new users.Users();

Client.connect();
