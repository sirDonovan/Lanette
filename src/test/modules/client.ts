import type { GroupName } from '../../types/client';
import { assert, assertStrictEqual } from './../test-tools';

/* eslint-env mocha */

describe("Client", () => {
	it('should load default server groups', () => {
		const rankings: KeyedDict<GroupName, number> = {
			'administrator': Client.serverGroups[Client.groupSymbols.administrator].ranking,
			'roomowner': Client.serverGroups[Client.groupSymbols.roomowner].ranking,
			'host': Client.serverGroups[Client.groupSymbols.host].ranking,
			'moderator': Client.serverGroups[Client.groupSymbols.moderator].ranking,
			'driver': Client.serverGroups[Client.groupSymbols.driver].ranking,
			'bot': Client.serverGroups[Client.groupSymbols.bot].ranking,
			'player': Client.serverGroups[Client.groupSymbols.player].ranking,
			'voice': Client.serverGroups[Client.groupSymbols.voice].ranking,
			'prizewinner': Client.serverGroups[Client.groupSymbols.prizewinner].ranking,
			'regularuser': Client.serverGroups[Client.groupSymbols.regularuser].ranking,
			'muted': Client.serverGroups[Client.groupSymbols.muted].ranking,
			'locked': Client.serverGroups[Client.groupSymbols.locked].ranking,
		};

		const ranks = Object.keys(rankings) as GroupName[];
		for (const rank of ranks) {
			assertStrictEqual(typeof rankings[rank], 'number');
		}

		for (let i = 1; i < ranks.length; i++) {
			assert(rankings[ranks[i]] < rankings[ranks[i - 1]]);
		}
	});
	it('should support all join and leave message types', () => {
		const room = Rooms.get('mocha')!;

		Client.parseMessage(room, "|J|+Voice", Date.now());
		let voiceUser = Users.get('Voice')!;
		const roomData = voiceUser.rooms.get(room);
		assert(roomData);
		assertStrictEqual(roomData.rank, "+");
		assertStrictEqual(voiceUser.rooms.size, 1);

		// close the room tab
		Client.parseMessage(room, "|L|+Voice", Date.now());
		assert(!Users.get('Voice'));

		Client.parseMessage(room, "|J|+Voice", Date.now());
		voiceUser = Users.get('Voice')!;
		assert(voiceUser.rooms.has(room));

		// use /logout
		Client.parseMessage(room, "|L|voice", Date.now());
		assert(!Users.get('Voice'));
	});
	it('should support all rename scenarios', () => {
		const room = Rooms.get('mocha')!;

		// different name
		Client.parseMessage(room, "|J| A", Date.now());
		let user = Users.get("A")!;
		Client.parseMessage(room, "|N| B|a", Date.now());
		assertStrictEqual(Users.get("B"), user);
		assertStrictEqual(user.name, "B");
		Client.parseMessage(room, "|L| B", Date.now());

		// promotion
		Client.parseMessage(room, "|J| A", Date.now());
		user = Users.get("A")!;
		Client.parseMessage(room, "|N|+A|a", Date.now());
		assertStrictEqual(Users.get("A"), user);
		assertStrictEqual(user.rooms.get(room)!.rank, "+");
		Client.parseMessage(room, "|L|+A", Date.now());

		// same name
		Client.parseMessage(room, "|J| Regular", Date.now());
		user = Users.get("Regular")!;
		Client.parseMessage(room, "|N| REGULAR|regular", Date.now());
		assertStrictEqual(Users.get("REGULAR"), user);
		assertStrictEqual(user.name, "REGULAR");
		Client.parseMessage(room, "|L| REGULAR", Date.now());

		// merging users
		Client.parseMessage(room, "|J| A", Date.now());
		user = Users.get("A")!;
		Client.parseMessage(room, "|J| B", Date.now());
		Client.parseMessage(room, "|N| B|a", Date.now());
		assert(Users.get("B") !== user);
		Client.parseMessage(room, "|L| B", Date.now());
	});
	it('should properly parse PM messages', () => {
		const room = Rooms.add('lobby');

		Client.parseMessage(room, "|pm| Regular| " + Users.self.name + "|test", Date.now());
		let regularUser = Users.get('Regular');
		assert(regularUser);
		Users.remove(regularUser);

		Client.parseMessage(room, "|pm| " + Users.self.name + "| Regular|test", Date.now());
		regularUser = Users.get('Regular');
		assert(regularUser);
		Users.remove(regularUser);

		Client.parseMessage(room, "|pm|+Voice| " + Users.self.name + "|test", Date.now());
		let voiceUser = Users.get('Voice');
		assert(voiceUser);
		Users.remove(voiceUser);

		Client.parseMessage(room, "|pm| " + Users.self.name + "|+Voice|test", Date.now());
		voiceUser = Users.get('Voice');
		assert(voiceUser);
		Users.remove(voiceUser);
	});
});
