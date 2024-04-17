import type { IDatabase } from "../../types/storage";
import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface ITrainerCardBadgePickerProps extends IPickerProps<string> {
	database: IDatabase;
}

export class TrainerCardBadgePicker extends PickerBase {
	componentId: string = 'trainer-card-badge-picker';

	declare props: ITrainerCardBadgePickerProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITrainerCardBadgePickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		if (props.database.tournamentTrainerCardBadges) {
			for (const i in props.database.tournamentTrainerCardBadges) {
				this.choices[i] = i;
			}
		}

		this.renderChoices();
	}

	getChoiceButtonHtml(id: string): string {
		if (this.props.database.tournamentTrainerCardBadges && id in this.props.database.tournamentTrainerCardBadges) {
			const badge = this.props.database.tournamentTrainerCardBadges[id];
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