import type { Room } from "../rooms";
import type { User } from "../users";

export abstract class HtmlPageBase {
	abstract pageId: string;

	room: Room;
	userId: string;

	constructor(room: Room, user: User) {
		this.room = room;
		this.userId = user.id;
	}

	abstract close(): void;
	abstract render(): string;
	abstract send(): void;

	open(): void {
		this.send();
	}
}
