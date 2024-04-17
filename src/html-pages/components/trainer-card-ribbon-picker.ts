import type { IDatabase } from "../../types/storage";
import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

interface ITrainerCardRibbonPickerProps extends IPickerProps<string> {
	database: IDatabase;
	trainerCardRoomId: string;
}

export class TrainerCardRibbonPicker extends PickerBase {
	componentId: string = 'trainer-card-ribbon-picker';

	declare props: ITrainerCardRibbonPickerProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITrainerCardRibbonPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		const choices: Dict<string> = {};
		if (props.database.tournamentTrainerCardRibbons) {
			for (const i in props.database.tournamentTrainerCardRibbons) {
				choices[i] = i;
			}
		}

		this.choices = choices;
		this.renderChoices();
	}

	getChoiceButtonHtml(id: string): string {
		if (this.props.database.tournamentTrainerCardRibbons && id in this.props.database.tournamentTrainerCardRibbons) {
			const ribbon = this.props.database.tournamentTrainerCardRibbons[id];
			return "<img src='" + ribbon.source + "' width=" + ribbon.width + "px height=" + ribbon.height + "px /><br />" + ribbon.name;
		}

		return "";
	}

	render(): string {
		let html = "Ribbons:";
		html += "<br /><br />";

		html += this.noPickElement.html;
		for (const type in this.choiceElements) {
			html += "&nbsp;" + this.choiceElements[type].html;
		}

		return html;
	}
}