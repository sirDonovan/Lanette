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
		const user = Users.add("Old User", "olduser");
		room.onUserJoin(user, " ");

		const newUser = Users.rename("New User", 'olduser');
		assertStrictEqual(user, newUser);
		assertStrictEqual(newUser.name, "New User");
		assertStrictEqual(newUser.id, "newuser");
		assert(!Users.getUserIds().includes("olduser"));
		assert(Users.getUserIds().includes("newuser"));

		const caseChange = Users.rename("NEWUSER", 'newuser');
		assertStrictEqual(newUser, caseChange);
		assertStrictEqual(caseChange.name, "NEWUSER");
		assert(Users.getUserIds().includes("newuser"));

		for (const format of Users.getNameFormattingList()) {
			Users.rename(format + "newUser" + format, 'newuser');
			assertStrictEqual(user.name, "newUser");
		}

		const userToMerge = Users.add("mergeuser", "mergeuser");
		room.onUserJoin(userToMerge, " ");

		const mergedUser = Users.rename("newuser", 'mergeuser');
		assertStrictEqual(newUser, mergedUser);
		assert(Users.getUserIds().includes("newuser"));
		assert(!Users.getUserIds().includes("mergeuser"));
		assertStrictEqual(userToMerge.rooms, undefined);
	});
});
