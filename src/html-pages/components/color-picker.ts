import type { HexCode } from "../../types/tools";
import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";

type HueVariation = 'low' | 'standard' | 'high';
type Lightness = 'low' | 'standard' | 'high';

interface IColorPickerProps {
	currentColor: HexCode | undefined;
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
const lowVariation = 'low';
const standardVariation = 'standard';
const highVariation = 'high';

const lightnessCommand = 'lightness';
const lowLightness = 'low';
const standardLightness = 'standard';
const highLightness = 'high';

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
	static loadedData: boolean = false;

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

	props: IColorPickerProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IColorPickerProps) {
		super(parentCommandPrefix, componentCommand);

		ColorPicker.loadData();

		this.currentColor = props.currentColor;

		if (props.currentColor && props.currentColor in Tools.hexCodes) {
			if (Tools.hexCodes[props.currentColor]!.category === 'light') {
				this.lightness = 'high';
				if (ColorPicker.highLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'low';
				} else if (ColorPicker.highLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standard';
				} else {
					this.hueVariation = 'high';
				}
			} else if (Tools.hexCodes[props.currentColor]!.category === 'dark') {
				this.lightness = 'low';
				if (ColorPicker.lowLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'low';
				} else if (ColorPicker.lowLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standard';
				} else {
					this.hueVariation = 'high';
				}
			} else {
				this.lightness = 'standard';
				if (ColorPicker.standardLightnessLowVariation.includes(props.currentColor)) {
					this.hueVariation = 'low';
				} else if (ColorPicker.standardLightnessStandardVariation.includes(props.currentColor)) {
					this.hueVariation = 'standard';
				} else {
					this.hueVariation = 'high';
				}
			}
		} else {
			this.noColorElement.selected = true;
			this.lightness = 'low';
			this.hueVariation = 'low';
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

		this.togglePaginationActive();

		this.components = [this.lowLightnessLowVariationPagination, this.lowLightnessStandardVariationPagination,
			this.lowLightnessHighVariationPagination, this.standardLightnessLowVariationPagination,
			this.standardLightnessStandardVariationPagination, this.standardLightnessHighVariationPagination,
			this.highLightnessLowVariationPagination, this.highLightnessStandardVariationPagination,
			this.highLightnessHighVariationPagination,
		];

		this.props = props;
	}

	static loadData(): void {
		if (this.loadedData) return;

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

		this.loadedData = true;
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

	togglePaginationActive(): void {
		this.lowLightnessLowVariationPagination.active = this.lightness === 'low' && this.hueVariation === 'low';
		this.lowLightnessStandardVariationPagination.active = this.lightness === 'low' && this.hueVariation === 'standard';
		this.lowLightnessHighVariationPagination.active = this.lightness === 'low' && this.hueVariation === 'high';
		this.standardLightnessLowVariationPagination.active = this.lightness === 'standard' && this.hueVariation === 'low';
		this.standardLightnessStandardVariationPagination.active = this.lightness === 'standard' && this.hueVariation === 'standard';
		this.standardLightnessHighVariationPagination.active = this.lightness === 'standard' && this.hueVariation === 'high';
		this.highLightnessLowVariationPagination.active = this.lightness === 'high' && this.hueVariation === 'low';
		this.highLightnessStandardVariationPagination.active = this.lightness === 'high' && this.hueVariation === 'standard';
		this.highLightnessHighVariationPagination.active = this.lightness === 'high' && this.hueVariation === 'high';
	}

	lowVariation(): void {
		if (this.hueVariation === 'low') return;

		this.hueVariation = 'low';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	standardVariation(): void {
		if (this.hueVariation === 'standard') return;

		this.hueVariation = 'standard';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	highVariation(): void {
		if (this.hueVariation === 'high') return;

		this.hueVariation = 'high';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	lowLightness(): void {
		if (this.lightness === 'low') return;

		this.lightness = 'low';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	standardLightness(): void {
		if (this.lightness === 'standard') return;

		this.lightness = 'standard';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	highLightness(): void {
		if (this.lightness === 'high') return;

		this.lightness = 'high';
		this.togglePaginationActive();

		this.props.onUpdateView();
	}

	clearColor(): void {
		if (this.currentColor === undefined) return;

		const previousColor = this.currentColor;
		this.currentColor = undefined;

		this.colorElements[previousColor].html = this.renderColorElement(previousColor);
		this.colorElements[previousColor].selected = false;
		this.noColorElement.html = this.renderNoColorElement();
		this.noColorElement.selected = true;

		this.props.onClearColor();
	}

	selectColor(color: HexCode): void {
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

		this.props.onSelectColor(color);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === hueVariationCommand) {
			const variation = Tools.toId(targets[0]) as HueVariation | '';
			if (variation === 'low') {
				this.lowVariation();
			} else if (variation === 'standard') {
				this.standardVariation();
			} else if (variation === 'high') {
				this.highVariation();
			} else {
				return "'" + variation + "' is not a valid hue variation.";
			}
		} else if (cmd === lightnessCommand) {
			const lightness = Tools.toId(targets[0]) as Lightness | '';
			if (lightness === 'low') {
				this.lowLightness();
			} else if (lightness === 'standard') {
				this.standardLightness();
			} else if (lightness === 'high') {
				this.highLightness();
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
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		const currentLowLightness = this.lightness === 'low';
		const currentStandardLightness = this.lightness === 'standard';
		const currentHighLightness = this.lightness === 'high';

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

		const currentLowHueVariation = this.hueVariation === 'low';
		const currentStandardHueVariation = this.hueVariation === 'standard';
		const currentHighHueVariation = this.hueVariation === 'high';

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

		return html;
	}
}