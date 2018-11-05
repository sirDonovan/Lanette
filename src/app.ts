import client = require('./client');
// @ts-ignore - generated after first run
import config = require('./config');
import rooms = require('./rooms');
import tools = require('./tools');
import users = require('./users');

global.Config = config;
global.Tools = new tools.Tools();

global.Client = new client.Client();
global.Rooms = new rooms.Rooms();
global.Users = new users.Users();

Client.connect();
