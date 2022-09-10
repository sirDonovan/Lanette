import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import { CLOSE_COMMAND, HtmlPageBase, SWITCH_LOCATION_COMMAND } from "./../html-page-base";

export interface IGamePageOptions {
	baseChatUhtmlName?: string;
	sendToChat?: boolean;
}

export abstract class GamePageBase extends HtmlPageBase {
	game: ScriptedGame;
    player: Player;

	constructor(game: ScriptedGame, player: Player, baseCommand: string, options: IGamePageOptions) {
		super(game.room as Room, player, baseCommand, {});

        this.game = game;
        this.player = player;

        this.baseChatUhtmlName = options.baseChatUhtmlName || this.game.uhtmlBaseName + "-page";
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

    render(): string {
        let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.game.format.nameWithOptions + "</b>";
		html += this.closeButtonHtml ? "&nbsp;" + this.closeButtonHtml : "";

        if (this.showSwitchLocationButton) {
            html += "<br />" + this.switchLocationButtonHtml;
        }

		html += "</center>";

        html += this.renderDetails();

        html += "</div>";

        return html;
    }
}
