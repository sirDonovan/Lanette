import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { ActivityPageBase, type IActivityPageOptions } from "./activity-page-base";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGamePageOptions extends IActivityPageOptions {}

export abstract class GamePageBase extends ActivityPageBase {
	declare activity: ScriptedGame;

	constructor(activity: ScriptedGame, player: Player, baseCommand: string, options: IGamePageOptions) {
		super(activity, player, baseCommand, options);
	}

    abstract tryCommand(command: string, targets: string[]): void;
    abstract renderDetails(): string;

    render(): string {
        let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.activity.format.nameWithOptions + "</b>";
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
