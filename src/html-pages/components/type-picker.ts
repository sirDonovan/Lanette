import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface ITypePickerProps extends IPickerProps<string> {
	hideLabel?: boolean;
}

export class TypePicker extends PickerBase {
	static types: string[] = [];
	static TypePickerLoaded: boolean = false;

	componentId: string = 'type-picker';

	declare props: ITypePickerProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITypePickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		TypePicker.loadData();

		for (const type of TypePicker.types) {
			this.choices[type] = type;
		}

		this.renderChoices();
	}

	static loadData(): void {
		if (this.TypePickerLoaded) return;

		const types: string[] = [];
		for (const key of Dex.getData().typeKeys) {
			types.push(Dex.getExistingType(key).name);
		}

		this.types = types.sort();

		this.TypePickerLoaded = true;
	}

	getChoiceButtonHtml(type: string): string {
		return Dex.getTypeHtml(Dex.getExistingType(type));
	}

	render(): string {
		let html = "";
		if (!this.props.hideLabel) {
			html += "Type:";
			html += "<br /><br />";
		}

		html += this.noPickElement.html;
		for (const type in this.choiceElements) {
			html += "&nbsp;" + this.choiceElements[type].html;
		}

		return html;
	}
}