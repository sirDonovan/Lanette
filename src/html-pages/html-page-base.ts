import type { Room } from "../rooms";
import type { User } from "../users";

export abstract class HtmlPageBase {
	abstract pageId: string;

	lastRender: string = '';

	room: Room;
	userId: string;

	constructor(room: Room, user: User) {
		this.room = room;
		this.userId = user.id;
	}

	abstract render(onOpen?: boolean): string;

	open(): void {
		this.send(true);
	}

	close(): void {
		const user = Users.get(this.userId);
		if (!user) return;

		this.room.closeHtmlPage(user, this.pageId);

		if (this.onClose) this.onClose();
	}

	send(onOpen?: boolean): void {
		if (this.beforeSend && !this.beforeSend(onOpen)) return;

		const user = Users.get(this.userId);
		if (!user) return;

		const render = this.render(onOpen);
		if (render === this.lastRender) return;

		this.lastRender = render;
		this.room.sendHtmlPage(user, this.pageId, render);

		if (this.onSend) this.onSend(onOpen);
	}

	beforeSend?(onOpen?: boolean): boolean;
	onClose?(): void;
	onOpen?(): void;
	onSend?(onOpen?: boolean): void;
}
