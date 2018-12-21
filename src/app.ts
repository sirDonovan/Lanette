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
global.Commands = Object.assign(Object.create(null), CommandParser.loadCommands(commands));

import * as dex from './dex';
global.Dex = new dex.Dex('base');

import * as games from './games';
global.Games = new games.Games();

import * as rooms from './rooms';
global.Rooms = new rooms.Rooms();

import * as users from './users';
global.Users = new users.Users();

Client.connect();
