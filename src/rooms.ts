import { GroupName } from "./client";
import { UserHosted } from "./games/templates/user-hosted";
import { Player } from "./room-activity";
import { Game } from "./room-game";
import { Tournament } from "./room-tournament";
import { IUserHostedTournament } from "./tournaments";
import { IRoomInfoResponse } from "./types/client-message-types";
import { User } from "./users";

export type RoomType = 'battle' | 'chat' | 'html';

export class Room {
	approvedUserHostedTournaments: Dict<IUserHostedTournament> | null = null;
	bannedWords: string[] | null = null;
	bannedWordsRegex: RegExp | null = null;
	game: Game | null = null;
	readonly htmlMessageListeners: Dict<() => void> = {};
	readonly messageListeners: Dict<() => void> = {};
	modchat: string = 'off';
	newUserHostedTournaments: Dict<IUserHostedTournament> | null = null;
	timer: NodeJS.Timer | null = null;
	tournament: Tournament | null = null;
	readonly uhtmlMessageListeners: Dict<Dict<() => void>> = {};
	userHostedGame: UserHosted | null = null;
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

	init(type: RoomType) {
		this.type = type;
	}

	deInit() {
		if (this.game && this.game.room === this) this.game.deallocate();
		if (this.tournament && this.tournament.room === this) this.tournament.deallocate();
		if (this.userHostedGame && this.userHostedGame.room === this) this.userHostedGame.deallocate();

		this.users.forEach(user => {
			user.rooms.delete(this);
			if (!user.rooms.size) Users.remove(user);
		});
	}

	checkConfigSettings() {
		this.logChatMessages = !this.id.startsWith('battle-') && !this.id.startsWith('groupchat-') && !(Config.disallowChatLogging && Config.disallowChatLogging.includes(this.id));
		this.unlinkTournamentReplays = Config.disallowTournamentBattleLinks && Config.disallowTournamentBattleLinks.includes(this.id) ? true : false;
		this.unlinkChallongeLinks = Config.allowUserHostedTournaments && Config.allowUserHostedTournaments.includes(this.id) ? true : false;
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

	sayAuthUhtml(uhtmlName: string, html: string) {
		this.say("/addrankuhtml +, " + uhtmlName + ", " + html, true);
	}

	sayAuthUhtmlChange(uhtmlName: string, html: string) {
		this.say("/changerankuhtml +, " + uhtmlName + ", " + html, true);
	}

	sayModUhtml(uhtmlName: string, html: string, rank: GroupName) {
		this.say("/addrankuhtml " + Client.groupSymbols[rank] + ", " + uhtmlName + ", " + html, true);
	}

	sayModUhtmlChange(uhtmlName: string, html: string, rank: GroupName) {
		this.say("/changerankuhtml " + Client.groupSymbols[rank] + ", " + uhtmlName + ", " + html, true);
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
		this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))] = listener;
	}

	onUhtml(name: string, html: string, listener: () => void) {
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = {};
		this.uhtmlMessageListeners[id][Tools.toId(Client.getListenerUhtml(html))] = listener;
	}

	off(message: string) {
		delete this.messageListeners[Tools.toId(Tools.prepareMessage(message))];
	}

	offHtml(html: string) {
		delete this.htmlMessageListeners[Tools.toId(Client.getListenerHtml(html))];
	}

	offUhtml(name: string, html: string) {
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

	remove(room: Room) {
		room.deInit();
		delete this.rooms[room.id];
	}

	removeAll() {
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

	checkLoggingConfigs() {
		for (const i in this.rooms) {
			this.rooms[i].checkConfigSettings();
		}
	}
}
