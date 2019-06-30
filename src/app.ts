import * as tools from './tools';
global.Tools = new tools.Tools();

// @ts-ignore - generated after first run
import * as config from './config';
global.Config = config;

if (Config.rooms) Config.rooms = Config.rooms.map(x => Tools.toRoomId(x));
if (Config.developers) Config.developers = Config.developers.map(x => Tools.toId(x));
if (Config.allowScriptedGames) Config.allowScriptedGames = Config.allowScriptedGames.map(x => Tools.toRoomId(x));
if (Config.disallowChatLogging) Config.disallowChatLogging = Config.disallowChatLogging.map(x => Tools.toRoomId(x));
if (Config.allowTournaments) Config.allowTournaments = Config.allowTournaments.map(x => Tools.toRoomId(x));
if (Config.rankedTournaments) Config.rankedTournaments = Config.rankedTournaments.map(x => Tools.toRoomId(x));
if (Config.rankedCustomTournaments) Config.rankedCustomTournaments = Config.rankedCustomTournaments.map(x => Tools.toRoomId(x));
if (Config.useDefaultUnrankedTournaments) Config.useDefaultUnrankedTournaments = Config.useDefaultUnrankedTournaments.map(x => Tools.toRoomId(x));
if (Config.disallowTournamentBattleLinks) Config.disallowTournamentBattleLinks = Config.disallowTournamentBattleLinks.map(x => Tools.toRoomId(x));
for (const i in Config.tournamentRoomAdvertisements) {
	const id = Tools.toRoomId(i);
	Config.tournamentRoomAdvertisements[id] = Config.tournamentRoomAdvertisements[i].map(x => Tools.toRoomId(x));
	if (id !== i) delete Config.tournamentRoomAdvertisements[i];
}

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

import * as storage from './storage';
global.Storage = new storage.Storage();

import * as tournaments from './tournaments';
global.Tournaments = new tournaments.Tournaments();

import * as users from './users';
global.Users = new users.Users();
