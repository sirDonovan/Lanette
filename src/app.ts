import * as tools from './tools';
global.Tools = new tools.Tools();

// @ts-ignore - generated after first run
import * as config from './config';
global.Config = config;

if (Config.rooms) Config.rooms = Config.rooms.map(x => Tools.toRoomId(x));
if (Config.developers) Config.developers = Config.developers.map(x => Tools.toId(x));
if (Config.allowScriptedGames) Config.allowScriptedGames = Config.allowScriptedGames.map(x => Tools.toRoomId(x));
if (Config.allowUserHostedGames) Config.allowUserHostedGames = Config.allowUserHostedGames.map(x => Tools.toRoomId(x));
if (Config.disallowChatLogging) Config.disallowChatLogging = Config.disallowChatLogging.map(x => Tools.toRoomId(x));
if (Config.allowTournaments) Config.allowTournaments = Config.allowTournaments.map(x => Tools.toRoomId(x));
if (Config.rankedTournaments) Config.rankedTournaments = Config.rankedTournaments.map(x => Tools.toRoomId(x));
if (Config.rankedCustomTournaments) Config.rankedCustomTournaments = Config.rankedCustomTournaments.map(x => Tools.toRoomId(x));
if (Config.useDefaultUnrankedTournaments) Config.useDefaultUnrankedTournaments = Config.useDefaultUnrankedTournaments.map(x => Tools.toRoomId(x));
if (Config.scheduledTournamentsMaxPlayerCap) Config.scheduledTournamentsMaxPlayerCap = Config.scheduledTournamentsMaxPlayerCap.map(x => Tools.toRoomId(x));
if (Config.displayTournamentFormatInfo) Config.displayTournamentFormatInfo = Config.displayTournamentFormatInfo.map(x => Tools.toRoomId(x));
if (Config.disallowTournamentScouting) Config.disallowTournamentScouting = Config.disallowTournamentScouting.map(x => Tools.toRoomId(x));
if (Config.disallowTournamentBattleLinks) Config.disallowTournamentBattleLinks = Config.disallowTournamentBattleLinks.map(x => Tools.toRoomId(x));
for (const i in Config.roomAliases) {
	const id = Tools.toRoomId(i);
	Config.roomAliases[id] = Tools.toRoomId(Config.roomAliases[i]);
	if (id !== i) delete Config.roomAliases[i];
}
for (const i in Config.tournamentAutoDQTimers) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		Config.tournamentAutoDQTimers[id] = Config.tournamentAutoDQTimers[i];
		delete Config.tournamentAutoDQTimers[i];
	}
}
for (const i in Config.tournamentStartTimers) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		Config.tournamentStartTimers[id] = Config.tournamentStartTimers[i];
		delete Config.tournamentStartTimers[i];
	}
}
for (const i in Config.defaultTournamentPlayerCaps) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		Config.defaultTournamentPlayerCaps[id] = Config.defaultTournamentPlayerCaps[i];
		delete Config.defaultTournamentPlayerCaps[i];
	}
}
for (const i in Config.tournamentRoomAdvertisements) {
	const id = Tools.toRoomId(i);
	Config.tournamentRoomAdvertisements[id] = Config.tournamentRoomAdvertisements[i].map(x => Tools.toRoomId(x));
	if (id !== i) delete Config.tournamentRoomAdvertisements[i];
}
for (const i in Config.maxUserHostedGameWinners) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		Config.maxUserHostedGameWinners[id] = Config.maxUserHostedGameWinners[i];
		delete Config.maxUserHostedGameWinners[i];
	}
}
for (const i in Config.maxQueuedUserHostedGames) {
	const id = Tools.toRoomId(i);
	if (id !== i) {
		Config.maxQueuedUserHostedGames[id] = Config.maxQueuedUserHostedGames[i];
		delete Config.maxQueuedUserHostedGames[i];
	}
}

import * as dex from './dex';
global.Dex = new dex.Dex('base');

import * as client from './client';
global.Client = new client.Client();

import * as commandParser from './command-parser';
global.CommandParser = new commandParser.CommandParser();

import commands = require('./commands');
global.Commands = Object.assign(Object.create(null), CommandParser.loadCommands(commands));

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
