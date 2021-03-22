import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";

export interface ITypePickerProps {
	currentType: string | undefined;
	noTypeName?: string | undefined;
	pickerIndex?: number;
	onClearType: (pickerIndex: number) => void;
	onSelectType: (pickerIndex: number, selectedType: string) => void;
	onUpdateView: () => void;
}

const typeCommand = 'type';
const noType = "None";

export class TypePicker extends ComponentBase {
	static types: string[] = [];
	static TypePickerLoaded: boolean = false;

	currentType: string | undefined;
	typeElements: Dict<IPageElement> = {};
	noTypeName: string;
	noTypeElement: IPageElement = {html: ""};
	pickerIndex: number;

	props: ITypePickerProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: ITypePickerProps) {
		super(parentCommandPrefix, componentCommand);

		TypePicker.loadData();

		this.currentType = props.currentType;
		this.pickerIndex = props.pickerIndex || 0;
		this.noTypeName = props.noTypeName || noType;
		this.noTypeElement.html = this.renderNoTypeElement();

		for (const type of TypePicker.types) {
			this.typeElements[type] = {html: this.renderTypeElement(type), selected: this.currentType === type};
		}

		this.props = props;
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

	renderTypeElement(type: string): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + typeCommand + ", " + type, Dex.getTypeHtml(Dex.getExistingType(type)),
			this.currentType === type);
	}

	renderNoTypeElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + typeCommand + ", " + noType, this.noTypeName,
			!this.currentType);
	}

	clearType(dontRender?: boolean): void {
		if (this.currentType === undefined) return;

		const previousType = this.currentType;
		this.currentType = undefined;

		this.typeElements[previousType].html = this.renderTypeElement(previousType);
		this.typeElements[previousType].selected = false;
		this.noTypeElement.html = this.renderNoTypeElement();
		this.noTypeElement.selected = true;

		if (!dontRender) this.props.onClearType(this.pickerIndex);
	}

	selectType(type: string, dontRender?: boolean): void {
		if (this.currentType === type) return;

		const previousType = this.currentType;
		this.currentType = type;
		if (previousType) {
			this.typeElements[previousType].html = this.renderTypeElement(previousType);
			this.typeElements[previousType].selected = false;
		} else {
			this.noTypeElement.html = this.renderNoTypeElement();
			this.noTypeElement.selected = false;
		}
		this.typeElements[this.currentType].html = this.renderTypeElement(this.currentType);
		this.typeElements[this.currentType].selected = true;

		if (!dontRender) this.props.onSelectType(this.pickerIndex, type);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === typeCommand) {
			const type = targets[0].trim();
			const cleared = type === noType;
			if (!cleared && !TypePicker.types.includes(type)) {
				return "'" + type + "' is not a valid type.";
			}

			if (cleared) {
				this.clearType();
			} else {
				this.selectType(type);
			}
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		let html = "Type:";
		html += "<br /><br />";

		html += this.noTypeElement.html;
		for (const type in this.typeElements) {
			html += "&nbsp;" + this.typeElements[type].html;
		}

		return html;
	}
}