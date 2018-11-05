import { User } from "./users";

export class Room {
	users = new Set<User>();

	id: string;

	constructor(id: string) {
		this.id = id;
	}
}

export class Rooms {
	rooms = {} as Dict<Room>;

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}
}
