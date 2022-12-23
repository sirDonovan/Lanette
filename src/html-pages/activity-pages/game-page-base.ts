import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import type { IGameCustomBox } from "../../types/storage";
import type { IQuietPMButtonOptions } from "../html-page-base";
import { ActivityPageBase, type IActivityPageOptions } from "./activity-page-base";

export interface IGamePageOptions extends IActivityPageOptions {
    customBox?: IGameCustomBox;
    pageName?: string;
}

export abstract class GamePageBase extends ActivityPageBase {
	declare activity: ScriptedGame;

    customBox?: IGameCustomBox;
    pageName?: string;

	constructor(activity: ScriptedGame, player: Player, baseCommand: string, options: IGamePageOptions) {
		super(activity, player, baseCommand, options);

        this.customBox = options.customBox;
        this.pageName = options.pageName;

        if (this.customBox) this.setCloseButton();
	}

    getQuietPmButton(message: string, label: string, options?: IQuietPMButtonOptions): string {
        if (this.customBox) {
            const disabled = this.getButtonDisabled(options);

            if (!options) options = {};
            options.style = Games.getCustomBoxButtonStyle(this.customBox, 'game', disabled);
        }

        return super.getQuietPmButton(message, label, options);
    }

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

        let details = this.renderDetails();
        if (this.customBox) {
            details = Games.getGameCustomBoxDiv(details, this.customBox);
        }

        html += details;
        html += "</div>";

        return html;
    }
}
