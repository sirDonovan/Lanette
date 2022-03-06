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

		Rooms.remove(roomB);
		assert(!Users.get("B"));
		assertStrictEqual(Users.get("A"), userA);

		Rooms.remove(roomA);
		assert(!Users.get("A"));
	});

	it('should handle renames properly', () => {
		const room = createTestRoom("oldroom", "Old Room");
		Rooms.renameRoom(room, "newroom", "New Room");
		assertStrictEqual(room.id, "newroom");
		assertStrictEqual(room.title, "New Room");
		assert(!Rooms.getRoomIds().includes("oldroom"));
		assert(Rooms.getRoomIds().includes("newroom"));

		Rooms.renameRoom(room, "newroom", "NEW ROOM");
		assertStrictEqual(room.id, "newroom");
		assertStrictEqual(room.title, "NEW ROOM");
		assert(Rooms.getRoomIds().includes("newroom"));

		const mergeRoom = createTestRoom("mergeroom", "Merge Room");
		Rooms.renameRoom(mergeRoom, "newroom", "New Room");
		assert(!Rooms.getRoomIds().includes("mergeroom"));
		assertStrictEqual(mergeRoom.users, undefined);
	});
});
