import { UserHosted } from "./games/templates/user-hosted";
import { Player } from "./room-activity";
import { Game } from "./room-game";
import { Tournament } from "./room-tournament";
import { IRoomInfoResponse } from "./types/client-message-types";
import { User } from "./users";

export type RoomType = 'battle' | 'chat' | 'html';

export class Room {
	bannedWords: string[] | null = null;
	game: Game | null = null;
	messageListeners: Dict<() => void> = {};
	modchat: string = 'off';
	tournament: Tournament | null = null;
	userHostedGame: UserHosted | null = null;
	users = new Set<User>();

	id: string;
	logChatMessages: boolean;
	sendId: string;
	title: string;
	type!: RoomType;

	constructor(id: string) {
		this.id = id;
		this.logChatMessages = !id.startsWith('battle-') && !id.startsWith('groupchat-') && !Config.disallowChatLogging.includes(id);
		this.sendId = id === 'lobby' ? '' : id;
		this.title = id;
	}

	init(type: RoomType) {
		this.type = type;
	}

	deInit() {
		if (this.game) this.game.deallocate();
		if (this.tournament) this.tournament.deallocate();
		if (this.userHostedGame) this.userHostedGame.deallocate();

		this.users.forEach(user => {
			user.rooms.delete(this);
			if (!user.rooms.size) Users.remove(user);
		});
	}

	onRoomInfoResponse(response: IRoomInfoResponse) {
		this.modchat = response.modchat === false ? 'off' : response.modchat;
		this.title = response.title;
	}

	say(message: string, dontPrepare?: boolean) {
		if (!dontPrepare) message = Tools.prepareMessage(message);
		if (Client.willBeFiltered(message, this)) return;
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
	private rooms: Dict<Room> = {};

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}

	get(id: string): Room | undefined {
		return this.rooms[id];
	}

	remove(room: Room) {
		room.deInit();
		delete this.rooms[room.id];
	}

	removeAll() {
		for (const i in this.rooms) {
			this.remove(this.rooms[i]);
		}
	}
}
