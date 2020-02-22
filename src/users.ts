import { GroupName } from "./client";
import { Game } from "./room-game";
import { Room } from "./rooms";

interface IUserRoomData {
	lastChatMessage: number;
	rank: string;
}

const chatFormatting: string[] = ["*", "_", "`", "~", "^", "\\"];

export class User {
	away: boolean | null = null;
	game: Game | null = null;
	group: string | null = null;
	rooms = new Map<Room, IUserRoomData>();
	status: string | null = null;

	id: string;
	name: string;

	htmlMessageListeners?: Dict<() => void>;
	messageListeners?: Dict<() => void>;
	uhtmlMessageListeners?: Dict<Dict<() => void>>;

	constructor(name: string, id: string) {
		name = Tools.stripHtmlCharacters(name);

		while (chatFormatting.includes(name.charAt(0))) {
			name = name.substr(1);
		}
		while (chatFormatting.includes(name.substr(-1))) {
			name = name.substr(0, name.length - 1);
		}

		this.name = name;
		this.id = id;
	}

	hasRank(room: Room, targetRank: GroupName): boolean {
		if (!this.rooms.has(room) || !(targetRank in Client.groupSymbols)) return false;
		return Client.serverGroups[this.rooms.get(room)!.rank].ranking >= Client.serverGroups[Client.groupSymbols[targetRank]].ranking;
	}

	isDeveloper(): boolean {
		return Config.developers && Config.developers.includes(this.id) ? true : false;
	}

	isIdleStatus(): boolean {
		if (!this.status) return false;
		const status = Tools.toId(this.status);
		return !(status === 'busy' || status === 'idle' || status === 'away');
	}

	say(message: string, dontPrepare?: boolean, dontCheckFilter?: boolean) {
		if (!dontPrepare) message = Tools.prepareMessage(message);
		if (!dontCheckFilter && Client.willBeFiltered(message)) return;
		Client.send("|/pm " + this.name + ", " + message);
	}

	sayCommand(command: string, dontCheckFilter?: boolean) {
		this.say(command, true, dontCheckFilter);
	}

	on(message: string, listener: () => void) {
		if (!this.messageListeners) this.messageListeners = {};
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
	}

	onHtml(html: string, listener: () => void) {
		if (!this.htmlMessageListeners) this.htmlMessageListeners = {};
		this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))] = listener;
	}

	onUhtml(name: string, html: string, listener: () => void) {
		const id = Tools.toId(name);
		if (!this.uhtmlMessageListeners) this.uhtmlMessageListeners = {};
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = {};
		this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html))] = listener;
	}

	off(message: string) {
		if (!this.messageListeners) return;
		delete this.messageListeners[Tools.toId(Tools.prepareMessage(message))];
	}

	offHtml(html: string) {
		if (!this.htmlMessageListeners) return;
		delete this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))];
	}

	offUhtml(name: string, html: string) {
		if (!this.uhtmlMessageListeners) return;
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) return;
		delete this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html))];
	}
}

export class Users {
	self: User;

	private users: Dict<User> = {};

	constructor() {
		const username = Config.username || "Self";
		this.self = this.add(username, Tools.toId(username));
	}

	/** Should only be used when interacting with a potentially new user (in Client) */
	add(name: string, id: string): User {
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
		const id = Tools.toId(name);
		if (!(oldId in this.users)) return this.add(name, id);
		const user = this.users[oldId];
		this.remove(user);
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
