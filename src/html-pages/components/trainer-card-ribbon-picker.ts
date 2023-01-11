import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

interface ITrainerCardRibbonPickerProps extends IPickerProps<string> {
	trainerCardRoomId: string;
}

export class TrainerCardRibbonPicker extends PickerBase {
	componentId: string = 'trainer-card-ribbon-picker';

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITrainerCardRibbonPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		let choices: Dict<string> = {};
		if (Config.tournamentTrainerCardRibbons) {
			for (const i in Config.tournamentTrainerCardRibbons) {
				choices[i] = i;
			}
		}

		if (Config.enabledTournamentTrainerCardRibbons && Object.keys(Config.enabledTournamentTrainerCardRibbons).length) {
			if (props.trainerCardRoomId in Config.enabledTournamentTrainerCardRibbons) {
				const keys = Object.keys(choices);
				for (const key of keys) {
					if (!Config.enabledTournamentTrainerCardRibbons[props.trainerCardRoomId].includes(key)) {
						delete choices[key];
					}
				}
			} else {
				choices = {};
			}
		}

		this.choices = choices;
		this.renderChoices();
	}

	getChoiceButtonHtml(id: string): string {
		if (Config.tournamentTrainerCardRibbons && id in Config.tournamentTrainerCardRibbons) {
			const ribbon = Config.tournamentTrainerCardRibbons[id];
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