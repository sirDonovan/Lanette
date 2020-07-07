import type { UserHosted } from "./games/internal/user-hosted";
import type { Player } from "./room-activity";
import type { Game } from "./room-game";
import type { Tournament } from "./room-tournament";
import type { GroupName, IChatLogEntry, IRoomInfoResponse } from "./types/client";
import type { RoomType } from "./types/rooms";
import type { IUserHostedTournament } from "./types/tournaments";
import type { User } from "./users";

export class Room {
	approvedUserHostedTournaments: Dict<IUserHostedTournament> | null = null;
	bannedWords: string[] | null = null;
	bannedWordsRegex: RegExp | null = null;
	chatLog: IChatLogEntry[] = [];
	game: Game | undefined = undefined;
	readonly htmlMessageListeners: Dict<() => void> = {};
	readonly messageListeners: Dict<() => void> = {};
	modchat: string = 'off';
	newUserHostedTournaments: Dict<IUserHostedTournament> | null = null;
	serverHangman: boolean | undefined = undefined;
	timers: Dict<NodeJS.Timer> | null = null;
	tournament: Tournament | undefined = undefined;
	readonly uhtmlMessageListeners: Dict<Dict<() => void>> = {};
	userHostedGame: UserHosted | undefined = undefined;
	readonly users = new Set<User>();

	readonly id: string;
	readonly sendId: string;
	title: string;
	type!: RoomType;

	// set immediately in checkConfigSettings()
	logChatMessages!: boolean;
	unlinkTournamentReplays!: boolean;
	unlinkChallongeLinks!: boolean;

	constructor(id: string) {
		this.id = id;
		this.sendId = id === 'lobby' ? '' : id;
		this.title = id;

		this.checkConfigSettings();
	}

	init(type: RoomType): void {
		this.type = type;
	}

	deInit(): void {
		if (this.game && this.game.room === this) this.game.deallocate(true);
		if (this.tournament && this.tournament.room === this) this.tournament.deallocate();
		if (this.userHostedGame && this.userHostedGame.room === this) this.userHostedGame.deallocate(true);

		for (const i in this.timers) {
			clearTimeout(this.timers[i]);
		}

		this.users.forEach(user => {
			user.rooms.delete(this);
			if (!user.rooms.size) Users.remove(user);
		});
	}

	checkConfigSettings(): void {
		this.logChatMessages = !this.id.startsWith('battle-') && !this.id.startsWith('groupchat-') && !(Config.disallowChatLogging &&
			Config.disallowChatLogging.includes(this.id));
		this.unlinkTournamentReplays = Config.disallowTournamentBattleLinks && Config.disallowTournamentBattleLinks.includes(this.id) ?
			true : false;
		this.unlinkChallongeLinks = Config.allowUserHostedTournaments && Config.allowUserHostedTournaments.includes(this.id) ? true : false;
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

	onRoomInfoResponse(response: IRoomInfoResponse): void {
		this.modchat = response.modchat === false ? 'off' : response.modchat;
		this.title = response.title;
	}

	onUserJoin(user: User, rank: string, lastChatMessage?: number): void {
		this.users.add(user);
		user.rooms.set(this, {lastChatMessage, rank});
	}

	onUserLeave(user: User): void {
		this.users.delete(user);
		user.rooms.delete(this);
		if (!user.rooms.size) Users.remove(user);
	}

	say(message: string, dontPrepare?: boolean, dontCheckFilter?: boolean): void {
		if (!dontPrepare) message = Tools.prepareMessage(message);
		if (!dontCheckFilter && Client.willBeFiltered(message, this)) return;
		Client.send(this.sendId + "|" + message);
	}

	sayCommand(command: string, dontCheckFilter?: boolean): void {
		this.say(command, true, dontCheckFilter);
	}

	sayHtml(html: string): void {
		this.say("/addhtmlbox " + html, true, true);
	}

	sayUhtml(uhtmlName: string, html: string): void {
		this.say("/adduhtml " + uhtmlName + ", " + html, true, true);
	}

	sayUhtmlChange(uhtmlName: string, html: string): void {
		this.say("/changeuhtml " + uhtmlName + ", " + html, true, true);
	}

	sayAuthUhtml(uhtmlName: string, html: string): void {
		this.say("/addrankuhtml +, " + uhtmlName + ", " + html, true, true);
	}

	sayAuthUhtmlChange(uhtmlName: string, html: string): void {
		this.say("/changerankuhtml +, " + uhtmlName + ", " + html, true, true);
	}

	sayModUhtml(uhtmlName: string, html: string, rank: GroupName): void {
		this.say("/addrankuhtml " + Client.groupSymbols[rank] + ", " + uhtmlName + ", " + html, true, true);
	}

	sayModUhtmlChange(uhtmlName: string, html: string, rank: GroupName): void {
		this.say("/changerankuhtml " + Client.groupSymbols[rank] + ", " + uhtmlName + ", " + html, true, true);
	}

	pmHtml(user: User | Player, html: string): void {
		this.say("/pminfobox " + user.id + "," + html, true);
	}

	pmUhtml(user: User | Player, uhtmlName: string, html: string): void {
		this.say("/pmuhtml " + user.id + "," + uhtmlName + "," + html, true);
	}

	pmUhtmlChange(user: User | Player, uhtmlName: string, html: string): void {
		this.say("/pmuhtmlchange " + user.id + "," + uhtmlName + "," + html, true);
	}

	on(message: string, listener: () => void): void {
		this.messageListeners[Tools.toId(Tools.prepareMessage(message))] = listener;
	}

	onHtml(html: string, listener: () => void): void {
		this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))] = listener;
	}

	onUhtml(name: string, html: string, listener: () => void): void {
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = {};
		this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html))] = listener;
	}

	off(message: string): void {
		delete this.messageListeners[Tools.toId(Tools.prepareMessage(message))];
	}

	offHtml(html: string): void {
		delete this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))];
	}

	offUhtml(name: string, html: string): void {
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) return;
		delete this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html))];
	}
}

export class Rooms {
	private rooms: Dict<Room> = {};

	add(id: string): Room {
		if (!(id in this.rooms)) this.rooms[id] = new Room(id);
		return this.rooms[id];
	}

	remove(room: Room): void {
		room.deInit();

		const id = room.id;
		for (const i in room) {
			// @ts-expect-error
			delete room[i];
		}

		delete this.rooms[id];
	}

	removeAll(): void {
		for (const i in this.rooms) {
			this.remove(this.rooms[i]);
		}
	}

	get(id: string): Room | undefined {
		return this.rooms[id];
	}

	search(input: string): Room | undefined {
		let id = Tools.toRoomId(input);
		if (Config.roomAliases && !(id in this.rooms) && Config.roomAliases[id]) id = Config.roomAliases[id];
		return this.get(id);
	}

	checkLoggingConfigs(): void {
		for (const i in this.rooms) {
			this.rooms[i].checkConfigSettings();
		}
	}
}

export const instantiate = (): void => {
	const oldRooms: Rooms | undefined = global.Rooms;

	global.Rooms = new Rooms();

	if (oldRooms) {
		Tools.updateNodeModule(__filename, module);
	}
};