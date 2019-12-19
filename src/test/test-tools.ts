import nodeAssert = require('assert');

import { Player } from '../room-activity';
import { Game } from '../room-game';
import { Room } from '../rooms';
import { User } from '../users';

const basePlayerName = 'Mocha Player';

export function assert(condition: any, message?: string | Error | undefined): asserts condition {
	nodeAssert(condition, message);
}

function checkClientSendQueue(startingSendQueueIndex: number, input: readonly string[]): string[] {
	const expected = input.slice();
	for (let i = startingSendQueueIndex; i < Client.sendQueue.length; i++) {
		if (Client.sendQueue[i] === expected[0]) {
			expected.shift();
		}
	}

	return expected;
}

export function assertClientSendQueue(startingSendQueueIndex: number, input: readonly string[]) {
	const expected = checkClientSendQueue(startingSendQueueIndex, input);
	assert(expected.length === 0, "Not found in Client's send queue:\n\n" + expected.join("\n"));
}

export function addPlayer(game: Game, name: string): Player {
	const user = Users.add(name);
	assert(user);
	user.rooms.set(game.room as Room, {lastChatMessage: Date.now(), rank: ' '});

	const player = game.addPlayer(user);
	assert(player);

	return player;
}

export function addPlayers(game: Game, numberOrNames: number | string[]): Player[] {
	const players: Player[] = [];
	if (Array.isArray(numberOrNames)) {
		for (let i = 0; i < numberOrNames.length; i++) {
			players.push(addPlayer(game, numberOrNames[i]));
		}
	} else {
		for (let i = 1; i <= numberOrNames; i++) {
			players.push(addPlayer(game, basePlayerName + ' ' + i));
		}
	}

	return players;
}

export async function runCommand(command: string, target: string, room: Room | User, user: User | string) {
	if (typeof user === 'string') user = Users.add(user);
	await CommandParser.parse(room, user, Config.commandCharacter + command + (target ? " " + target : ""));
}
