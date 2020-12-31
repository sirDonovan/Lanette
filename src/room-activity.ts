import type { PRNGSeed } from "./lib/prng";
import { PRNG } from "./lib/prng";
import type { Room } from "./rooms";
import type { MessageListener } from "./types/client";
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

	say(message: string): void {
		const user = Users.get(this.name);
		if (user) user.say(message);
	}

	sayHtml(html: string): void {
		this.activity.pmRoom.pmHtml(this, html);
	}

	sayUhtml(html: string, name?: string): void {
		this.activity.pmRoom.pmUhtml(this, name || this.activity.uhtmlBaseName, html);
	}

	sayUhtmlChange(html: string, name?: string): void {
		this.activity.pmRoom.pmUhtmlChange(this, name || this.activity.uhtmlBaseName, html);
	}

	sendHtmlPage(html: string, pageId?: string): void {
		this.activity.pmRoom.sendHtmlPage(this, pageId || this.activity.baseHtmlPageId, this.activity.getHtmlPageWithHeader(html));
	}

	closeHtmlPage(pageId?: string): void {
		this.activity.pmRoom.closeHtmlPage(this, pageId || this.activity.baseHtmlPageId);
	}

	sendHighlightPage(notificationTitle: string, pageId?: string, highlightPhrase?: string): void {
		this.activity.pmRoom.sendHighlightPage(this, pageId || this.activity.baseHtmlPageId, notificationTitle, highlightPhrase);
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
			if (!excludedPlayers || !excludedPlayers.includes(player)) names.push(player.name);
		}
		return names;
	}

	getTeammateNames(player: Player): string[] {
		return this.getPlayerNames([player]);
	}
}

export abstract class Activity {
	readonly activityType: string = '';
	baseHtmlPageId: string = '';
	readonly createTime: number = Date.now();
	ended: boolean = false;
	htmlMessageListeners: string[] = [];
	htmlPageHeader: string = '';
	messageListeners: string[] = [];
	pastPlayers: Dict<Player> = {};
	playerCount: number = 0;
	players: Dict<Player> = {};
	showSignupsHtml: boolean = false;
	signupsHtmlTimeout: NodeJS.Timer | null = null;
	started: boolean = false;
	startTime: number | null = null;
	startTimer?: NodeJS.Timer;
	timeout: NodeJS.Timer | null = null;
	uhtmlMessageListeners: Dict<string[]> = {};

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
		this.pmRoom = this.isPm(room) ? pmRoom! : room;
		this.prng = new PRNG(initialSeed);
		this.initialSeed = this.prng.initialSeed.slice() as PRNGSeed;
	}

	abstract deallocate(forceEnd: boolean): void;
	abstract forceEnd(user?: User, reason?: string): void;
	abstract start(): void;

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

	isPm(room: Room | User): room is User {
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

		const player = id in this.pastPlayers ? this.pastPlayers[id] : new Player(user, this);
		this.players[id] = player;
		if (id in this.pastPlayers) delete this.pastPlayers[id];
		this.playerCount++;
		return player;
	}

	renamePlayer(user: User, oldId: string): void {
		let pastPlayer = false;
		if (oldId in this.players) {
			if (user.id in this.players && oldId !== user.id) return;
		} else {
			if (!(oldId in this.pastPlayers)) return;
			pastPlayer = true;
		}

		const player = this.players[oldId] || this.pastPlayers[oldId]; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		// @ts-expect-error
		player.name = user.name;
		if (player.id === user.id) return;
		// @ts-expect-error
		player.id = user.id;

		if (pastPlayer) {
			this.pastPlayers[player.id] = player;
			return;
		}

		delete this.players[oldId];
		this.players[player.id] = player;
		if (this.onRenamePlayer) this.onRenamePlayer(player, oldId);
	}

	destroyPlayer(user: User | string, forceDelete?: boolean): Player | undefined {
		const id = Tools.toId(user);
		if (!(id in this.players)) return;
		const player = this.players[id];
		if (this.started && !forceDelete) {
			this.players[id].eliminated = true;
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
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.ended = true;
		this.deallocate(false);
	}

	getHtmlPageWithHeader(html: string): string {
		return "<div class='chat' style='margin-top: 5px;margin-left: 10px'>" + this.htmlPageHeader + html + "</div>";
	}

	say(message: string): void {
		this.room.say(message);
	}

	sayCommand(command: string, dontCheckFilter?: boolean): void {
		this.room.sayCommand(command, dontCheckFilter);
	}

	sayHtml(html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmHtml(this.room, html);
		this.room.sayHtml(html);
	}

	sayUhtml(name: string, html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmUhtml(this.room, name, html);
		this.room.sayUhtml(name, html);
	}

	sayUhtmlChange(name: string, html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmUhtmlChange(this.room, name, html);
		this.room.sayUhtmlChange(name, html);
	}

	sayUhtmlAuto(name: string, html: string): void {
		if (this.room.chatLog.length && this.room.chatLog[0].uhtmlName && Tools.toId(this.room.chatLog[0].uhtmlName) === Tools.toId(name)) {
			this.sayUhtmlChange(name, html);
		} else {
			this.sayUhtml(name, html);
		}
	}

	on(message: string, listener: MessageListener): void {
		if (this.ended) return;
		this.messageListeners.push(message);
		this.room.on(message, listener);
	}

	onHtml(html: string, listener: MessageListener, serverHtml?: boolean): void {
		if (this.ended) return;
		this.htmlMessageListeners.push(html);
		this.room.onHtml(html, listener, serverHtml);
	}

	onUhtml(name: string, html: string, listener: MessageListener): void {
		if (this.ended) return;
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = [];
		this.uhtmlMessageListeners[id].push(html);
		this.room.onUhtml(name, html, listener);
	}

	off(message: string): void {
		this.room.off(message);
		const index = this.messageListeners.indexOf(message);
		if (index !== -1) this.messageListeners.splice(index, 1);
	}

	offHtml(html: string, serverHtml?: boolean): void {
		this.room.offHtml(html, serverHtml);
		const index = this.htmlMessageListeners.indexOf(html);
		if (index !== -1) this.htmlMessageListeners.splice(index, 1);
	}

	offUhtml(name: string, html: string): void {
		this.room.offUhtml(name, html);
		const id = Tools.toId(name);
		if (id in this.uhtmlMessageListeners) {
			const index = this.uhtmlMessageListeners[id].indexOf(html);
			if (index !== -1) this.uhtmlMessageListeners[id].splice(index, 1);
		}
	}

	cleanupMessageListeners(): void {
		for (const listener of this.htmlMessageListeners) {
			this.offHtml(listener);
		}

		for (const listener of this.messageListeners) {
			this.off(listener);
		}

		for (const name in this.uhtmlMessageListeners) {
			for (const listener of this.uhtmlMessageListeners[name]) {
				this.offUhtml(name, listener);
			}
		}
	}

	getPlayerList(players?: PlayerList, fromGetRemainingPlayers?: boolean): Player[] {
		if (Array.isArray(players)) return players;

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

	getPlayerNames(players?: PlayerList): string {
		return this.getPlayerAttributes(player => player.name, players).join(', ');
	}

	onEnd?(): void;
	onForceEnd?(user?: User, reason?: string): void;
	onRenamePlayer?(player: Player, oldId: string): void;
	onUserJoinRoom?(room: Room, user: User, onRename?: boolean): void;
	onUserLeaveRoom?(room: Room, user: User): void;
	onUserUpdateStatus?(user: User, status: string, away: boolean): void;
}
