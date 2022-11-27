import type { Room } from '../../rooms';
import type { GroupName, IOutgoingMessage } from '../../types/client';
import { assert, assertStrictEqual, createTestRoom } from './../test-tools';

/* eslint-env mocha */

const parseMessage = function(room: Room, incomingMessage: string, now: number): void {
	Client.parseMessage(room, Tools.parseIncomingMessage(incomingMessage), now);
};

const setLastOutgoingMessage = function(outgoingMessage: IOutgoingMessage): void {
	// @ts-expect-error
	Client.websocket.lastOutgoingMessage = outgoingMessage;
};

describe("Client", () => {
	it('should load default server groups', () => {
		const serverGroups = Client.getServerGroups();
		const groupSymbols = Client.getGroupSymbols();
		const rankings: KeyedDict<GroupName, number> = {
			'administrator': serverGroups[groupSymbols.administrator].ranking,
			'roomowner': serverGroups[groupSymbols.roomowner].ranking,
			'host': serverGroups[groupSymbols.host].ranking,
			'moderator': serverGroups[groupSymbols.moderator].ranking,
			'driver': serverGroups[groupSymbols.driver].ranking,
			'bot': serverGroups[groupSymbols.bot].ranking,
			'player': serverGroups[groupSymbols.player].ranking,
			'voice': serverGroups[groupSymbols.voice].ranking,
			'star': serverGroups[groupSymbols.star].ranking,
			'prizewinner': serverGroups[groupSymbols.prizewinner].ranking,
			'regularuser': serverGroups[groupSymbols.regularuser].ranking,
			'muted': serverGroups[groupSymbols.muted].ranking,
			'locked': serverGroups[groupSymbols.locked].ranking,
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
		const room = createTestRoom();

		parseMessage(room, "|J|+Voice", Date.now());
		let voiceUser = Users.get('Voice')!;
		const roomData = voiceUser.rooms.get(room);
		assert(roomData);
		assertStrictEqual(roomData.rank, "+");
		assertStrictEqual(voiceUser.rooms.size, 1);

		// close the room tab
		parseMessage(room, "|L|+Voice", Date.now());
		assert(!Users.get('Voice'));

		parseMessage(room, "|J|+Voice", Date.now());
		voiceUser = Users.get('Voice')!;
		assert(voiceUser.rooms.has(room));

		// use /logout
		parseMessage(room, "|L|voice", Date.now());
		assert(!Users.get('Voice'));

		Rooms.remove(room);
	});
	it('should support all rename scenarios', () => {
		const room = createTestRoom();

		// different name
		parseMessage(room, "|J| A", Date.now());
		let user = Users.get("A")!;
		parseMessage(room, "|N| B|a", Date.now());
		assertStrictEqual(Users.get("B"), user);
		assertStrictEqual(user.name, "B");
		parseMessage(room, "|L| B", Date.now());

		// promotion
		parseMessage(room, "|J| A", Date.now());
		user = Users.get("A")!;
		parseMessage(room, "|N|+A|a", Date.now());
		assertStrictEqual(Users.get("A"), user);
		assertStrictEqual(user.rooms.get(room)!.rank, "+");
		parseMessage(room, "|L|+A", Date.now());

		// same name
		parseMessage(room, "|J| Regular", Date.now());
		user = Users.get("Regular")!;
		parseMessage(room, "|N| REGULAR|regular", Date.now());
		assertStrictEqual(Users.get("REGULAR"), user);
		assertStrictEqual(user.name, "REGULAR");
		parseMessage(room, "|L| REGULAR", Date.now());

		// merging users
		parseMessage(room, "|J| A", Date.now());
		user = Users.get("A")!;
		parseMessage(room, "|J| B", Date.now());
		parseMessage(room, "|N| B|a", Date.now());
		assert(Users.get("B") !== user);
		parseMessage(room, "|L| B", Date.now());

		Rooms.remove(room);
	});
	it('should properly parse PM messages', () => {
		const room = createTestRoom('lobby', 'Lobby');

		parseMessage(room, "|pm| Regular| " + Users.self.name + "|test", Date.now());
		let regularUser = Users.get('Regular');
		assert(regularUser);
		Users.remove(regularUser);

		parseMessage(room, "|pm| " + Users.self.name + "| Regular|test", Date.now());
		regularUser = Users.get('Regular');
		assert(regularUser);
		Users.remove(regularUser);

		parseMessage(room, "|pm|+Voice| " + Users.self.name + "|test", Date.now());
		let voiceUser = Users.get('Voice');
		assert(voiceUser);
		Users.remove(voiceUser);

		parseMessage(room, "|pm| " + Users.self.name + "|+Voice|test", Date.now());
		voiceUser = Users.get('Voice');
		assert(voiceUser);
		Users.remove(voiceUser);

		Rooms.remove(room);
	});
	it('should properly clear lastOutgoingMessage', () => {
		const htmlChatCommand = Client.getHtmlChatCommand();
		const uhtmlChatCommand = Client.getUhtmlChatCommand();
		const uhtmlChangeChatCommand = Client.getUhtmlChangeChatCommand();
		const room = createTestRoom();

		let lastOutgoingMessage: IOutgoingMessage = {
			message: "",
			type: "chat",
			text: "test",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "test", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,test", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,test", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|test", Date.now());
		assert(!Client.getLastOutgoingMessage());

		lastOutgoingMessage = {
			message: "",
			type: "chat-html",
			html: "&<br/>",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		lastOutgoingMessage = {
			message: "",
			type: "chat-uhtml",
			uhtmlName: "test",
			html: "&<br/>",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&amp;<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + htmlChatCommand + "&amp;<br/>", Date.now());
		parseMessage(room, "|c|*" + Users.self.name + "|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|c|*" + Users.self.name + "|" + uhtmlChangeChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		lastOutgoingMessage = {
			message: "",
			type: "pm",
			userid: 'a',
			text: "test",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "test", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,test", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,test", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|test", Date.now());
		assert(!Client.getLastOutgoingMessage());

		lastOutgoingMessage = {
			message: "",
			type: "pm-html",
			userid: 'a',
			html: "&<br/>",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		lastOutgoingMessage = {
			message: "",
			type: "pm-uhtml",
			userid: 'a',
			uhtmlName: 'test',
			html: "&<br/>",
		};

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&amp;<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + htmlChatCommand + "&amp;<br/>", Date.now());
		parseMessage(room, "|pm| " + Users.self.name + "| A|&amp;<br/>", Date.now());
		assert(Client.getLastOutgoingMessage());
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&amp;<br/>", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		setLastOutgoingMessage(lastOutgoingMessage);
		parseMessage(room, "|pm| " + Users.self.name + "| A|" + uhtmlChangeChatCommand + "test,&amp;<br />", Date.now());
		assert(!Client.getLastOutgoingMessage());

		Rooms.remove(room);
	});
	it('should properly extract battle ids', () => {
		const replayServerAddress = Client.getReplayServerAddress();
		const server = Client.getServerAddress();
		const format = "gen8ou";
		const battleId = Tools.battleRoomPrefix + format + "-12345";
		const password = 'password';

		const badReplayLinks: string[] = ["", "/"];
		const goodReplayLinks: string[] = ["/" + battleId, "/" + battleId + "-" + password, "/" + format + "-12345",
			"/" + format + "-12345-" + password];
		const badBattleLinks: string[] = ["", "/", "/" + format + "-12345"];
		const goodBattleLinks: string[] = ["/" + battleId, "/" + battleId + "-" + password];
		const badBattleRooms: string[] = ["", format + "-12345"];
		const goodBattleRooms: string[] = [battleId, battleId + "-" + password];

		for (const badReplayLink of badReplayLinks) {
			assertStrictEqual(Client.extractBattleId(replayServerAddress + badReplayLink), null);
			assertStrictEqual(Client.extractBattleId("http://" + replayServerAddress + badReplayLink), null);
			assertStrictEqual(Client.extractBattleId("https://" + replayServerAddress + badReplayLink), null);
		}

		for (const goodReplayLink of goodReplayLinks) {
			const variations = [replayServerAddress + goodReplayLink,
				"http://" + replayServerAddress + goodReplayLink,
				"https://" + replayServerAddress + goodReplayLink];
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
			assertStrictEqual(Client.extractBattleId(server + badBattleLink), null);
			assertStrictEqual(Client.extractBattleId("http://" + server + badBattleLink), null);
			assertStrictEqual(Client.extractBattleId("https://" + server + badBattleLink), null);
		}

		for (const goodBattleLink of goodBattleLinks) {
			const variations = [server + goodBattleLink, "http://" + server + goodBattleLink,
				"https://" + server + goodBattleLink];
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
