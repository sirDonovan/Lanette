import * as tools from './tools';
global.Tools = new tools.Tools();

// @ts-ignore - generated after first run
import * as config from './config';
global.Config = config;

import * as client from './client';
global.Client = new client.Client();

import * as commandParser from './command-parser';
global.CommandParser = new commandParser.CommandParser();

import commands = require('./commands');
global.Commands = {};

import * as games from './games';
global.Games = new games.Games();

import * as rooms from './rooms';
global.Rooms = new rooms.Rooms();

import * as users from './users';
global.Users = new users.Users();

CommandParser.loadCommands(commands);
Client.connect();
