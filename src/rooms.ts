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
	readonly htmlMessageListeners: Dict<() => void> = {};
	readonly messageListeners: Dict<() => void> = {};
	modchat: string = 'off';
	tournament: Tournament | null = null;
	userHostedGame: UserHosted | null = null;
	readonly uhtmlMessageListeners: Dict<Dict<() => void>> = {};
	readonly users = new Set<User>();

	readonly id: string;
	logChatMessages: boolean;
	readonly sendId: string;
	title: string;
	type!: RoomType;

	constructor(id: string) {
		this.id = id;
		this.logChatMessages = !id.startsWith('battle-') && !id.startsWith('groupchat-') && !(Config.disallowChatLogging && Config.disallowChatLogging.includes(id));
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

	sayUhtml(uhtmlName: string, html: string) {
		this.say("/adduhtml " + uhtmlName + ", " + html, true);
	}

	sayUhtmlChange(uhtmlName: string, html: string) {
		this.say("/changeuhtml " + uhtmlName + ", " + html, true);
	}

	pmHtml(user: User | Player, html: string) {
		this.say("/pminfobox " + user.id + "," + html, true);
	}

	pmUhtml(user: User | Player, uhtmlName: string, html: string) {
		this.say("/pmuhtml " + user.id + "," + uhtmlName + "," + html, true);
	}

	pmUhtmlChange(user: User | Player, uhtmlName: string, html: string) {
		this.say("/pmuhtmlchange " + user.id + "," + uhtmlName + "," + html, true);
	}

	on(message: string, listener: () => void) {
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
	}

	onHtml(html: string, listener: () => void) {
		html = '<div class="infobox">' + html;
		if (Users.self.group !== Client.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + Users.self.name + ']</div><div style="clear:both"></div>';
		html += '</div>';
		this.htmlMessageListeners[Tools.toId(html)] = listener;
	}

	onUhtml(name: string, html: string, listener: () => void) {
		const id = Tools.toId(name);
		if (!this.uhtmlMessageListeners[id]) this.uhtmlMessageListeners[id] = {};
		if (Users.self.group !== Client.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + Users.self.name + ']</div><div style="clear:both"></div>';
		this.uhtmlMessageListeners[id][Tools.toId(html)] = listener;
	}
}

export class Rooms {
	readonly globalRoom: Room = new Room('global');
	private rooms: Dict<Room> = {};

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}

	search(input: string): Room | undefined {
		let id = Tools.toRoomId(input);
		if (Config.roomAliases && !(id in this.rooms) && Config.roomAliases[id]) id = Config.roomAliases[id];
		return this.get(id);
	}

	remove(room: Room) {
		if (room === this.globalRoom) return;
		room.deInit();
		delete this.rooms[room.id];
	}

	removeAll() {
		for (const i in this.rooms) {
			this.remove(this.rooms[i]);
		}
	}

	private get(id: string): Room | undefined {
		return this.rooms[id];
	}
}
