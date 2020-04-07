import { assertStrictEqual } from "../test-tools";

describe("Users", () => {
	it('should strip formatting from names', () => {
		const id = "testuser";
		let user = Users.add(id, id);
		assertStrictEqual(user.name, id);
		Users.remove(user);

		const formatting: string[] = ['*', '_', '`', '~', '^', '\\'];
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
});
