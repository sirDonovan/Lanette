import { assertStrictEqual, createTestRoom } from "../test-tools";

/* eslint-env mocha */

describe("Storage", () => {
	it('should handle renames properly', () => {
		const room = createTestRoom("mocha", "Mocha");
		const database = Storage.getDatabase(room);

		const newName = Rooms.renameRoom(room, "newname", "New Name");
		Storage.renameRoom(newName, "mocha");
		assertStrictEqual(Storage.getDatabase(newName), database);

		const caseChange = Rooms.renameRoom(room, "newname", "newname");
		Storage.renameRoom(caseChange, "newname");
		assertStrictEqual(Storage.getDatabase(caseChange), database);
	});
});