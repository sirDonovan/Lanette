import type { Activity, Player } from "../../room-activity";
import type { Room } from "../../rooms";
import { CLOSE_COMMAND, HtmlPageBase, SWITCH_LOCATION_COMMAND } from "../html-page-base";

export interface IActivityPageOptions {
	baseChatUhtmlName?: string;
	sendToChat?: boolean;
}

export abstract class ActivityPageBase extends HtmlPageBase {
    useExpirationTimer = false;

	activity: Activity;
    player: Player;

	constructor(activity: Activity, player: Player, baseCommand: string, options: IActivityPageOptions) {
		super(activity.room as Room, player, baseCommand, {});

        this.activity = activity;
        this.player = player;

        this.baseChatUhtmlName = options.baseChatUhtmlName || this.activity.uhtmlBaseName + "-page";
		if (options.sendToChat) this.chatUhtmlName = this.baseChatUhtmlName;

        this.setCloseButton();
	}

    abstract tryCommand(command: string, targets: string[]): void;
    abstract renderDetails(): string;

    tryGlobalCommand(command: string): boolean {
		if (command === CLOSE_COMMAND) {
            this.temporarilyClose();
            return true;
        } else if (command === SWITCH_LOCATION_COMMAND) {
            this.switchLocation();
            return true;
        } else {
            return false;
        }
	}

    onSend(): void {
        if (this.chatUhtmlName) {
            this.player.sentPrivateHtml = true;
            this.player.sentHtmlPage = "";
        } else {
            this.player.sentPrivateHtml = false;
            this.player.sentHtmlPage = this.pageId;
        }
    }

    getPmRoom(): Room {
		return this.activity.getPmRoom();
	}
}
