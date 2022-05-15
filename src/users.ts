import type { ScriptedGame } from "./room-game-scripted";
import type { Room } from "./rooms";
import type { GroupName, IChatLogEntry, IOutgoingMessage, MessageListener, UserDetailsListener } from "./types/client";
import type { IUserMessageOptions, IUserRoomData } from "./types/users";

const chatFormatting: string[] = ["*", "_", "`", "~", "^", "\\"];

export class User {
	autoconfirmed: boolean | null = null;
	avatar: string | null = null;
	away: boolean | null = null;
	chatLog: IChatLogEntry[] = [];
	customAvatar: boolean | null = null;
	game: ScriptedGame | null = null;
	globalRank: string = " ";
	locked: boolean | null = null;
	rooms = new Map<Room, IUserRoomData>();
	status: string | null = null;
	timers: Dict<NodeJS.Timer> | null = null;

	id: string;
	name!: string;

	htmlMessageListeners?: Dict<MessageListener>;
	messageListeners?: Dict<MessageListener>;
	uhtmlMessageListeners?: Dict<Dict<MessageListener>>;
	userDetailsListener?: UserDetailsListener;

	constructor(name: string, id: string) {
		this.id = id;

		this.setName(name);
	}

	destroy(): void {
		for (const i in this.timers) {
			clearTimeout(this.timers[i]);
			// @ts-expect-error
			this.timers[i] = undefined;
		}

		if (this.game) this.game.forceEnd(this);

		const rooms = Array.from(this.rooms.keys());
		for (const room of rooms) {
			room.onUserLeave(this);
		}
		this.rooms.clear();

		Tools.unrefProperties(this, ["id", "name"]);
	}

	setName(name: string): void {
		name = Tools.stripHtmlCharacters(name);

		while (chatFormatting.includes(name.charAt(0))) {
			name = name.substr(1).trim();
		}

		while (chatFormatting.includes(name.substr(-1))) {
			name = name.substr(0, name.length - 1).trim();
		}

		for (const formatting of chatFormatting) {
			const doubleFormatting = formatting + formatting;
			while (name.includes(doubleFormatting)) {
				name = name.replace(doubleFormatting, "").trim();
			}
		}

		this.name = name;
	}

	setGlobalRank(rank: string): void {
		this.globalRank = rank;
		this.setIsLocked(rank);
	}

	/**Returns `true` if the user's rank changed */
	setRoomRank(room: Room, rank: string): boolean {
		const roomData = this.rooms.get(room);
		if (roomData && roomData.rank === rank) return false;

		this.rooms.set(room, {lastChatMessage: roomData ? roomData.lastChatMessage : 0, rank});

		this.setIsLocked(rank);
		return true;
	}

	setIsLocked(rank: string): void {
		this.locked = rank === Client.getGroupSymbols().locked;
	}

	addChatLog(log: string): void {
		this.chatLog.unshift({log, type: 'chat'});
		this.trimChatLog();
	}

	addHtmlChatLog(log: string): void {
		this.chatLog.unshift({log, type: 'html'});
		this.trimChatLog();
	}

	addUhtmlChatLog(uhtmlName: string, log: string): void {
		this.chatLog.unshift({log, type: 'uhtml', uhtmlName});
		this.trimChatLog();
	}

	trimChatLog(): void {
		while (this.chatLog.length > 30) {
			this.chatLog.pop();
		}
	}

	isRoomauth(room: Room): boolean {
		for (const roomAuthRank in room.auth) {
			if (room.auth[roomAuthRank].includes(this.id)) {
				return true;
			}
		}

		return false;
	}

	hasRank(room: Room, targetRank: GroupName, roomAuth?: boolean): boolean {
		if (!this.rooms.has(room) || (roomAuth && !this.isRoomauth(room))) return false;
		return this.hasRankInternal(this.rooms.get(room)!.rank, targetRank);
	}

	hasGlobalRank(targetRank: GroupName): boolean {
		return this.hasRankInternal(this.globalRank, targetRank);
	}

	isBot(room: Room): boolean {
		if (!this.rooms.has(room)) return false;
		const groupSymbols = Client.getGroupSymbols();
		if (!groupSymbols.bot) return false;
		return this.rooms.get(room)!.rank === groupSymbols.bot;
	}

	isGlobalStaff(): boolean {
		const groupSymbols = Client.getGroupSymbols();
		return this.globalRank === groupSymbols.driver || this.globalRank === groupSymbols.moderator ||
			this.globalRank === groupSymbols.administrator;
	}

	isDeveloper(): boolean {
		return Config.developers && Config.developers.includes(this.id) ? true : false;
	}

	isIdleStatus(): boolean {
		if (!this.status) return false;
		const status = Tools.toId(this.status);
		return !(status === 'busy' || status === 'idle' || status === 'away');
	}

	updateStatus(status: string): void {
		if (status === this.status) return;

		const away = status.charAt(0) === '!';
		this.status = status;
		this.away = away;

		this.rooms.forEach((value, room) => {
			if (room.game && room.game.onUserUpdateStatus) room.game.onUserUpdateStatus(this, status, away);
			if (room.searchChallenge && room.searchChallenge.onUserUpdateStatus) {
				room.searchChallenge.onUserUpdateStatus(this, status, away);
			}
			if (room.tournament && room.tournament.onUserUpdateStatus) room.tournament.onUserUpdateStatus(this, status, away);
			if (room.userHostedGame && room.userHostedGame.onUserUpdateStatus) room.userHostedGame.onUserUpdateStatus(this, status, away);
		});
	}

	getMessageWithClientPrefix(message: string): string {
		return "|/pm " + this.name + ", " + message;
	}

	say(message: string, options?: IUserMessageOptions): void {
		if (this.locked) return;

		const user = global.Users.get(this.name);
		if (user === global.Users.self || user !== this) return;

		if (!(options && options.dontPrepare)) message = Tools.prepareMessage(message);
		if (!(options && options.dontCheckFilter)) {
			const filter = Client.checkFilters(message);
			if (filter) {
				Tools.logMessage("Message not sent to " + this.name + " due to " + filter + ": " + message);
				return;
			}
		}

		message = message.trim();
		if (!message) return;

		const outgoingMessage: IOutgoingMessage = {
			message: this.getMessageWithClientPrefix(message),
			text: message,
			type: options && options.type ? options.type : 'pm',
			userid: this.id,
			measure: true,
		};

		if (outgoingMessage.type === 'pm' && Client.isDataRollCommand(message)) {
			outgoingMessage.slowerCommand = true;
		}

		if (options && options.html) outgoingMessage.html = options.html;

		Client.send(outgoingMessage);
	}

	sayCode(code: string): void {
		code = code.trim();
		if (!code) return;

		this.say("!code " + code, {
			dontCheckFilter: true,
			dontPrepare: true,
			type: 'code',
			html: Client.getCodeListenerHtml(code),
		});
	}

	on(message: string, listener: MessageListener): void {
		if (!this.messageListeners) this.messageListeners = {};
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
	}

	onHtml(html: string, listener: MessageListener): void {
		if (!this.htmlMessageListeners) this.htmlMessageListeners = {};
		this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html, true))] = listener;
	}

	onUhtml(name: string, html: string, listener: MessageListener): void {
		const id = Tools.toId(name);
		if (!this.uhtmlMessageListeners) this.uhtmlMessageListeners = {};
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = {};
		this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html, true))] = listener;
	}

	off(message: string): void {
		if (!this.messageListeners) return;
		delete this.messageListeners[Tools.toId(Tools.prepareMessage(message))];
	}

	offHtml(html: string): void {
		if (!this.htmlMessageListeners) return;
		delete this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html, true))];
	}

	offUhtml(name: string, html: string): void {
		if (!this.uhtmlMessageListeners) return;
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) return;

		this.removeUhtmlMessageListener(id, Tools.toId(Client.getListenerUhtml(html, true)));
	}

	removeUhtmlMessageListener(id: string, htmlId: string): void {
		if (!this.uhtmlMessageListeners || !(id in this.uhtmlMessageListeners)) return;

		delete this.uhtmlMessageListeners[id][htmlId];
		if (!Object.keys(this.uhtmlMessageListeners[id]).length) delete this.uhtmlMessageListeners[id];
	}

	getBotRoom(): Room | undefined {
		let botRoom: Room | undefined;
		this.rooms.forEach((data, room) => {
			if (!botRoom && global.Users.self.isBot(room) && room.type === 'chat') botRoom = room;
		});

		return botRoom;
	}

	private hasRankInternal(rank: string, targetRank: GroupName): boolean {
		const groupSymbols = Client.getGroupSymbols();
		const serverGroups = Client.getServerGroups();
		if (!(rank in serverGroups) || !(targetRank in groupSymbols) || !(groupSymbols[targetRank] in serverGroups)) return false;
		return serverGroups[rank].ranking >= serverGroups[groupSymbols[targetRank]].ranking;
	}
}

export class Users {
	self: User;

	private users: Dict<User> = {};
	private pruneUsersInterval: NodeJS.Timer;

	constructor() {
		const username = Config.username || "Self";
		this.self = this.add(username, Tools.toId(username));
		this.pruneUsersInterval = setInterval(() => this.pruneUsers(), 15 * 60 * 1000);
	}

	getNameFormattingList(): string[] {
		return chatFormatting;
	}

	/** Should only be used when interacting with a potentially new user (in Client) */
	add(name: string, id: string): User {
		if (!(id in this.users)) this.users[id] = new User(name, id);
		return this.users[id];
	}

	get(name: string): User | undefined {
		return this.users[Tools.toId(name)];
	}

	remove(user: User): void {
		if (!(user.id in this.users)) throw new Error("User " + user.id + " not in users list");

		if (user === this.self) return;

		CommandParser.onDestroyUser(user.id);

		delete this.users[user.id];
		user.destroy();
	}

	removeAll(): void {
		for (const i in this.users) {
			this.remove(this.users[i]);
		}
	}

	getUserIds(): string[] {
		return Object.keys(this.users);
	}

	rename(name: string, oldId: string): User {
		const id = Tools.toId(name);
		if (!(oldId in this.users)) return this.add(name, id);

		const user = this.users[oldId];
		delete this.users[oldId];
		if (id in this.users) {
			if (user !== this.users[id]) user.destroy();
			return this.users[id];
		}

		user.setName(name);
		user.id = id;
		if (user.autoconfirmed === false) user.autoconfirmed = null;

		this.users[id] = user;
		user.rooms.forEach((value, room) => {
			if (room.game) room.game.renamePlayer(user.name, user.id, oldId);
			if (room.searchChallenge) room.searchChallenge.renamePlayer(user.name, user.id, oldId);
			if (room.userHostedGame) room.userHostedGame.renamePlayer(user.name, user.id, oldId);

			// tournament should rename last to avoid double renames in onTournamentPlayerRename()
			if (room.tournament) room.tournament.renamePlayer(user.name, user.id, oldId);
		});

		CommandParser.onRenameUser(user, oldId);

		return user;
	}

	pruneUsers(): void {
		let userKeys: string[] | undefined = Object.keys(this.users);
		for (const key of userKeys) {
			if (!this.users[key].rooms.size) {
				this.remove(this.users[key]);
			}
		}

		userKeys = undefined;
	}
}

export const instantiate = (): void => {
	global.Users = new Users();
};