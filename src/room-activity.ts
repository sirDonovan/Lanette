import { Room } from "./rooms";
import { User } from "./users";

export class Player {
	/** The player either left or got eliminated during gameplay; can no longer perform any actions */
	eliminated = null as boolean | null;
	/** The player can temporarily not perform any actions */
	frozen = null as boolean | null;
	losses = null as number | null;

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
		if (!id) id = this.activity.id;
		this.activity.room.pmUhtml(this, id, html);
	}
}

export abstract class Activity {
	activityType = '';
	playerCount = 0;
	players = {} as Dict<Player>;
	started = false;
	timeout = null as NodeJS.Timeout | null;

	// set in initialize()
	id!: string;
	name!: string;

	room: Room;

	constructor(room: Room) {
		this.room = room;
	}

	addPlayer(user: User | string): Player | void {
		const player = this.createPlayer(user);
		if (!player) return;
		if (this.onAddPlayer && !this.onAddPlayer(player)) return;
		player.say("Thanks for joining the " + this.name + " " + this.activityType + "!");
		return player;
	}

	removePlayer(user: User | string) {
		const player = this.destroyPlayer(user);
		if (!player) return;
		if (this.onRemovePlayer) this.onRemovePlayer(player);
		player.say("You have left the " + this.name + " " + this.activityType + ".");
	}

	start() {
		this.started = true;
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
		this.room.say("/addhtmlbox " + html);
	}

	sayUhtml(html: string, id?: string) {
		if (!id) id = this.id;
		this.room.say("/adduhtml " + id + "," + html);
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

	/** Return `false` to prevent a user from being added (must destroy player) */
	onAddPlayer?(player: Player): boolean;
	onEnd?(): void;
	onForceEnd?(user?: User): void;
	onRemovePlayer?(player: Player): void;
	onStart?(): void;

	private createPlayer(user: User | string): Player | void {
		const id = Tools.toId(user);
		if (id in this.players) return;
		const player = new Player(user, this);
		this.players[id] = player;
		this.playerCount++;
		return player;
	}

	private destroyPlayer(user: User | string): Player | void {
		const id = Tools.toId(user);
		if (id in this.players) return;
		const player = this.players[id];
		if (this.started) {
			this.players[id].eliminated = true;
		} else {
			delete this.players[id];
			this.playerCount--;
		}
		return player;
	}
}
