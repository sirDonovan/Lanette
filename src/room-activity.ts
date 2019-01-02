import { Room } from "./rooms";
import { User } from "./users";

const SIGNUPS_HTML_DELAY = 2 * 1000;

export class Player {
	active: boolean | null = null;
	/** The player either left or got eliminated during gameplay; can no longer perform any actions */
	eliminated: boolean | null = null;
	/** The player can temporarily not perform any actions */
	frozen: boolean | null = null;
	losses: number | null = null;

	id: string;
	activity: Activity;
	name: string;

	constructor(user: User | string, activity: Activity) {
		if (typeof user === 'string') {
			this.id = Tools.toId(user);
			this.name = user;
		} else {
			this.id = user.id;
			this.name = user.name;
		}
		this.activity = activity;
	}

	say(message: string) {
		const user = Users.get(this.name);
		if (user) user.say(message);
	}

	sayHtml(html: string) {
		this.activity.room.pmHtml(this, html);
	}

	sayUhtml(html: string, id?: string) {
		let uhtmlId = this.activity.id;
		if (id) uhtmlId += id;
		this.activity.room.pmUhtml(this, uhtmlId, html);
	}

	sayUhtmlChange(html: string, id?: string) {
		let uhtmlId = this.activity.id;
		if (id) uhtmlId += id;
		this.activity.room.pmUhtmlChange(this, uhtmlId, html);
	}
}

export abstract class Activity {
	activityType = '';
	createTime = Date.now();
	playerCount = 0;
	players: Dict<Player> = {};
	showSignupsHtml = false;
	signupsHtmlTimeout: NodeJS.Timer | null = null;
	started = false;
	startTime = 0;
	timeout: NodeJS.Timeout | null = null;

	// set in initialize()
	id!: string;
	name!: string;

	room: Room;

	constructor(room: Room) {
		this.room = room;
	}

	createPlayer(user: User | string): Player | void {
		const id = Tools.toId(user);
		if (id in this.players) return;
		const player = new Player(user, this);
		this.players[id] = player;
		this.playerCount++;
		return player;
	}

	destroyPlayer(user: User | string): Player | void {
		const id = Tools.toId(user);
		if (!(id in this.players)) return;
		const player = this.players[id];
		if (this.started) {
			this.players[id].eliminated = true;
		} else {
			delete this.players[id];
			this.playerCount--;
		}
		return player;
	}

	addPlayer(user: User | string): Player | void {
		const player = this.createPlayer(user);
		if (!player) return;
		if (this.onAddPlayer && !this.onAddPlayer(player)) return;
		player.say("Thanks for joining the " + this.name + " " + this.activityType + "!");
		if (this.getSignupsHtml && this.showSignupsHtml && !this.started && !this.signupsHtmlTimeout) {
			this.sayUhtmlChange(this.getSignupsHtml(), "signups");
			this.signupsHtmlTimeout = setTimeout(() => {
				this.signupsHtmlTimeout = null;
			}, SIGNUPS_HTML_DELAY);
		}
		return player;
	}

	removePlayer(user: User | string) {
		const player = this.destroyPlayer(user);
		if (!player) return;
		if (this.onRemovePlayer) this.onRemovePlayer(player);
		player.say("You have left the " + this.name + " " + this.activityType + ".");
		if (this.getSignupsHtml && this.showSignupsHtml && !this.started && !this.signupsHtmlTimeout) {
			this.sayUhtmlChange(this.getSignupsHtml(), "signups");
			this.signupsHtmlTimeout = setTimeout(() => {
				this.signupsHtmlTimeout = null;
			}, SIGNUPS_HTML_DELAY);
		}
	}

	start() {
		this.started = true;
		this.startTime = Date.now();
		if (this.getSignupsHtml && this.showSignupsHtml) this.sayUhtmlChange(this.getSignupsHtml(), "signups");
		if (this.onStart) this.onStart();
	}

	end() {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.deallocate();
	}

	say(message: string) {
		this.room.say(message);
	}

	sayHtml(html: string) {
		this.room.sayHtml(html);
	}

	sayUhtml(html: string, id?: string) {
		let uhtmlId = this.id;
		if (id) uhtmlId += '-' + id;
		this.room.sayUhtml(uhtmlId, html);
	}

	sayUhtmlChange(html: string, id?: string) {
		let uhtmlId = this.id;
		if (id) uhtmlId += '-' + id;
		this.room.sayUhtmlChange(uhtmlId, html);
	}

	on(message: string, listener: () => any) {
		this.room.on(message, listener);
	}

	getRemainingPlayers(): Dict<Player> {
		const remainingPlayers: Dict<Player> = {};
		for (const i in this.players) {
			if (this.players[i].eliminated || this.players[i].frozen) continue;
			remainingPlayers[i] = this.players[i];
		}
		return remainingPlayers;
	}

	getRemainingPlayerCount(remainingPlayers?: Dict<Player>): number {
		if (remainingPlayers) return Object.keys(remainingPlayers).length;
		return Object.keys(this.getRemainingPlayers()).length;
	}

	getPlayerNames(players?: Dict<Player> | Player[] | Map<Player, any>): string {
		if (!players) {
			if (this.started) {
				players = this.getRemainingPlayers();
			} else {
				players = this.players;
			}
		}
		const names: string[] = [];
		if (Array.isArray(players)) {
			for (let i = 0; i < players.length; i++) {
				names.push(players[i].name);
			}
		} else if (players instanceof Map) {
			players.forEach((value, player) => {
				names.push(player.name);
			});
		} else {
			for (const i in players) {
				names.push(players[i].name);
			}
		}
		return names.join(", ");
	}

	abstract deallocate(): void;
	abstract forceEnd(user?: User): void;

	getSignupsHtml?(): string;
	/** Return `false` to prevent a user from being added (must destroy player) */
	onAddPlayer?(player: Player): boolean;
	onEnd?(): void;
	onForceEnd?(user?: User): void;
	onRemovePlayer?(player: Player): void;
	onStart?(): void;
}
