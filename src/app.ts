import * as tools from './tools';
global.Tools = new tools.Tools();

// PS compatability
// @ts-expect-error
global.toID = (input: string | number | {id: string} | undefined): string => {
	return Tools.toId(input);
};

// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - generated after first run
import * as config from './config';
import * as ConfigLoader from './config-loader';
global.Config = ConfigLoader.load(config);

import * as dex from './dex';
global.Dex = new dex.Dex();

import * as client from './client';
global.Client = new client.Client();

import * as commandParser from './command-parser';
global.CommandParser = new commandParser.CommandParser();

import commands = require('./commands');
global.Commands = CommandParser.loadBaseCommands(commands);
global.BaseCommands = Tools.deepClone(global.Commands);

import * as games from './games';
global.Games = new games.Games();

import * as rooms from './rooms';
global.Rooms = new rooms.Rooms();

import * as storage from './storage';
global.Storage = new storage.Storage();

import * as tournaments from './tournaments';
global.Tournaments = new tournaments.Tournaments();

import * as users from './users';
global.Users = new users.Users();

module.exports = (async(): Promise<void> => {
	await Dex.loadAllData();

	Tournaments.loadSchedules();
	Games.loadFormats();
	Storage.importDatabases();
});
