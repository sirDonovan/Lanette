import { Game } from "./room-game";
import { User } from "./users";

export class Room {
	game = null as Game | null;
	users = new Set<User>();

	id: string;
	sendId: string;

	constructor(id: string) {
		this.id = id;
		this.sendId = id === 'lobby' ? '' : id;
	}

	say(message: string) {
		Client.send(this.sendId + "|" + message);
	}
}

export class Rooms {
	rooms = {} as Dict<Room>;

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}
}
