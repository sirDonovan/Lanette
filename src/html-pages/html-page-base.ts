import type { Room } from "../rooms";
import type { User } from "../users";
import type { ComponentBase } from "./components/component-base";

export abstract class HtmlPageBase {
	abstract pageId: string;

	components: ComponentBase[] = [];
	lastRender: string = '';

	baseCommand: string;
	commandPrefix: string;
	isRoomStaff: boolean;
	room: Room;
	userName: string;
	userId: string;

	constructor(room: Room, user: User, baseCommand: string) {
		this.room = room;
		this.userName = user.name;
		this.userId = user.id;
		this.isRoomStaff = user.hasRank(room, 'driver') || user.isDeveloper();
		this.baseCommand = baseCommand;
		this.commandPrefix = Config.commandCharacter + baseCommand + " " + room.id;
	}

	abstract onClose(): void;
	abstract render(onOpen?: boolean): string;

	destroy(): void {
		const keys = Object.getOwnPropertyNames(this);
		for (const key of keys) {
			// @ts-expect-error
			this[key] = undefined;
		}
	}

	open(): void {
		this.send(true);
	}

	close(): void {
		const user = Users.get(this.userId);
		if (user) this.room.closeHtmlPage(user, this.pageId);

		this.onClose();
		this.destroy();
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

	checkComponentCommands(componentCommand: string, targets: readonly string[]): string | undefined {
		for (const component of this.components) {
			if (component.active && component.componentCommand === componentCommand) {
				return component.tryCommand(targets);
			}
		}

		return "Unknown sub-command '" + componentCommand + "'.";
	}

	getQuietPmButton(message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return Client.getQuietPmButton(this.room, message, label, disabled, buttonStyle);
	}

	beforeSend?(onOpen?: boolean): boolean;
	onOpen?(): void;
	onSend?(onOpen?: boolean): void;
}
