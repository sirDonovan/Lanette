import { Game } from "./room-game";
import { Room } from "./rooms";

export class User {
	away: boolean | null = null;
	game: Game | null = null;
	group: string | null = null;
	/** Map<Room, rank> */
	rooms = new Map<Room, string>();
	status: string | null = null;

	id: string;
	name: string;

	htmlMessageListeners?: Dict<() => void>;
	messageListeners?: Dict<() => void>;
	uhtmlMessageListeners?: Dict<Dict<() => void>>;

	constructor(name: string, id: string) {
		this.name = Tools.stripHtmlCharacters(name);
		this.id = id;
	}

	hasRank(room: Room, targetRank: 'voice' | 'bot' | 'driver' | 'moderator' | 'roomowner' | 'locked'): boolean {
		if (!this.rooms.has(room) || !(targetRank in Client.groupSymbols)) return false;
		return Client.serverGroups[this.rooms.get(room)!].ranking >= Client.serverGroups[Client.groupSymbols[targetRank]].ranking;
	}

	isDeveloper(): boolean {
		return Config.developers && Config.developers.includes(this.id) ? true : false;
	}

	say(message: string, dontPrepare?: boolean) {
		if (!dontPrepare) message = Tools.prepareMessage(message);
		if (Client.willBeFiltered(message)) return;
		Client.send("|/pm " + this.name + ", " + message);
	}

	sayCommand(command: string) {
		this.say(command, true);
	}

	on(message: string, listener: () => void) {
		if (!this.messageListeners) this.messageListeners = {};
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
	}

	onHtml(html: string, listener: () => void) {
		if (!this.htmlMessageListeners) this.htmlMessageListeners = {};
		html = '<div class="infobox">' + html;
		if (global.Users.self.group !== Client.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + global.Users.self.name + ']</div><div style="clear:both"></div>';
		html += '</div>';
		this.htmlMessageListeners[Tools.toId(html)] = listener;
	}

	onUhtml(name: string, html: string, listener: () => void) {
		const id = Tools.toId(name);
		if (!this.uhtmlMessageListeners) this.uhtmlMessageListeners = {};
		if (!this.uhtmlMessageListeners[id]) this.uhtmlMessageListeners[id] = {};
		if (global.Users.self.group !== Client.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + global.Users.self.name + ']</div><div style="clear:both"></div>';
		this.uhtmlMessageListeners[id][Tools.toId(html)] = listener;
	}
}

export class Users {
	self: User;

	private users: Dict<User> = {};

	constructor() {
		this.self = this.add(Config.username || "");
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
		if (user !== this.self) delete this.users[user.id];
	}

	removeAll() {
		for (const i in this.users) {
			this.remove(this.users[i]);
		}
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
		user.rooms.forEach((value, room) => {
			if (room.game) room.game.renamePlayer(user, oldId);
			if (room.tournament) room.tournament.renamePlayer(user, oldId);
		});
		return user;
	}
}
