import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export class TrainerCardBadgePicker extends PickerBase {
	componentId: string = 'trainer-card-badge-picker';

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPickerProps<string>) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		if (Config.tournamentTrainerCardBadges) {
			for (const i in Config.tournamentTrainerCardBadges) {
				this.choices[i] = i;
			}
		}

		this.renderChoices();
	}

	getChoiceButtonHtml(id: string): string {
		if (Config.tournamentTrainerCardBadges && id in Config.tournamentTrainerCardBadges) {
			const badge = Config.tournamentTrainerCardBadges[id];
			return "<img src='" + badge.source + "' width=" + badge.width + "px height=" + badge.height + "px /><br />" + badge.name;
		}

		return "";
	}

	render(): string {
		let html = "Badges:";
		html += "<br /><br />";

		html += this.noPickElement.html;
		for (const type in this.choiceElements) {
			html += "&nbsp;" + this.choiceElements[type].html;
		}

		return html;
	}
}