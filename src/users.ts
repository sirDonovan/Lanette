import { Room } from "./rooms";

export class User {
	/** Map<Room, rank> */
	rooms = new Map<Room, string>();

	id: string;
	name: string;

	constructor(name: string, id: string) {
		this.name = name;
		this.id = id;
	}

	hasRank(room: Room, targetRank: string): boolean {
		if (!this.rooms.has(room) || !(targetRank in Client.serverGroups)) return false;
		return Client.serverGroups[this.rooms.get(room)!].ranking >= Client.serverGroups[targetRank].ranking;
	}

	isDeveloper(): boolean {
		return Config.developers.includes(this.id);
	}

	say(message: string) {
		Client.send("|/pm " + this.name + ", " + Tools.prepareMessage(message));
	}
}

export class Users {
	users: Dict<User> = {};

	self: User;

	constructor() {
		this.self = this.add(Config.username);
	}

	/** Should only be used when interacting with a potentially new user (in Client) */
	add(name: string): User {
		const id = Tools.toId(name);
		if (!(id in this.users)) this.users[id] = new User(name, id);
		return this.users[id];
	}

	get(name: string): User | undefined {
		return this.users[Tools.toId(name)];
	}

	remove(user: User) {
		delete this.users[user.id];
	}

	rename(name: string, oldId: string): User {
		if (!(oldId in this.users)) return this.add(name);
		const user = this.users[oldId];
		this.remove(user);
		const id = Tools.toId(name);
		if (id in this.users) return this.users[id];
		user.name = name;
		user.id = id;
		this.users[id] = user;
		return user;
	}
}
