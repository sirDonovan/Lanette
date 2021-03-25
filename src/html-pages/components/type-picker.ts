import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export class TypePicker extends PickerBase {
	static types: string[] = [];
	static TypePickerLoaded: boolean = false;

	componentId: string = 'type-picker';

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPickerProps<string>) {
		super(parentCommandPrefix, componentCommand, props);

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
		let html = "Type:";
		html += "<br /><br />";

		html += this.noPickElement.html;
		for (const type in this.choiceElements) {
			html += "&nbsp;" + this.choiceElements[type].html;
		}

		return html;
	}
}