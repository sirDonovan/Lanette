import { assertStrictEqual } from "../test-tools";

const formatting: string[] = ['*', '_', '`', '~', '^', '\\'];

describe("Users", () => {
	it('should strip formatting from names', () => {
		const id = "testuser";
		let user = Users.add(id, id);
		assertStrictEqual(user.name, id);
		Users.remove(user);

		for (const format of formatting) {
			user = Users.add(format + id + format, id);
			assertStrictEqual(user.name, id);
			Users.remove(user);
		}

		user = Users.add("*_`~^\\" + id + "\\^~`_*", id);
		assertStrictEqual(user.name, id);
		Users.remove(user);

		user = Users.add("*_`~^\\" + id + "*_`~^\\", id);
		assertStrictEqual(user.name, id);
		Users.remove(user);
	});
	it('should handle renames properly', () => {
		const user = Users.add("olduser", "olduser");
		Users.rename("newuser", 'olduser');
		assertStrictEqual(user.name, "newuser");

		Users.rename("NEWUSER", 'newuser');
		assertStrictEqual(user.name, "NEWUSER");

		for (const format of formatting) {
			Users.rename(format + "newUser" + format, 'newuser');
			assertStrictEqual(user.name, "newUser");
		}
	});
});
