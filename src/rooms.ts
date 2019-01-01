import { Player } from "./room-activity";
import { Game } from "./room-game";
import { Tournament } from "./room-tournament";
import { User } from "./users";

export class Room {
	game = null as Game | null;
	messageListeners = {} as Dict<() => void>;
	tournament = null as Tournament | null;
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

	sayHtml(html: string) {
		this.say("/addhtmlbox " + html);
	}

	pmHtml(user: User | Player, html: string) {
		this.say("/pminfobox " + user.id + "," + html);
	}

	pmUhtml(user: User | Player, id: string, html: string) {
		this.say("/pmuhtml " + user.id + "," + id + "," + html);
	}

	on(message: string, listener: () => void) {
		this.messageListeners[Tools.toId(message)] = listener;
	}
}

export class Rooms {
	rooms = {} as Dict<Room>;

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}

	get(id: string): Room | undefined {
		return this.rooms[id];
	}
}
