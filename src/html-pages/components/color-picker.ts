import type { HexCode } from "../../types/tools";
import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";

export type HueVariation = 'lowvariation' | 'standardvariation' | 'highvariation';
export type Lightness = 'lowlightness' | 'standardlightness' | 'highlightness';

interface IColorPickerProps {
	currentColor: HexCode | undefined;
	random?: boolean;
	onClearColor: () => void;
	onSelectColor: (selectedColor: HexCode) => void;
	onUpdateView: () => void;
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

const randomColorCommand = 'randomcolor';
const huesListCommand = 'hueslist';
const colorCommand = 'color';
const noColor = "None";

export class ColorPicker extends ComponentBase {
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

	lightness: Lightness;
	currentColor: HexCode | undefined;
	colorElements: Dict<IPageElement> = {};
	hueVariation: HueVariation;
	noColorElement: IPageElement = {html: ""};

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

	props: IColorPickerProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IColorPickerProps) {
		super(parentCommandPrefix, componentCommand);

		ColorPicker.loadData();

		this.currentColor = props.currentColor;

		if (props.currentColor && props.currentColor in Tools.hexCodes) {
			if (Tools.hexCodes[props.currentColor]!.category === 'light') {
				this.lightness = 'highlightness';
				if (ColorPicker.highLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.highLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			} else if (Tools.hexCodes[props.currentColor]!.category === 'dark') {
				this.lightness = 'lowlightness';
				if (ColorPicker.lowLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.lowLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			} else {
				this.lightness = 'standardlightness';
				if (ColorPicker.standardLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.standardLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standardvariation';
				} else {
					this.hueVariation = 'highvariation';
				}
			}
		} else {
			this.noColorElement.selected = true;
			this.lightness = 'lowlightness';
			this.hueVariation = 'lowvariation';
		}

		for (const key of ColorPicker.lowLightnessHighVariation) {
			this.colorElements[key] = {html: this.renderColorElement(key), selected: key === this.currentColor};
		}

		for (const key of ColorPicker.standardLightnessHighVariation) {
			this.colorElements[key] = {html: this.renderColorElement(key), selected: key === this.currentColor};
		}

		for (const key of ColorPicker.highLightnessHighVariation) {
			this.colorElements[key] = {html: this.renderColorElement(key), selected: key === this.currentColor};
		}

		this.noColorElement.html = this.renderNoColorElement();

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

		this.props = props;
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
		const elements: IPageElement[] = [this.noColorElement];

		for (const color of colors) {
			elements.push(this.colorElements[color]);
		}

		return new Pagination(this.commandPrefix, huesListCommand, {
			elements,
			elementsPerRow: colorsPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
	}

	renderColorElement(color: HexCode): string {
		const currentColor = this.currentColor === color;
		let colorDiv = "<div style='background: " + Tools.hexCodes[color]!.gradient + ";height: 15px;width: 15px";
		if (currentColor) {
			colorDiv += ";color: ";
			if (Tools.hexCodes[color]!.textColor) {
				colorDiv += Tools.hexCodes[color]!.textColor;
			} else {
				colorDiv += '#000000';
			}
		}
		colorDiv += "'>" + (currentColor ? "<b>X</b>" : "&nbsp;") + "</div>";

		return Client.getPmSelfButton(this.commandPrefix + ", " + colorCommand + ", " + color, colorDiv, currentColor);
	}

	renderNoColorElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + colorCommand + ", " + noColor, "None",
			!this.currentColor);
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

	setHueVariation(hueVariation: HueVariation, dontRender?: boolean): void {
		if (this.hueVariation === hueVariation) return;

		this.hueVariation = hueVariation;

		if (!dontRender) {
			this.toggleActivePagination();
			this.props.onUpdateView();
		}
	}

	setLightness(lightness: Lightness, dontRender?: boolean): void {
		if (this.lightness === lightness) return;

		this.lightness = lightness;

		if (!dontRender) {
			this.toggleActivePagination();
			this.props.onUpdateView();
		}
	}

	clearColor(dontRender?: boolean): void {
		if (this.currentColor === undefined) return;

		const previousColor = this.currentColor;
		this.currentColor = undefined;

		this.colorElements[previousColor].html = this.renderColorElement(previousColor);
		this.colorElements[previousColor].selected = false;
		this.noColorElement.html = this.renderNoColorElement();
		this.noColorElement.selected = true;

		if (!dontRender) this.props.onClearColor();
	}

	selectColor(color: HexCode, dontRender?: boolean): void {
		if (this.currentColor === color) return;

		const previousColor = this.currentColor;
		this.currentColor = color;
		if (previousColor) {
			this.colorElements[previousColor].html = this.renderColorElement(previousColor);
			this.colorElements[previousColor].selected = false;
		} else {
			this.noColorElement.html = this.renderNoColorElement();
			this.noColorElement.selected = false;
		}
		this.colorElements[this.currentColor].html = this.renderColorElement(this.currentColor);
		this.colorElements[this.currentColor].selected = true;

		if (!dontRender) this.props.onSelectColor(color);
	}

	selectRandomColor(): void {
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
		while (color === this.currentColor) {
			color = Tools.sampleOne(colors);
		}

		this.selectColor(color);
	}

	setRandomizedColor(hueVariation: HueVariation, lightness: Lightness, color: HexCode): void {
		this.setHueVariation(hueVariation, true);
		this.setLightness(lightness, true);
		this.selectColor(color, true);

		this.toggleActivePagination(true);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === hueVariationCommand) {
			const variation = Tools.toId(targets[0]) as HueVariation | '';
			if (variation === 'lowvariation' || variation === 'standardvariation' || variation === 'highvariation') {
				this.setHueVariation(variation);
			} else {
				return "'" + variation + "' is not a valid hue variation.";
			}
		} else if (cmd === lightnessCommand) {
			const lightness = Tools.toId(targets[0]) as Lightness | '';
			if (lightness === 'lowlightness' || lightness === 'standardlightness' || lightness === 'highlightness') {
				this.setLightness(lightness);
			} else {
				return "'" + lightness + "' is not a valid lightness.";
			}
		} else if (cmd === colorCommand) {
			const color = targets[0].trim() as HexCode | typeof noColor | '';
			const cleared = color === noColor;
			if (!cleared && !(color in Tools.hexCodes)) {
				return "'" + color + "' is not a valid color.";
			}

			if (cleared) {
				this.clearColor();
			} else {
				this.selectColor(color as HexCode);
			}
		} else if (cmd === randomColorCommand) {
			this.selectRandomColor();
		} else {
			return this.checkComponentCommands(cmd, targets);
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
			html += this.renderNoColorElement();
			html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + randomColorCommand, "Random Color");
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