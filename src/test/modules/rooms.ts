import { assert, assertStrictEqual, createTestRoom } from "../test-tools";

/* eslint-env mocha */

describe("Rooms", () => {
	it('should remove users as appropriate on destroy', () => {
		const roomA = createTestRoom("a", "A");
		const roomB = createTestRoom("b", "B");

		const userA = Users.add("A", "a");
		const userB = Users.add("B", "b");

		roomA.onUserJoin(userA, " ");
		roomB.onUserJoin(userA, " ");
		roomB.onUserJoin(userB, " ");

		assertStrictEqual(roomA.users.size, 2);
		assertStrictEqual(roomB.users.size, 3);

		roomA.onUserLeave(Users.self);
		roomB.onUserLeave(Users.self);
		assertStrictEqual(roomA.users.size, 1);
		assertStrictEqual(roomB.users.size, 2);

		Rooms.remove(roomB);
		assert(!Users.get("B"));
		assertStrictEqual(Users.get("A"), userA);

		Rooms.remove(roomA);
		assert(!Users.get("A"));
	});

	it('should handle renames properly', () => {
		const room = createTestRoom("oldroom", "Old Room");

		const newName = Rooms.renameRoom(room, "newroom", "New Room");
		assertStrictEqual(room, newName);
		assertStrictEqual(newName.id, "newroom");
		assertStrictEqual(newName.title, "New Room");
		assert(!Rooms.getRoomIds().includes("oldroom"));
		assert(Rooms.getRoomIds().includes("newroom"));

		const caseChange = Rooms.renameRoom(room, "newroom", "NEW ROOM");
		assertStrictEqual(newName, caseChange);
		assertStrictEqual(caseChange.id, "newroom");
		assertStrictEqual(caseChange.title, "NEW ROOM");
		assert(Rooms.getRoomIds().includes("newroom"));

		const roomToMerge = createTestRoom("mergeroom", "Merge Room");
		const mergedRoom = Rooms.renameRoom(roomToMerge, "newroom", "New Room");
		assertStrictEqual(mergedRoom, newName);
		assert(!Rooms.getRoomIds().includes("mergeroom"));
		assertStrictEqual(roomToMerge.users, undefined);
	});
});
