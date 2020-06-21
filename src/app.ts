import * as tools from './tools';
global.Tools = new tools.Tools();

// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - generated after first run
import * as config from './config';
import * as ConfigLoader from './config-loader';
global.Config = ConfigLoader.load(config);

import * as dex from './dex';
global.Dex = new dex.Dex();

import * as client from './client';
client.instantiate();

import * as commandParser from './command-parser';
commandParser.instantiate();

import * as rooms from './rooms';
global.Rooms = new rooms.Rooms();

import * as storage from './storage';
global.Storage = new storage.Storage();

import * as tournaments from './tournaments';
global.Tournaments = new tournaments.Tournaments();

import * as users from './users';
global.Users = new users.Users();

import * as PluginsLoader from './plugins-loader';

import commands = require('./commands');

import * as games from './games';
global.Games = new games.Games();

module.exports = (async(): Promise<void> => {
	Storage.importDatabases();
	Tournaments.loadSchedules();

	await PluginsLoader.load();

	global.Commands = CommandParser.loadBaseCommands(commands);
	global.BaseCommands = Tools.deepClone(Commands);
});