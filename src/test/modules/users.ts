import { assert, assertStrictEqual, createTestRoom } from "../test-tools";

/* eslint-env mocha */

describe("Users", () => {
	it('should strip formatting from names', () => {
		const id = "testuser";
		const left = id.substr(0, 4);
		const right = id.substr(4);

		let user = Users.add(id, id);
		assertStrictEqual(user.name, id);
		Users.remove(user);

		const formatting = Users.getNameFormattingList();
		for (const format of formatting) {
			user = Users.add(format + " " + id + " " + format, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);

			user = Users.add(format + format + " " + id, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);

			user = Users.add(id + " " + format + format, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);

			user = Users.add(left + format + format + right, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);

			user = Users.add(format + " " + left + format + format + right + " " + format, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);
		}

		const allFormatting = formatting.join("");
		user = Users.add(allFormatting + " " + id + " " + allFormatting, id);
		assertStrictEqual(user.name, id);
		Users.remove(user);

		user = Users.add(allFormatting + " " + id + " " + formatting.reverse().join(""), id);
		assertStrictEqual(user.name, id);
		Users.remove(user);
	});
	it('should handle renames properly', () => {
		const room = createTestRoom();
		const user = Users.add("olduser", "olduser");
		room.onUserJoin(user, " ");

		Users.rename("newuser", 'olduser');
		assertStrictEqual(user.name, "newuser");
		assert(!Users.getUserIds().includes("olduser"));
		assert(Users.getUserIds().includes("newuser"));

		Users.rename("NEWUSER", 'newuser');
		assertStrictEqual(user.name, "NEWUSER");
		assert(Users.getUserIds().includes("newuser"));

		for (const format of Users.getNameFormattingList()) {
			Users.rename(format + "newUser" + format, 'newuser');
			assertStrictEqual(user.name, "newUser");
		}

		const mergeUser = Users.add("mergeuser", "mergeuser");
		room.onUserJoin(mergeUser, " ");
		Users.rename("newuser", 'mergeuser');
		assert(Users.getUserIds().includes("newuser"));
		assert(!Users.getUserIds().includes("mergeuser"));
		assertStrictEqual(mergeUser.rooms, undefined);
	});
});
