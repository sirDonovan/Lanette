import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export class TrainerCardRibbonPicker extends PickerBase {
	componentId: string = 'trainer-card-ribbon-picker';

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPickerProps<string>) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		if (Config.tournamentTrainerCardRibbons) {
			for (const i in Config.tournamentTrainerCardRibbons) {
				this.choices[i] = i;
			}
		}

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