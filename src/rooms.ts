import { UserHosted } from "./games/templates/user-hosted";
import { Player } from "./room-activity";
import { Game } from "./room-game";
import { Tournament } from "./room-tournament";
import { User } from "./users";

export type RoomType = 'battle' | 'chat' | 'html';

export class Room {
	game: Game | null = null;
	messageListeners: Dict<() => void> = {};
	tournament: Tournament | null = null;
	userHostedGame: UserHosted | null = null;
	users = new Set<User>();

	id: string;
	logChatMessages: boolean;
	sendId: string;
	type!: RoomType;

	constructor(id: string) {
		this.id = id;
		this.logChatMessages = !id.startsWith('battle-') && !id.startsWith('groupchat-') && !Config.disallowChatLogging.includes(id);
		this.sendId = id === 'lobby' ? '' : id;
	}

	init(type: RoomType) {
		this.type = type;
	}

	say(message: string, dontPrepare?: boolean) {
		if (!dontPrepare) message = Tools.prepareMessage(message);
		Client.send(this.sendId + "|" + message);
	}

	sayCommand(command: string) {
		this.say(command, true);
	}

	sayHtml(html: string) {
		this.say("/addhtmlbox " + html, true);
	}

	sayUhtml(uhtmlId: string, html: string) {
		this.say("/adduhtml " + uhtmlId + ", " + html, true);
	}

	sayUhtmlChange(uhtmlId: string, html: string) {
		this.say("/changeuhtml " + uhtmlId + ", " + html, true);
	}

	pmHtml(user: User | Player, html: string) {
		this.say("/pminfobox " + user.id + "," + html, true);
	}

	pmUhtml(user: User | Player, id: string, html: string) {
		this.say("/pmuhtml " + user.id + "," + id + "," + html, true);
	}

	pmUhtmlChange(user: User | Player, id: string, html: string) {
		this.say("/pmuhtmlchange " + user.id + "," + id + "," + html, true);
	}

	on(message: string, listener: () => void) {
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
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
