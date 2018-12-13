import { ICommandDefinition } from "./command-parser";
import { IGameFile, IGameFormat } from "./games";
import { Room } from "./rooms";
import { User } from "./users";

const baseCommands: Dict<ICommandDefinition<Game>> = {
	summary: {
		command(target, room, user) {
			if (!this.started || !(user.id in this.players)) return;
			if (this.getPlayerSummary) {
				this.getPlayerSummary(this.players[user.id]);
			} else {
				// TODO: generic summary (points/lives/etc)
			}
		},
		globalGameCommand: true,
		pmOnly: true,
	},
};

export const commands = CommandParser.loadCommands(baseCommands);

const globalGameCommands: Dict<ICommandDefinition<Game>> = {};
for (const i in commands) {
	if (commands[i].globalGameCommand) globalGameCommands[i] = commands[i];
}

export class Player {
	/** The player either left the game or got eliminated during gameplay; can no longer perform any actions */
	eliminated = null as boolean | null;
	/** The player can temporarily not perform any actions */
	frozen = null as boolean | null;

	id: string;
	game: Game;
	name: string;

	constructor(user: User, game: Game) {
		this.id = user.id;
		this.name = user.name;
		this.game = game;
	}

	say(message: string) {
		Users.add(this.name).say(message);
	}

	sayHtml(html: string) {
		this.game.room.pmHtml(this, html);
	}

	sayUhtml(html: string, id?: string) {
		if (!id) id = this.game.id;
		this.game.room.pmUhtml(this, id, html);
	}
}

export class Game {
	commands = Object.assign({}, globalGameCommands);
	parentGame = null as Game | null;
	players = {} as Dict<Player>;
	round = 0;
	started = false;
	timeout = null as NodeJS.Timeout | null;
	winners = new Map<Player, number>();

	// inherited from format
	id!: IGameFormat["id"];
	name!: IGameFile["name"];

	room: Room;

	constructor(room: Room) {
		this.room = room;
	}

	initialize(format: IGameFormat) {
		this.name = format.name;
		this.id = format.id;

		if (format.commands) Object.assign(this.commands, format.commands);

		// TODO: add HTML box once client data is added
		// TODO: free-join games
		this.room.say("Hosting a scriptedgame of " + this.name + "! Use ``.jg`` to join.");
	}

	addPlayer(user: User) {
		if (user.id in this.players) return;
		this.players[user.id] = new Player(user, this);
		user.say("Thanks for joining the game of " + this.name + "!");
	}

	removePlayer(user: User) {
		if (!(user.id in this.players)) return;
		if (this.started) {
			this.players[user.id].eliminated = true;
		} else {
			delete this.players[user.id];
		}
		user.say("You have left the game of " + this.name + "!");
	}

	start() {
		this.started = true;
		if (this.onStart) this.onStart();
	}

	nextRound() {
		if (this.timeout) clearTimeout(this.timeout);
		this.round++;
		if (this.onNextRound) this.onNextRound();
	}

	end() {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.deallocate();
	}

	forceEnd(user: User) {
		if (this.timeout) clearTimeout(this.timeout);
		this.say("The game was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user);
		this.deallocate();
	}

	deallocate() {
		this.room.game = null;
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

	getPlayerSummary?(player: Player): void;
	onEnd?(): void;
	onForceEnd?(user: User): void;
	onNextRound?(): void;
	onStart?(): void;
}
