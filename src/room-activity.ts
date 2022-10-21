import type { ActivityPageBase } from "./html-pages/activity-pages/activity-page-base";
import type { PRNGSeed } from "./lib/prng";
import { PRNG } from "./lib/prng";
import type { Room } from "./rooms";
import type { IActivityHtmlListener } from "./types/activity";
import type { IOutgoingMessageAttributes, MessageListener } from "./types/client";
import type { IBattleGameData, PlayerList } from "./types/games";
import type { User } from "./users";

export class Player {
	/** The player either left or was eliminated during gameplay; can no longer perform any actions */
	eliminated: boolean | undefined;
	/** The player can temporarily not perform any actions */
	frozen: boolean | undefined;
	inactiveRounds: number | undefined;
	/** The player has met the activity's win condition */
	metWinCondition: boolean | undefined;
	round: number | undefined;
	sentAssistActions: boolean | undefined;
	sentHtmlPage: string | undefined;
	sentPrivateHtml: boolean | undefined;
	team: PlayerTeam | undefined;

	readonly name: string;
	readonly id: string;
	readonly activity: Activity;

	constructor(user: User | string, activity: Activity) {
		if (typeof user === 'string') {
			this.name = user;
			this.id = Tools.toId(user);
		} else {
			this.name = user.name;
			this.id = user.id;
		}

		this.activity = activity;
	}

	reset(): void {
		delete this.eliminated;
		delete this.frozen;
		delete this.inactiveRounds;
		delete this.metWinCondition;
		delete this.round;
		delete this.team;
	}

	destroy(): void {
		Tools.unrefProperties(this, ["id", "name", "eliminated"]);
	}

	say(message: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		const user = Users.get(this.name);
		if (user) user.say(message, additionalAttributes);
	}

	sayHtml(html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		this.activity.getPmRoom().pmHtml(this, html, additionalAttributes);
	}

	sayUhtml(html: string, name?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		this.activity.getPmRoom().pmUhtml(this, name || this.activity.uhtmlBaseName, html, additionalAttributes);
	}

	sayUhtmlChange(html: string, name?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		this.activity.getPmRoom().pmUhtmlChange(this, name || this.activity.uhtmlBaseName, html, additionalAttributes);
	}

	sayPrivateHtml(html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!this.sentPrivateHtml && this.activity.started) this.sentPrivateHtml = true;
		this.activity.getPmRoom().sayPrivateHtml(this, html, additionalAttributes);
	}

	sayPrivateUhtml(html: string, name?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!this.sentPrivateHtml && this.activity.started) this.sentPrivateHtml = true;
		this.activity.getPmRoom().sayPrivateUhtml(this, name || (this.activity.uhtmlBaseName + "-private"), html, additionalAttributes);
	}

	sayPrivateUhtmlChange(html: string, name?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!this.sentPrivateHtml && this.activity.started) this.sentPrivateHtml = true;
		this.activity.getPmRoom().sayPrivateUhtmlChange(this, name || (this.activity.uhtmlBaseName + "-private"), html,
			additionalAttributes);
	}

	clearPrivateUhtml(name: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!this.sentPrivateHtml) return;

		this.activity.getPmRoom().sayPrivateUhtml(this, name, "<div></div>", additionalAttributes);
	}

	sendHtmlPage(html: string, pageId?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!pageId) pageId = this.activity.baseHtmlPageId;
		if (!this.sentHtmlPage) this.sentHtmlPage = pageId;

		this.activity.getPmRoom().sendHtmlPage(this, pageId, this.activity.getHtmlPageWithHeader(html),
			additionalAttributes);
	}

	closeHtmlPage(additionalAttributes?: IOutgoingMessageAttributes): void {
		if (!this.sentHtmlPage) return;

		this.activity.getPmRoom().closeHtmlPage(this, this.sentHtmlPage, additionalAttributes);
	}

	sendHighlight(notificationTitle: string, highlightPhrase?: string, pageId?: string,
		additionalAttributes?: IOutgoingMessageAttributes): void {
		if (this.sentHtmlPage) {
			this.activity.getPmRoom().sendHighlightPage(this, this.sentHtmlPage, notificationTitle, highlightPhrase, additionalAttributes);
		} else {
			this.sendRoomHighlight(notificationTitle, highlightPhrase, additionalAttributes);
		}
	}

	sendRoomHighlight(notificationTitle: string, highlightPhrase?: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		this.activity.getPmRoom().notifyUser(this, notificationTitle, highlightPhrase, additionalAttributes);
	}

	useCommand(command: string, target?: string): void {
		this.activity.parseCommand(this.name, command, target);
	}
}

export class PlayerTeam {
	readonly players: readonly Player[] = [];
	points: number = 0;

	readonly name: string;
	readonly id: string;
	readonly activity: Activity;

	constructor(name: string, activity: Activity) {
		this.name = name;
		this.id = Tools.toId(name);
		this.activity = activity;
	}

	destroy(): void {
		for (const player of this.players) {
			player.team = undefined;
		}

		Tools.unrefProperties(this);
	}

	addPlayer(player: Player): boolean {
		if (this.players.includes(player)) return false;

		// @ts-expect-error
		this.players.push(player); // eslint-disable-line @typescript-eslint/no-unsafe-call
		player.team = this;
		return true;
	}

	removePlayer(player: Player): boolean {
		const index = this.players.indexOf(player);
		if (index === -1) return false;

		// @ts-expect-error
		this.players.splice(index, 1); // eslint-disable-line @typescript-eslint/no-unsafe-call
		delete player.team;
		return true;
	}

	shufflePlayers(): void {
		// @ts-expect-error
		this.players = this.activity.shuffle(this.players);
	}

	getPlayerNames(excludedPlayers?: Player[]): string[] {
		const names: string[] = [];
		for (const player of this.players) {
			if (!excludedPlayers || !excludedPlayers.includes(player)) names.push("<username>" + player.name + "</username>");
		}
		return names;
	}

	getPlayerNamesText(excludedPlayers?: Player[]): string[] {
		const names: string[] = [];
		for (const player of this.players) {
			if (!excludedPlayers || !excludedPlayers.includes(player)) names.push(player.name);
		}
		return names;
	}

	getTeammateNames(player: Player): string[] {
		return this.getPlayerNamesText([player]);
	}
}

export abstract class Activity {
	readonly activityType: string = '';
	readonly battleData: Map<Room, IBattleGameData> | null = null;
	baseHtmlPageId: string = '';
	readonly createTime: number = Date.now();
	ended: boolean = false;
	htmlMessageListeners: IActivityHtmlListener[] = [];
	htmlPageHeader: string = '';
	htmlPages = new Map<Player, ActivityPageBase>();
	messageListeners: string[] = [];
	pastPlayers: Dict<Player> = {};
	playerCount: number = 0;
	players: Dict<Player> = {};
	playerAvatars: Dict<string> = {};
	roomCreateListeners: string[] = [];
	showSignupsHtml: boolean = false;
	signupsHtmlTimeout: NodeJS.Timer | null = null;
	started: boolean = false;
	startTime: number | null = null;
	startTimer: NodeJS.Timer | null = null;
	subRoom: Room | null = null;
	timeout: NodeJS.Timer | null = null;
	uhtmlMessageListeners: Dict<IActivityHtmlListener[]> = {};

	// set in initialize()
	id!: string;
	name!: string;
	uhtmlBaseName!: string;

	readonly room: Room | User;
	readonly pm: boolean;
	readonly pmRoom: Room;
	prng: PRNG;
	readonly initialSeed: PRNGSeed;

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		this.room = room;
		this.pm = pmRoom && room !== pmRoom ? true : false;
		this.pmRoom = this.isPmActivity(room) ? pmRoom! : room;
		this.prng = new PRNG(initialSeed);
		this.initialSeed = this.prng.initialSeed.slice() as PRNGSeed;
	}

	abstract deallocate(forceEnd: boolean): void;
	abstract forceEnd(user?: User, reason?: string): void;
	abstract start(): void;

	getPmRoom(): Room {
		return this.subRoom || this.pmRoom;
	}

	setTimeout(callback: () => void, time: number): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.timeout = setTimeout(() => {
			if (this.ended) return;

			callback();
		}, time);
	}

	destroyPlayers(): void {
		for (const i in this.players) {
			this.players[i].destroy();
			// @ts-expect-error
			this.players[i] = undefined;
		}

		for (const i in this.pastPlayers) {
			this.pastPlayers[i].destroy();
			// @ts-expect-error
			this.pastPlayers[i] = undefined;
		}
	}

	cleanupMisc(): void {
		for (const roomid of this.roomCreateListeners) {
			delete Rooms.createListeners[roomid];
		}
	}

	cleanupTimers(): void {
		if (this.signupsHtmlTimeout) {
			clearTimeout(this.signupsHtmlTimeout);
			// @ts-expect-error
			this.signupsHtmlTimeout = undefined;
		}

		if (this.startTimer) {
			clearTimeout(this.startTimer);
			// @ts-expect-error
			this.startTimer = undefined;
		}

		if (this.timeout) {
			clearTimeout(this.timeout);
			// @ts-expect-error
			this.timeout = undefined;
		}
	}

	random(m: number): number {
		return Tools.random(m, this.prng);
	}

	sampleMany<T>(array: readonly T[], amount: number | string): T[] {
		return Tools.sampleMany(array, amount, this.prng);
	}

	sampleOne<T>(array: readonly T[]): T {
		return Tools.sampleOne(array, this.prng);
	}

	shuffle<T>(array: readonly T[]): T[] {
		return Tools.shuffle(array, this.prng);
	}

	isPm(room: Room | User, user: User): room is User {
		return room === user;
	}

	isPmActivity(room: Room | User): room is User {
		return this.pm;
	}

	parseCommand(name: string, command: string, target?: string): void {
		let expiredUser = false;
		let user = Users.get(name);
		if (!user) {
			expiredUser = true;
			user = Users.add(name, Tools.toId(name));
		}

		CommandParser.parse(this.room, user, Config.commandCharacter + command + (target !== undefined ? " " + target : ""),
			Date.now());

		if (expiredUser) Users.remove(user);
	}

	/**Returns `null` if a player with the same id already exists */
	createPlayer(user: User | string): Player | null {
		const id = Tools.toId(user);
		if (id in this.players) return null;

		const isPastPlayer = id in this.pastPlayers;
		const player = isPastPlayer ? this.pastPlayers[id] : new Player(user, this);
		if (isPastPlayer) delete this.pastPlayers[id];

		this.players[id] = player;
		this.playerCount++;

		if (this.onCreatePlayer) this.onCreatePlayer(player, isPastPlayer);

		return player;
	}

	renamePlayer(name: string, id: string, oldId: string): void {
		let pastPlayer = false;
		if (oldId in this.players) {
			if (id in this.players && oldId !== id) return;
		} else {
			if (!(oldId in this.pastPlayers) || (id in this.pastPlayers && oldId !== id)) return;
			pastPlayer = true;
		}

		const player = this.players[oldId] || this.pastPlayers[oldId]; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		// @ts-expect-error
		player.name = name;

		const htmlPage = this.htmlPages.get(player);
		if (htmlPage) htmlPage.onRenameUser(player, oldId);

		if (player.id === id) return;
		// @ts-expect-error
		player.id = id;

		delete this.players[oldId];
		delete this.pastPlayers[oldId];
		if (pastPlayer) {
			this.pastPlayers[player.id] = player;
			return;
		}

		this.players[player.id] = player;
		if (this.onRenamePlayer) this.onRenamePlayer(player, oldId);
	}

	destroyPlayer(user: User | string, forceDelete?: boolean): Player | undefined {
		const id = Tools.toId(user);
		if (!(id in this.players)) return;

		const player = this.players[id];
		if (this.started && !forceDelete) {
			player.eliminated = true;
		} else {
			this.pastPlayers[id] = player;
			delete this.players[id];
			this.playerCount--;
		}

		return player;
	}

	generateBattleData(): IBattleGameData {
		return {
			remainingPokemon: {},
			slots: new Map<Player, string>(),
			pokemonCounts: {},
			pokemon: {},
			pokemonLeft: {},
			nicknames: {},
			wrongTeam: new Map<Player, boolean>(),
			faintedCloakedPokemon: {},
		};
	}

	end(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			// @ts-expect-error
			this.timeout = undefined;
		}

		if (this.onEnd) this.onEnd();
		this.ended = true;
		this.deallocate(false);
	}

	leaveBattleRoom(battleRoom: Room): void {
		// @ts-expect-error
		battleRoom.tournament = undefined;
		// @ts-expect-error
		battleRoom.game = undefined;

		const currentRoom = Rooms.get(battleRoom.id);
		if (currentRoom) currentRoom.leave();
	}

	cleanupBattleRooms(): void {
		if (!this.battleData) return;

		this.battleData.forEach((data, battleRoom) => {
			this.leaveBattleRoom(battleRoom);

			data.slots.clear();
			data.wrongTeam.clear();
		});

		this.battleData.clear();
	}

	getHtmlPageWithHeader(html: string): string {
		return "<div class='chat' style='margin-top: 5px;margin-left: 10px'>" + this.htmlPageHeader + html + "</div>";
	}

	say(message: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		this.room.say(message, additionalAttributes);
	}

	sayHtml(html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (this.isPmActivity(this.room)) return this.pmRoom.pmHtml(this.room, html, additionalAttributes);
		this.room.sayHtml(html, additionalAttributes);
	}

	sayUhtml(name: string, html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (this.isPmActivity(this.room)) return this.pmRoom.pmUhtml(this.room, name, html, additionalAttributes);
		this.room.sayUhtml(name, html, additionalAttributes);
	}

	sayUhtmlChange(name: string, html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (this.isPmActivity(this.room)) return this.pmRoom.pmUhtmlChange(this.room, name, html, additionalAttributes);
		this.room.sayUhtmlChange(name, html, additionalAttributes);
	}

	sayUhtmlAuto(name: string, html: string, additionalAttributes?: IOutgoingMessageAttributes): void {
		if (this.room.chatLog.length && this.room.chatLog[0].uhtmlName && Tools.toId(this.room.chatLog[0].uhtmlName) === Tools.toId(name)) {
			this.sayUhtmlChange(name, html, additionalAttributes);
		} else {
			this.sayUhtml(name, html, additionalAttributes);
		}
	}

	on(message: string, listener: MessageListener): void {
		if (this.ended) return;

		this.messageListeners.push(message);
		this.room.on(message, (timestamp: number) => {
			if (this.ended) return;
			listener(timestamp);
		});
	}

	onHtml(html: string, listener: MessageListener, serverHtml?: boolean): void {
		if (this.ended) return;

		this.htmlMessageListeners.push({html, serverHtml});
		this.room.onHtml(html, (timestamp: number) => {
			if (this.ended) return;
			listener(timestamp);
		}, serverHtml);
	}

	onUhtml(name: string, html: string, listener: MessageListener): void {
		if (this.ended) return;

		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = [];
		this.uhtmlMessageListeners[id].push({name, html});

		this.room.onUhtml(name, html, (timestamp: number) => {
			if (this.ended) return;
			listener(timestamp);
		});
	}

	off(message: string): void {
		this.room.off(message);

		const index = this.messageListeners.indexOf(message);
		if (index !== -1) this.messageListeners.splice(index, 1);
	}

	offHtml(html: string, serverHtml?: boolean): void {
		this.room.offHtml(html, serverHtml);

		let index = -1;
		for (let i = 0; i < this.htmlMessageListeners.length; i++) {
			const listener = this.htmlMessageListeners[i];
			if (listener.html === html && (serverHtml === undefined || listener.serverHtml === serverHtml)) {
				index = i;
				break;
			}
		}

		if (index !== -1) this.htmlMessageListeners.splice(index, 1);
	}

	offUhtml(name: string, html: string): void {
		this.room.offUhtml(name, html);

		const id = Tools.toId(name);
		if (id in this.uhtmlMessageListeners) {
			let index = -1;
			for (let i = 0; i < this.uhtmlMessageListeners[id].length; i++) {
				const listener = this.uhtmlMessageListeners[id][i];
				if (listener.name === name && listener.html === html) {
					index = i;
					break;
				}
			}

			if (index !== -1) this.uhtmlMessageListeners[id].splice(index, 1);
		}
	}

	cleanupMessageListeners(): void {
		const messageListeners = this.messageListeners.slice();
		for (const listener of messageListeners) {
			this.off(listener);
		}

		const htmlMessageListeners = this.htmlMessageListeners.slice();
		for (const listener of htmlMessageListeners) {
			this.offHtml(listener.html, listener.serverHtml);
		}

		for (const id in this.uhtmlMessageListeners) {
			const uhtmlMessageListeners = this.uhtmlMessageListeners[id].slice();
			for (const listener of uhtmlMessageListeners) {
				this.offUhtml(listener.name!, listener.html);
			}
		}
	}

	getPlayerList(players?: PlayerList, fromGetRemainingPlayers?: boolean): Player[] {
		if (Array.isArray(players)) return players as Player[];

		if (!players) {
			if (this.started && !fromGetRemainingPlayers) {
				players = this.getRemainingPlayers();
			} else {
				players = this.players;
			}
		}

		const playerList: Player[] = [];
		if (players instanceof Map) {
			players.forEach((value, player) => {
				playerList.push(player);
			});
		} else {
			players = players as Dict<Player>;
			for (const i in players) {
				playerList.push(players[i]);
			}
		}

		return playerList;
	}

	getRemainingPlayers(players?: PlayerList): Dict<Player> {
		const playerList = this.getPlayerList(players, true);
		const remainingPlayers: Dict<Player> = {};
		for (const player of playerList) {
			if (player.eliminated || player.frozen) continue;
			remainingPlayers[player.id] = player;
		}

		return remainingPlayers;
	}

	getRemainingPlayerCount(players?: PlayerList): number {
		return Object.keys(this.getRemainingPlayers(players)).length;
	}

	getFinalPlayer(): Player | undefined {
		const keys = Object.keys(this.getRemainingPlayers());
		if (keys.length !== 1) return undefined;
		return this.players[keys[0]];
	}

	getPlayerAttributes(attribute: (player: Player) => string, players?: PlayerList): string[] {
		const playerList = this.getPlayerList(players);
		const playerAttributes: string[] = [];
		for (const player of playerList) {
			playerAttributes.push(attribute(player));
		}

		return playerAttributes;
	}

	getPlayerUsernameHtml(name: string): string {
		const id = Tools.toId(name);
		return (id in this.playerAvatars ? this.playerAvatars[id] : "") + "<username>" + name + "</username>";
	}

	getPlayerNames(players?: PlayerList): string {
		return this.getPlayerAttributes(player => player.name, players).map(x => this.getPlayerUsernameHtml(x)).join(', ');
	}

	getPlayerNamesText(players?: PlayerList): string[] {
		return this.getPlayerAttributes(player => player.name, players);
	}

	getHtmlPage?(player: Player): ActivityPageBase;
	onCreatePlayer?(player: Player, isPastPlayer: boolean): void;
	onEnd?(): void;
	onForceEnd?(user?: User, reason?: string): void;
	onRenamePlayer?(player: Player, oldId: string): void;
	onUserJoinRoom?(room: Room, user: User): void;
	onUserLeaveRoom?(room: Room, user: User): void;
	onUserUpdateStatus?(user: User, status: string, away: boolean): void;
}
