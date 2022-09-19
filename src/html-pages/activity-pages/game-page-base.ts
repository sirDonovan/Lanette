import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { ActivityPageBase, type IActivityPageOptions } from "./activity-page-base";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGamePageOptions extends IActivityPageOptions {
    pageName?: string;
}

export abstract class GamePageBase extends ActivityPageBase {
	declare activity: ScriptedGame;

    pageName?: string;

	constructor(activity: ScriptedGame, player: Player, baseCommand: string, options: IGamePageOptions) {
		super(activity, player, baseCommand, options);

        this.pageName = options.pageName;
	}

    abstract tryCommand(command: string, targets: string[]): void;
    abstract renderDetails(): string;

    render(): string {
        let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" +
            (this.pageName || this.activity.format.nameWithOptions) + "</b>";

		if (this.closeButtonHtml && !this.activity.ended) {
            html += "&nbsp;" + this.closeButtonHtml;
        }

        if (this.activity.ended) {
            html += "<br /><h3>The game has ended!</h3>";
        } else if (this.showSwitchLocationButton) {
            html += "<br />" + this.switchLocationButtonHtml;
        }

		html += "</center>";

        html += this.renderDetails();

        html += "</div>";

        return html;
    }
}
