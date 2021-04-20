import type { HexCode } from "../../types/tools";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";

export type HueVariation = 'lowvariation' | 'standardvariation' | 'highvariation';
export type Lightness = 'lowlightness' | 'standardlightness' | 'highlightness';

export interface IColorPick {
	hexCode: HexCode;
	hueVariation: HueVariation;
	lightness: Lightness;
}

interface IColorPickerProps extends IPickerProps<IColorPick> {
	random?: boolean;
	onPickHueVariation: (pickerIndex: number, pick: HueVariation, dontRender: boolean | undefined) => void;
	onPickLightness: (pickerIndex: number, pick: Lightness, dontRender: boolean | undefined) => void;
}

const colorsPerRow = 15;
const rowsPerPage = 5;
const pagesLabel = "Colors";

const lowVariationIncrement = 15;
const standardVariationIncrement = 5;
const highVariationIncrement = 1;

const hueVariationCommand = 'huevariation';
const lowVariation = 'lowvariation';
const standardVariation = 'standardvariation';
const highVariation = 'highvariation';

const lightnessCommand = 'lightness';
const lowLightness = 'lowlightness';
const standardLightness = 'standardlightness';
const highLightness = 'highlightness';

const huesListCommand = 'hueslist';

export class ColorPicker extends PickerBase<IColorPick, IColorPickerProps> {
	static lowLightnessLowVariation: HexCode[] = [];
	static lowLightnessStandardVariation: HexCode[] = [];
	static lowLightnessHighVariation: HexCode[] = [];
	static standardLightnessLowVariation: HexCode[] = [];
	static standardLightnessStandardVariation: HexCode[] = [];
	static standardLightnessHighVariation: HexCode[] = [];
	static highLightnessLowVariation: HexCode[] = [];
	static highLightnessStandardVariation: HexCode[] = [];
	static highLightnessHighVariation: HexCode[] = [];
	static ColorPickerLoaded: boolean = false;

	componentId: string = 'color-picker';

	lightness: Lightness;
	hueVariation: HueVariation;

	lowLightnessLowVariationPagination: Pagination;
	lowLightnessStandardVariationPagination: Pagination;
	lowLightnessHighVariationPagination: Pagination;
	standardLightnessLowVariationPagination: Pagination;
	standardLightnessStandardVariationPagination: Pagination;
	standardLightnessHighVariationPagination: Pagination;
	highLightnessLowVariationPagination: Pagination;
	highLightnessStandardVariationPagination: Pagination;
	highLightnessHighVariationPagination: Pagination;

	paginations: Pagination[] = [];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IColorPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		ColorPicker.loadData();

		if (this.currentPick && this.currentPick in Tools.hexCodes) {
			const hexCode = this.currentPick as HexCode;
			if (Tools.hexCodes[hexCode]!.category === 'light') {
				this.lightness = 'highlightness';
				if (ColorPicker.highLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.highLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			} else if (Tools.hexCodes[hexCode]!.category === 'dark') {
				this.lightness = 'lowlightness';
				if (ColorPicker.lowLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.lowLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			} else {
				this.lightness = 'standardlightness';
				if (ColorPicker.standardLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.standardLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			}
		} else {
			this.currentPick = undefined;
			this.noPickElement.html = this.renderNoPickElement();
			this.noPickElement.selected = true;
			this.lightness = 'lowlightness';
			this.hueVariation = 'lowvariation';
		}

		for (const hexCode of ColorPicker.lowLightnessLowVariation) {
			this.choices[hexCode] = {hexCode, lightness: 'lowlightness', hueVariation: 'lowvariation'};
		}

		for (const hexCode of ColorPicker.lowLightnessStandardVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'lowlightness', hueVariation: 'standardvariation'};
		}

		for (const hexCode of ColorPicker.lowLightnessHighVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'lowlightness', hueVariation: 'highvariation'};
		}

		for (const hexCode of ColorPicker.standardLightnessLowVariation) {
			this.choices[hexCode] = {hexCode, lightness: 'standardlightness', hueVariation: 'lowvariation'};
		}

		for (const hexCode of ColorPicker.standardLightnessStandardVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'standardlightness', hueVariation: 'standardvariation'};
		}

		for (const hexCode of ColorPicker.standardLightnessHighVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'standardlightness', hueVariation: 'highvariation'};
		}

		for (const hexCode of ColorPicker.highLightnessLowVariation) {
			this.choices[hexCode] = {hexCode, lightness: 'highlightness', hueVariation: 'lowvariation'};
		}

		for (const hexCode of ColorPicker.highLightnessStandardVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'highlightness', hueVariation: 'standardvariation'};
		}

		for (const hexCode of ColorPicker.highLightnessHighVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'highlightness', hueVariation: 'highvariation'};
		}

		this.renderChoices();

		this.lowLightnessLowVariationPagination = this.createColorPagination(ColorPicker.lowLightnessLowVariation);
		this.lowLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.lowLightnessStandardVariation);
		this.lowLightnessHighVariationPagination = this.createColorPagination(ColorPicker.lowLightnessHighVariation);
		this.standardLightnessLowVariationPagination = this.createColorPagination(ColorPicker.standardLightnessLowVariation);
		this.standardLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.standardLightnessStandardVariation);
		this.standardLightnessHighVariationPagination = this.createColorPagination(ColorPicker.standardLightnessHighVariation);
		this.highLightnessLowVariationPagination = this.createColorPagination(ColorPicker.highLightnessLowVariation);
		this.highLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.highLightnessStandardVariation);
		this.highLightnessHighVariationPagination = this.createColorPagination(ColorPicker.highLightnessHighVariation);

		this.toggleActivePagination();

		this.components = [this.lowLightnessLowVariationPagination, this.lowLightnessStandardVariationPagination,
			this.lowLightnessHighVariationPagination, this.standardLightnessLowVariationPagination,
			this.standardLightnessStandardVariationPagination, this.standardLightnessHighVariationPagination,
			this.highLightnessLowVariationPagination, this.highLightnessStandardVariationPagination,
			this.highLightnessHighVariationPagination,
		];

		this.paginations = this.components.slice() as Pagination[];
	}

	static loadData(): void {
		if (this.ColorPickerLoaded) return;

		const keys = Object.keys(Tools.hexCodes) as HexCode[];
		const lightKeys: HexCode[] = [];
		const standardKeys: HexCode[] = [];
		const darkKeys: HexCode[] = [];
		for (const key of keys) {
			if (Tools.hexCodes[key]!.category === 'light') {
				lightKeys.push(key);
			} else if (Tools.hexCodes[key]!.category === 'dark') {
				darkKeys.push(key);
			} else {
				standardKeys.push(key);
			}
		}

		for (let i = 0; i < darkKeys.length; i++) {
			const color = darkKeys[i];
			if (i % lowVariationIncrement === 0) this.lowLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.lowLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.lowLightnessHighVariation.push(color);
		}

		for (let i = 0; i < standardKeys.length; i++) {
			const color = standardKeys[i];
			if (i % lowVariationIncrement === 0) this.standardLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.standardLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.standardLightnessHighVariation.push(color);
		}

		for (let i = 0; i < lightKeys.length; i++) {
			const color = lightKeys[i];
			if (i % lowVariationIncrement === 0) this.highLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.highLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.highLightnessHighVariation.push(color);
		}

		this.ColorPickerLoaded = true;
	}

	createColorPagination(colors: HexCode[]): Pagination {
		const elements: IPageElement[] = [this.noPickElement];

		for (const color of colors) {
			elements.push(this.choiceElements[color]);
		}

		return new Pagination(this.commandPrefix, huesListCommand, {
			elements,
			elementsPerRow: colorsPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
	}

	getChoiceButtonHtml(choice: IColorPick): string {
		const currentColor = this.currentPick === choice.hexCode;

		let colorDiv = "<div style='background: " + Tools.hexCodes[choice.hexCode]!.gradient + ";height: 15px;width: 15px";
		if (currentColor) {
			colorDiv += ";color: ";
			if (Tools.hexCodes[choice.hexCode]!.textColor) {
				colorDiv += Tools.hexCodes[choice.hexCode]!.textColor;
			} else {
				colorDiv += '#000000';
			}
		}
		colorDiv += "'>" + (currentColor ? "<b>X</b>" : "&nbsp;") + "</div>";

		return colorDiv;
	}

	toggleActivePagination(autoSelectPage?: boolean): void {
		this.lowLightnessLowVariationPagination.active = this.lightness === 'lowlightness' &&
			this.hueVariation === 'lowvariation';
		this.lowLightnessStandardVariationPagination.active = this.lightness === 'lowlightness' &&
			this.hueVariation === 'standardvariation';
		this.lowLightnessHighVariationPagination.active = this.lightness === 'lowlightness' &&
			this.hueVariation === 'highvariation';
		this.standardLightnessLowVariationPagination.active = this.lightness === 'standardlightness' &&
			this.hueVariation === 'lowvariation';
		this.standardLightnessStandardVariationPagination.active = this.lightness === 'standardlightness' &&
			this.hueVariation === 'standardvariation';
		this.standardLightnessHighVariationPagination.active = this.lightness === 'standardlightness' &&
			this.hueVariation === 'highvariation';
		this.highLightnessLowVariationPagination.active = this.lightness === 'highlightness' &&
			this.hueVariation === 'lowvariation';
		this.highLightnessStandardVariationPagination.active = this.lightness === 'highlightness' &&
			this.hueVariation === 'standardvariation';
		this.highLightnessHighVariationPagination.active = this.lightness === 'highlightness' &&
			this.hueVariation === 'highvariation';

		if (autoSelectPage) {
			for (const pagination of this.paginations) {
				if (pagination.active) {
					pagination.autoSelectPage();
					break;
				}
			}
		}
	}

	pickHueVariation(hueVariation: HueVariation, dontRender?: boolean): void {
		if (this.hueVariation === hueVariation) return;

		this.hueVariation = hueVariation;

		this.toggleActivePagination();

		this.props.onPickHueVariation(this.pickerIndex, hueVariation, dontRender);
	}

	parentPickHueVariation(hueVariation: HueVariation): void {
		return this.pickHueVariation(hueVariation, true);
	}

	pickLightness(lightness: Lightness, dontRender?: boolean): void {
		if (this.lightness === lightness) return;

		this.lightness = lightness;

		this.toggleActivePagination();

		this.props.onPickLightness(this.pickerIndex, lightness, dontRender);
	}

	parentPickLightness(lightness: Lightness): void {
		return this.pickLightness(lightness, true);
	}

	pickRandom(dontRender?: boolean): void {
		let colors: HexCode[];
		if (this.lightness === 'lowlightness') {
			if (this.hueVariation === 'lowvariation') {
				colors = ColorPicker.lowLightnessLowVariation;
			} else if (this.hueVariation === 'standardvariation') {
				colors = ColorPicker.lowLightnessStandardVariation;
			} else {
				colors = ColorPicker.lowLightnessHighVariation;
			}
		} else if (this.lightness === 'standardlightness') {
			if (this.hueVariation === 'lowvariation') {
				colors = ColorPicker.standardLightnessLowVariation;
			} else if (this.hueVariation === 'standardvariation') {
				colors = ColorPicker.standardLightnessStandardVariation;
			} else {
				colors = ColorPicker.standardLightnessHighVariation;
			}
		} else {
			if (this.hueVariation === 'lowvariation') {
				colors = ColorPicker.highLightnessLowVariation;
			} else if (this.hueVariation === 'standardvariation') {
				colors = ColorPicker.highLightnessStandardVariation;
			} else {
				colors = ColorPicker.highLightnessHighVariation;
			}
		}

		let color = Tools.sampleOne(colors);
		while (color === this.currentPick) {
			color = Tools.sampleOne(colors);
		}

		this.pick(color, dontRender);
	}

	setRandomizedColor(hueVariation: HueVariation, lightness: Lightness, color: HexCode): void {
		if (!this.isValidChoice(color)) return;

		this.parentPickHueVariation(hueVariation);
		this.parentPickLightness(lightness);
		this.parentPick(color);

		this.toggleActivePagination(true);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === hueVariationCommand) {
			const variation = Tools.toId(targets[0]) as HueVariation | '';
			if (variation === 'lowvariation' || variation === 'standardvariation' || variation === 'highvariation') {
				this.pickHueVariation(variation);
			} else {
				return "'" + variation + "' is not a valid hue variation.";
			}
		} else if (cmd === lightnessCommand) {
			const lightness = Tools.toId(targets[0]) as Lightness | '';
			if (lightness === 'lowlightness' || lightness === 'standardlightness' || lightness === 'highlightness') {
				this.pickLightness(lightness);
			} else {
				return "'" + lightness + "' is not a valid lightness.";
			}
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		const currentLowLightness = this.lightness === 'lowlightness';
		const currentStandardLightness = this.lightness === 'standardlightness';
		const currentHighLightness = this.lightness === 'highlightness';

		let html = "Lightness:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + lightnessCommand + ", " + lowLightness, "Low",
			currentLowLightness);
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + lightnessCommand + ", " + standardLightness, "Standard",
			currentStandardLightness);
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + lightnessCommand + ", " + highLightness, "High",
			currentHighLightness);
		html += "<br />";

		const currentLowHueVariation = this.hueVariation === 'lowvariation';
		const currentStandardHueVariation = this.hueVariation === 'standardvariation';
		const currentHighHueVariation = this.hueVariation === 'highvariation';

		html += "Hue Variation:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + hueVariationCommand + ", " + lowVariation, "Low",
			currentLowHueVariation);
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + hueVariationCommand + ", " + standardVariation, "Standard",
			currentStandardHueVariation);
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + hueVariationCommand + ", " + highVariation, "High",
			currentHighHueVariation);
		html += "<br /><br />";

		if (this.props.random) {
			html += this.renderNoPickElement();
			html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.randomPickCommand, "Random Color");
		} else {
			if (currentLowLightness) {
				if (currentLowHueVariation) {
					html += this.lowLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.lowLightnessStandardVariationPagination.render();
				} else {
					html += this.lowLightnessHighVariationPagination.render();
				}
			} else if (currentStandardLightness) {
				if (currentLowHueVariation) {
					html += this.standardLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.standardLightnessStandardVariationPagination.render();
				} else {
					html += this.standardLightnessHighVariationPagination.render();
				}
			} else {
				if (currentLowHueVariation) {
					html += this.highLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.highLightnessStandardVariationPagination.render();
				} else {
					html += this.highLightnessHighVariationPagination.render();
				}
			}
		}

		return html;
	}
}