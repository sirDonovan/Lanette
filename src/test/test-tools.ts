import nodeAssert = require('assert');

import type { Player } from '../room-activity';
import type { ScriptedGame } from '../room-game-scripted';
import type { Room } from '../rooms';
import type { RunOptions } from '../types/root';
import type { User } from '../users';

const basePlayerName = 'Mocha Player';

export const testOptions: RunOptions = {};

export function getBasePlayerName(): string {
	return basePlayerName;
}

export function createTestRoom(id?: string, title?: string): Room {
	if (!id) id = 'mocha';
	const oldRoom = Rooms.get(id);
	if (oldRoom) Rooms.remove(oldRoom);

	const room = Rooms.add(id);
	room.setPublicRoom(true);
	room.setTitle(title || 'Mocha');
	room.onUserJoin(Users.self, Client.getGroupSymbols().bot);

	return room;
}

function getAdditionalInformation(message: string): string {
	const roomInformation: string[] = [];
	const room = Rooms.get('mocha');
	if (room) {
		if (room.game) {
			roomInformation.push("Scripted game = " + room.game.name + "; initial seed = " + room.game.initialSeed);
		}
		if (room.userHostedGame) {
			roomInformation.push("User-hosted game = " + room.userHostedGame.name + "; initial seed = " +
				room.userHostedGame.initialSeed);
		}
		if (room.tournament) {
			roomInformation.push("Tournament = " + room.tournament.name);
		}
	}

	if (!roomInformation.length) return message;
	return message + "\n\nAdditional information:\n" + roomInformation.join("\n") + "\n";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, message?: string | Error | undefined): asserts condition {
	if (!message) message = '';

	nodeAssert(condition, typeof message === 'string' ? getAdditionalInformation(message) : message);
}

export function assertStrictEqual<T>(actual: T, expected: T, message?: string | Error | undefined): asserts actual is T {
	if (!message) message = '';

	nodeAssert.strictEqual(actual, expected, typeof message === 'string' ? getAdditionalInformation(message) : message);
}

function checkClientSendQueue(startingSendQueueIndex: number, input: readonly string[]): string[] {
	const expected = input.slice();
	const outgoingMessageQueue = Client.getOutgoingMessageQueue();
	for (let i = startingSendQueueIndex; i < outgoingMessageQueue.length; i++) {
		if (outgoingMessageQueue[i].message === expected[0]) {
			expected.shift();
		}
	}

	return expected;
}

export function assertClientSendQueue(startingSendQueueIndex: number, input: readonly string[]): void {
	const expected = checkClientSendQueue(startingSendQueueIndex, input);
	assert(expected.length === 0, "Not found in Client's send queue:\n\n" + expected.join("\n"));
}

export function addPlayer(game: ScriptedGame, name: string): Player {
	const user = Users.add(name, Tools.toId(name));
	assert(user);
	user.autoconfirmed = true;

	(game.room as Room).onUserJoin(user, ' ');

	const player = game.addPlayer(user);
	assert(player);

	return player;
}

export function addPlayers(game: ScriptedGame, numberOrNames?: number | string[]): Player[] {
	const players: Player[] = [];
	if (Array.isArray(numberOrNames)) {
		for (const name of numberOrNames) {
			players.push(addPlayer(game, name));
		}
	} else {
		if (!numberOrNames) numberOrNames = game.minPlayers;
		for (let i = 1; i <= numberOrNames; i++) {
			players.push(addPlayer(game, basePlayerName + ' ' + i));
		}
	}

	return players;
}

export function startGame(game: ScriptedGame): void {
	game.start();
	assert(game.started);
	assert(!game.ended);
}

export function runCommand(command: string, target: string, room: Room | User, user: User | string): void {
	if (typeof user === 'string') user = Users.add(user, Tools.toId(user));
	assert(CommandParser.parse(room, user, Config.commandCharacter + command + (target ? " " + target : ""), Date.now()));
}
