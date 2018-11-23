import { IGameFile, IGameFormat } from "./games";
import { Room } from "./rooms";
import { User } from "./users";

export class Player {
	id: string;
	name: string;

	constructor(user: User) {
		this.id = user.id;
		this.name = user.name;
	}
}

export class Game {
	players = {} as Dict<Player>;
	commands = {} as NonNullable<IGameFile["commands"]>;

	class!: IGameFile["class"];
	description!: IGameFile["description"];
	id!: IGameFormat["id"];
	name!: IGameFile["name"];

	room: Room;

	constructor(room: Room) {
		this.room = room;
	}
}
