import { assertStrictEqual } from "../test-tools";

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
		const user = Users.add("olduser", "olduser");
		Users.rename("newuser", 'olduser');
		assertStrictEqual(user.name, "newuser");

		Users.rename("NEWUSER", 'newuser');
		assertStrictEqual(user.name, "NEWUSER");

		for (const format of Users.getNameFormattingList()) {
			Users.rename(format + "newUser" + format, 'newuser');
			assertStrictEqual(user.name, "newUser");
		}
	});
});
