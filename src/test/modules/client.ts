import type { GroupName, IOutgoingMessage } from '../../types/client';
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
	it('should properly clear lastOutgoingMessage', () => {
		const room = Rooms.get('mocha')!;

		let lastOutgoingMessage: IOutgoingMessage = {
			message: "",
			type: "chat",
			text: "test",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "test", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,test", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,test", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|test", Date.now());
		assert(!Client.lastOutgoingMessage);

		lastOutgoingMessage = {
			message: "",
			type: "html",
			html: "&<br/>",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		lastOutgoingMessage = {
			message: "",
			type: "uhtml",
			uhtmlName: "test",
			html: "&<br/>",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		Client.parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|c|*" + Users.self.name + "|" + Client.uhtmlChangeChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		lastOutgoingMessage = {
			message: "",
			type: "pm",
			user: 'a',
			text: "test",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "test", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,test", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,test", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|test", Date.now());
		assert(!Client.lastOutgoingMessage);

		lastOutgoingMessage = {
			message: "",
			type: "pmhtml",
			user: 'a',
			html: "&<br/>",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		lastOutgoingMessage = {
			message: "",
			type: "pmuhtml",
			user: 'a',
			uhtmlName: 'test',
			html: "&<br/>",
		};

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.htmlChatCommand + "&amp;<br/>", Date.now());
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.lastOutgoingMessage);
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&<br />", Date.now());
		assert(!Client.lastOutgoingMessage);

		Client.lastOutgoingMessage = lastOutgoingMessage;
		Client.parseMessage(room, "|pm| " + Users.self.name + "| A|" + Client.uhtmlChangeChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.lastOutgoingMessage);
	});
	it('should properly extract battle ids', () => {
		const format = "gen8ou";
		const battleId = Tools.battleRoomPrefix + format + "-12345";
		const password = 'password';

		const badReplayLinks: string[] = ["", "/"];
		const goodReplayLinks: string[] = ["/" + battleId, "/" + battleId + "-" + password, "/" + format + "-12345"];
		const badBattleLinks: string[] = ["", "/", "/" + format + "-12345"];
		const goodBattleLinks: string[] = ["/" + battleId, "/" + battleId + "-" + password];
		const badBattleRooms: string[] = ["", "" + format + "-12345"];
		const goodBattleRooms: string[] = [battleId, battleId + "-" + password];

		for (const badReplayLink of badReplayLinks) {
			assertStrictEqual(Client.extractBattleId(Client.replayServerAddress + badReplayLink), null);
			assertStrictEqual(Client.extractBattleId("http://" + Client.replayServerAddress + badReplayLink), null);
			assertStrictEqual(Client.extractBattleId("https://" + Client.replayServerAddress + badReplayLink), null);
		}

		for (const goodReplayLink of goodReplayLinks) {
			const variations = [Client.replayServerAddress + goodReplayLink, "http://" + Client.replayServerAddress + goodReplayLink,
				"https://" + Client.replayServerAddress + goodReplayLink];
			for (const variation of variations) {
				const extractedBattleId = Client.extractBattleId(variation);
				assert(extractedBattleId);
				assertStrictEqual(extractedBattleId.format, format);
				assertStrictEqual(extractedBattleId.publicId, battleId);
				if (goodReplayLink.includes(password)) {
					assertStrictEqual(extractedBattleId.fullId, battleId + "-" + password);
					assertStrictEqual(extractedBattleId.password, password);
				} else {
					assertStrictEqual(extractedBattleId.fullId, battleId);
					assert(!extractedBattleId.password);
				}
			}
		}

		for (const badBattleLink of badBattleLinks) {
			assertStrictEqual(Client.extractBattleId(Client.server + badBattleLink), null);
			assertStrictEqual(Client.extractBattleId("http://" + Client.server + badBattleLink), null);
			assertStrictEqual(Client.extractBattleId("https://" + Client.server + badBattleLink), null);
		}

		for (const goodBattleLink of goodBattleLinks) {
			const variations = [Client.server + goodBattleLink, "http://" + Client.server + goodBattleLink,
				"https://" + Client.server + goodBattleLink];
			for (const variation of variations) {
				const extractedBattleId = Client.extractBattleId(variation);
				assert(extractedBattleId);
				assertStrictEqual(extractedBattleId.format, format);
				assertStrictEqual(extractedBattleId.publicId, battleId);
				if (goodBattleLink.includes(password)) {
					assertStrictEqual(extractedBattleId.fullId, battleId + "-" + password);
					assertStrictEqual(extractedBattleId.password, password);
				} else {
					assertStrictEqual(extractedBattleId.fullId, battleId);
					assert(!extractedBattleId.password);
				}
			}
		}

		for (const badBattleRoom of badBattleRooms) {
			assertStrictEqual(Client.extractBattleId(badBattleRoom), null);
		}

		for (const goodBattleRoom of goodBattleRooms) {
			const extractedBattleId = Client.extractBattleId(goodBattleRoom);
			assert(extractedBattleId);
			assertStrictEqual(extractedBattleId.format, format);
			assertStrictEqual(extractedBattleId.publicId, battleId);
			if (goodBattleRoom.includes(password)) {
				assertStrictEqual(extractedBattleId.fullId, battleId + "-" + password);
				assertStrictEqual(extractedBattleId.password, password);
			} else {
				assertStrictEqual(extractedBattleId.fullId, battleId);
				assert(!extractedBattleId.password);
			}
		}
	});
});
