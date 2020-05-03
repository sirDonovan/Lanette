import { assert, assertStrictEqual } from './../test-tools';

/* eslint-env mocha */

describe("Client", () => {
	it('should support all join and leave message types', () => {
		const room = Rooms.get('mocha')!;

		Client.parseMessage(room, "|J|+Voice");
		let voiceUser = Users.get('Voice')!;
		const roomData = voiceUser.rooms.get(room);
		assert(roomData);
		assertStrictEqual(roomData.rank, "+");
		assertStrictEqual(voiceUser.rooms.size, 1);

		// close the room tab
		Client.parseMessage(room, "|L|+Voice");
		assert(!voiceUser.rooms.has(room));
		assert(!Users.get('Voice'));

		Client.parseMessage(room, "|J|+Voice");
		voiceUser = Users.get('Voice')!;
		assert(voiceUser.rooms.has(room));

		// use /logout
		Client.parseMessage(room, "|L|voice");
		assert(!voiceUser.rooms.has(room));
		assert(!Users.get('Voice'));
	});
});
