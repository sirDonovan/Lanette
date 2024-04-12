import type { BorderType, HexCode, IHexCodeData, TextColorHex } from "../../types/tools";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";
import { HexCodeInput } from "./hex-code-input";
import type { HtmlPageBase } from "../html-page-base";
import { PokemonTextInput } from "./pokemon-text-input";
import { PokemonChoices } from "./pokemon-picker-base";

export type HueVariation = 'lowvariation' | 'standardvariation' | 'highvariation' | 'maxvariation';
export type Lightness = 'shade' | 'lowlightness' | 'standardlightness' | 'highlightness' | 'tint';

type ColorPickerView = 'input' | 'preselected';
export interface IColorPick {
	hexCode: HexCode;
	hueVariation: HueVariation;
	lightness: Lightness;
	gradient?: string;
	secondaryHexCode?: HexCode;
	textColor?: TextColorHex;
}

interface IColorPickerProps extends IPickerProps<IColorPick> {
	name: string;

	// only used for previews
	border?: boolean;
	borderRadius?: number;
	borderSize?: number;
	borderType?: BorderType;
	button?: boolean;

	autoSubmitCustomInput?: boolean;
	currentPickObject?: IHexCodeData;
	defaultView?: ColorPickerView;
	hidePreview?: boolean;
	onlyCustomPrimary?: boolean;
	pokemon?: string;
	random?: boolean;
	onPickHueVariation: (pickerIndex: number, pick: HueVariation, dontRender: boolean | undefined) => void;
	onPickLightness: (pickerIndex: number, pick: Lightness, dontRender: boolean | undefined) => void;
}

const colorsPerRow = 15;
const rowsPerPage = 5;
const pagesLabel = "Colors";
const customHexCodeKey = 'customHexCode';

const lowVariationIncrement = 30;
const standardVariationIncrement = 15;
const highVariationIncrement = 5;
const maxVariationIncrement = 1;

const hueVariationCommand = 'huevariation';
const lowVariation = 'lowvariation';
const standardVariation = 'standardvariation';
const highVariation = 'highvariation';
const maxVariation = 'maxvariation';

const lightnessCommand = 'lightness';
const shade = 'shade';
const lowLightness = 'lowlightness';
const standardLightness = 'standardlightness';
const highLightness = 'highlightness';
const tint = 'tint';

const huesListCommand = 'hueslist';
const chooseInputCommand = 'chooseinput';
const choosePreSelectedCommand = 'choosepreselected';
const customPrimaryCommand = 'setcustomprimarycode';
const customSecondaryCommand = 'setcustomsecondarycode';
const setPokemonCommand = 'setpokemon';
const clearCustomSecondaryCommand = 'clearcustomsecondarycode';
const customPrimaryHexInputCommand = 'customprimaryinput';
const customSecondaryHexInputCommand = 'customsecondaryinput';
const submitCustomHexCodeCommand = 'submitcustomhexcode';
const clearCustomHexCodeCommand = 'clearcustomhexcode';
const chooseBlackTextColorCommand = 'chooseblacktextcolor';
const chooseWhiteTextColorCommand = 'choosewhitetextcolor';
const toggleShinyPokemonCommand = 'toggleshinypokemon';
const copySourceCommand = 'copysource';

export class ColorPicker extends PickerBase<IColorPick, IColorPickerProps> {
	static shades: HexCode[] = [];
	static lowLightnessLowVariation: HexCode[] = [];
	static lowLightnessStandardVariation: HexCode[] = [];
	static lowLightnessHighVariation: HexCode[] = [];
	static lowLightnessMaxVariation: HexCode[] = [];
	static standardLightnessLowVariation: HexCode[] = [];
	static standardLightnessStandardVariation: HexCode[] = [];
	static standardLightnessHighVariation: HexCode[] = [];
	static standardLightnessMaxVariation: HexCode[] = [];
	static highLightnessLowVariation: HexCode[] = [];
	static highLightnessStandardVariation: HexCode[] = [];
	static highLightnessHighVariation: HexCode[] = [];
	static highLightnessMaxVariation: HexCode[] = [];
	static tints: HexCode[] = [];
	static ColorPickerLoaded: boolean = false;

	componentId: string = 'color-picker';
	customPrimaryColor: HexCode | undefined;
	customSecondaryColor: HexCode | undefined;
	customTextColor: TextColorHex = '#000000';
	initializedPreSelected: boolean = false;
	pokemon: string | undefined;
	shinyPokemon: boolean = false;

	// only used for previews
	borderRadius: number | undefined;
	borderSize: number | undefined;
	borderType: BorderType | undefined;

	lightness: Lightness;
	hueVariation: HueVariation;

	shadePagination!: Pagination;
	lowLightnessLowVariationPagination!: Pagination;
	lowLightnessStandardVariationPagination!: Pagination;
	lowLightnessHighVariationPagination!: Pagination;
	lowLightnessMaxVariationPagination!: Pagination;
	standardLightnessLowVariationPagination!: Pagination;
	standardLightnessStandardVariationPagination!: Pagination;
	standardLightnessHighVariationPagination!: Pagination;
	standardLightnessMaxVariationPagination!: Pagination;
	highLightnessLowVariationPagination!: Pagination;
	highLightnessStandardVariationPagination!: Pagination;
	highLightnessHighVariationPagination!: Pagination;
	highLightnessMaxVariationPagination!: Pagination;
	tintPagination!: Pagination;
	customPrimaryColorInput: HexCodeInput;
	customSecondaryColorInput: HexCodeInput;
	pokemonPicker: PokemonTextInput;
	onlyCustomPrimary: boolean;

	currentView: ColorPickerView;
	paginations: Pagination[] = [];
	copySources: ColorPicker[] = [];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IColorPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		ColorPicker.loadData();

		this.borderRadius = this.props.borderRadius;
		this.borderSize = this.props.borderSize;
		this.borderType = this.props.borderType;
		this.pokemon = this.props.pokemon;

		this.currentView = this.props.defaultView || 'input';
		this.onlyCustomPrimary = this.props.onlyCustomPrimary || this.props.border ? true : false;

		if (this.props.currentPickObject) {
			if (this.props.currentPickObject.color) {
				this.customPrimaryColor = this.props.currentPickObject.color;
			}

			if (this.props.currentPickObject.secondaryColor && !this.onlyCustomPrimary) {
				this.customSecondaryColor = this.props.currentPickObject.secondaryColor as HexCode;
			}

			if (this.props.currentPickObject.textColor) {
				this.customTextColor = this.props.currentPickObject.textColor;
			}

			this.updateCustomColors();
		}

		if (this.currentPicks.length && this.currentPicks[0] in Tools.hexCodes) {
			const hexCode = this.currentPicks[0] as HexCode;

			if (Tools.hexCodes[hexCode]!.category === 'shade') {
				this.lightness = 'shade';
				this.hueVariation = 'standardvariation';
			} else if (Tools.hexCodes[hexCode]!.category === 'tint') {
				this.lightness = 'tint';
				this.hueVariation = 'standardvariation';
			} else if (Tools.hexCodes[hexCode]!.category === 'light' || Tools.hexCodes[hexCode]!.category === 'light-brown' ||
				Tools.hexCodes[hexCode]!.category === 'light-gray') {
				this.lightness = 'highlightness';
				if (ColorPicker.highLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.highLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else if (ColorPicker.highLightnessHighVariation.includes(hexCode)) {
					this.hueVariation = 'highvariation';
				} else {
					this.hueVariation = 'maxvariation';
				}
			} else if (Tools.hexCodes[hexCode]!.category === 'dark' || Tools.hexCodes[hexCode]!.category === 'dark-brown' ||
				Tools.hexCodes[hexCode]!.category === 'dark-gray') {
				this.lightness = 'lowlightness';
				if (ColorPicker.lowLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.lowLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else if (ColorPicker.lowLightnessHighVariation.includes(hexCode)) {
					this.hueVariation = 'highvariation';
				} else {
					this.hueVariation = 'maxvariation';
				}
			} else {
				this.lightness = 'standardlightness';
				if (ColorPicker.standardLightnessLowVariation.includes(hexCode)) {
					this.hueVariation = 'lowvariation';
				} else if (ColorPicker.standardLightnessStandardVariation.includes(hexCode)) {
					this.hueVariation = 'standardvariation';
				} else if (ColorPicker.standardLightnessHighVariation.includes(hexCode)) {
					this.hueVariation = 'highvariation';
				} else {
					this.hueVariation = 'maxvariation';
				}
			}
		} else {
			this.currentPicks = [];
			this.noPickElement.html = this.renderNoPickElement();
			this.noPickElement.selected = true;
			this.lightness = 'lowlightness';
			this.hueVariation = 'lowvariation';
		}

		this.customPrimaryColorInput = new HexCodeInput(htmlPage, this.commandPrefix, customPrimaryHexInputCommand, {
			currentInput: this.customPrimaryColor,
			label: "Manual entry",
			name: "Primary manual",
			hideClearButton: true,
			onSubmit: (output) => this.submitCustomPrimaryColor(output as HexCode),
			reRender: () => this.props.reRender(),
		});

		this.customSecondaryColorInput = new HexCodeInput(htmlPage, this.commandPrefix, customSecondaryHexInputCommand, {
			currentInput: this.customSecondaryColor,
			label: "Manual entry",
			name: "Secondary manual",
			onClear: () => this.clearCustomSecondaryColor(),
			onSubmit: (output) => this.submitCustomSecondaryColor(output as HexCode),
			reRender: () => this.props.reRender(),
		});

		this.pokemonPicker = new PokemonTextInput(htmlPage, this.commandPrefix, setPokemonCommand, {
			currentInput: this.props.pokemon,
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: 1,
			name: "Pokemon",
			placeholder: "Enter a Pokemon",
			clearText: "Clear",
			submitText: "Update",
			onClear: () => this.clearPokemon(),
			onSubmit: (output) => this.selectPokemon(output),
			reRender: () => this.props.reRender(),
		});

		this.components = [this.customPrimaryColorInput, this.customSecondaryColorInput, this.pokemonPicker];

		if (this.currentView === 'preselected') {
			this.initializePreSelected();
			this.toggleActivePagination();
		}
	}

	static loadData(): void {
		if (this.ColorPickerLoaded) return;

		const keys = Object.keys(Tools.hexCodes) as HexCode[];
		const tintKeys: HexCode[] = [];
		const lightKeys: HexCode[] = [];
		const standardKeys: HexCode[] = [];
		const darkKeys: HexCode[] = [];
		const shadeKeys: HexCode[] = [];

		let brown: HexCode;
		let white: HexCode;
		let gray: HexCode;
		let black: HexCode;
		let lightBrown: HexCode;
		let lightGray: HexCode;
		let darkBrown: HexCode;
		let darkGray: HexCode;

		for (const key of keys) {
			if (Tools.hexCodes[key]!.category === 'tint') {
				tintKeys.push(key);
			} else if (Tools.hexCodes[key]!.category === 'light') {
				lightKeys.push(key);
			} else if (Tools.hexCodes[key]!.category === 'dark') {
				darkKeys.push(key);
			} else if (Tools.hexCodes[key]!.category === 'shade') {
				shadeKeys.push(key);
			} else if (Tools.hexCodes[key]!.category === 'brown') {
				brown = key;
			} else if (Tools.hexCodes[key]!.category === 'white') {
				white = key;
			} else if (Tools.hexCodes[key]!.category === 'gray') {
				gray = key;
			} else if (Tools.hexCodes[key]!.category === 'black') {
				black = key;
			} else if (Tools.hexCodes[key]!.category === 'light-brown') {
				lightBrown = key;
			} else if (Tools.hexCodes[key]!.category === 'light-gray') {
				lightGray = key;
			} else if (Tools.hexCodes[key]!.category === 'dark-brown') {
				darkBrown = key;
			} else if (Tools.hexCodes[key]!.category === 'dark-gray') {
				darkGray = key;
			} else {
				standardKeys.push(key);
			}
		}

		this.shades = shadeKeys;

		for (let i = 0; i < darkKeys.length; i++) {
			const color = darkKeys[i];
			if (i % lowVariationIncrement === 0) this.lowLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.lowLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.lowLightnessHighVariation.push(color);
			if (i % maxVariationIncrement === 0) this.lowLightnessMaxVariation.push(color);
		}

		const otherLow = [darkBrown!, darkGray!, black!];
		this.lowLightnessLowVariation = this.lowLightnessLowVariation.concat(otherLow);
		this.lowLightnessStandardVariation = this.lowLightnessStandardVariation.concat(otherLow);
		this.lowLightnessHighVariation = this.lowLightnessHighVariation.concat(otherLow);
		this.lowLightnessMaxVariation = this.lowLightnessMaxVariation.concat(otherLow);

		for (let i = 0; i < standardKeys.length; i++) {
			const color = standardKeys[i];
			if (i % lowVariationIncrement === 0) this.standardLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.standardLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.standardLightnessHighVariation.push(color);
			if (i % maxVariationIncrement === 0) this.standardLightnessMaxVariation.push(color);
		}

		const otherStandard = [brown!, white!, gray!, black!];
		this.standardLightnessLowVariation = this.standardLightnessLowVariation.concat(otherStandard);
		this.standardLightnessStandardVariation = this.standardLightnessStandardVariation.concat(otherStandard);
		this.standardLightnessHighVariation = this.standardLightnessHighVariation.concat(otherStandard);
		this.standardLightnessMaxVariation = this.standardLightnessMaxVariation.concat(otherStandard);

		for (let i = 0; i < lightKeys.length; i++) {
			const color = lightKeys[i];
			if (i % lowVariationIncrement === 0) this.highLightnessLowVariation.push(color);
			if (i % standardVariationIncrement === 0) this.highLightnessStandardVariation.push(color);
			if (i % highVariationIncrement === 0) this.highLightnessHighVariation.push(color);
			if (i % maxVariationIncrement === 0) this.highLightnessMaxVariation.push(color);
		}

		const otherHigh = [lightBrown!, white!, lightGray!];
		this.highLightnessLowVariation = this.highLightnessLowVariation.concat(otherHigh);
		this.highLightnessStandardVariation = this.highLightnessStandardVariation.concat(otherHigh);
		this.highLightnessHighVariation = this.highLightnessHighVariation.concat(otherHigh);
		this.highLightnessMaxVariation = this.highLightnessMaxVariation.concat(otherHigh);

		this.tints = tintKeys;

		this.ColorPickerLoaded = true;
	}

	initializePreSelected(): void {
		if (this.initializedPreSelected) return;

		for (const hexCode of ColorPicker.shades) {
			this.choices[hexCode] = {hexCode, lightness: 'shade', hueVariation: 'standardvariation'};
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

		for (const hexCode of ColorPicker.lowLightnessMaxVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'lowlightness', hueVariation: 'maxvariation'};
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

		for (const hexCode of ColorPicker.standardLightnessMaxVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'standardlightness', hueVariation: 'maxvariation'};
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

		for (const hexCode of ColorPicker.highLightnessMaxVariation) {
			if (hexCode in this.choices) continue;
			this.choices[hexCode] = {hexCode, lightness: 'highlightness', hueVariation: 'maxvariation'};
		}

		for (const hexCode of ColorPicker.tints) {
			this.choices[hexCode] = {hexCode, lightness: 'tint', hueVariation: 'standardvariation'};
		}

		this.renderChoices();

		this.shadePagination = this.createColorPagination(ColorPicker.shades);
		this.lowLightnessLowVariationPagination = this.createColorPagination(ColorPicker.lowLightnessLowVariation);
		this.lowLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.lowLightnessStandardVariation);
		this.lowLightnessHighVariationPagination = this.createColorPagination(ColorPicker.lowLightnessHighVariation);
		this.lowLightnessMaxVariationPagination = this.createColorPagination(ColorPicker.lowLightnessMaxVariation);
		this.standardLightnessLowVariationPagination = this.createColorPagination(ColorPicker.standardLightnessLowVariation);
		this.standardLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.standardLightnessStandardVariation);
		this.standardLightnessHighVariationPagination = this.createColorPagination(ColorPicker.standardLightnessHighVariation);
		this.standardLightnessMaxVariationPagination = this.createColorPagination(ColorPicker.standardLightnessMaxVariation);
		this.highLightnessLowVariationPagination = this.createColorPagination(ColorPicker.highLightnessLowVariation);
		this.highLightnessStandardVariationPagination = this.createColorPagination(ColorPicker.highLightnessStandardVariation);
		this.highLightnessHighVariationPagination = this.createColorPagination(ColorPicker.highLightnessHighVariation);
		this.highLightnessMaxVariationPagination = this.createColorPagination(ColorPicker.highLightnessMaxVariation);
		this.tintPagination = this.createColorPagination(ColorPicker.tints);

		this.paginations = [this.shadePagination, this.lowLightnessLowVariationPagination, this.lowLightnessStandardVariationPagination,
			this.lowLightnessHighVariationPagination, this.lowLightnessMaxVariationPagination,
			this.standardLightnessLowVariationPagination, this.standardLightnessStandardVariationPagination,
			this.standardLightnessHighVariationPagination, this.standardLightnessMaxVariationPagination,
			this.highLightnessLowVariationPagination, this.highLightnessStandardVariationPagination,
			this.highLightnessHighVariationPagination, this.highLightnessMaxVariationPagination, this.tintPagination,
		];

		this.components = this.components.concat(this.paginations);

		this.initializedPreSelected = true;
	}

	registerCopySources(copySources: readonly ColorPicker[]): void {
		this.copySources = [];
		for (const source of copySources) {
			if (source === this) continue;
			this.copySources.push(source);
		}
	}

	copySource(source: ColorPicker): void {
		this.customPrimaryColor = source.customPrimaryColor;
		this.customTextColor = source.customTextColor;

		if (!this.onlyCustomPrimary) this.customSecondaryColor = source.customSecondaryColor;

		if (this.customPrimaryColor) {
			this.customPrimaryColorInput.parentSetInput(this.customPrimaryColor);
		} else {
			this.customPrimaryColorInput.parentClearInput();
		}

		if (this.customSecondaryColor) {
			this.customSecondaryColorInput.parentSetInput(this.customSecondaryColor);
		} else {
			this.customSecondaryColorInput.parentClearInput();
		}

		this.updateCustomColors();

		this.currentPicks = source.currentPicks.slice();
		this.renderChoices();

		if (this.customPrimaryColor) {
			if (this.currentPicks[0] === customHexCodeKey) this.currentPicks = [];
			this.parentPick(customHexCodeKey);
		} else if (this.currentPicks.length) {
			this.parentPick(this.currentPicks[0]);
		} else {
			this.currentPicks = [customHexCodeKey];
			this.parentClear();
		}
	}

	createColorPagination(colors: HexCode[]): Pagination {
		const elements: IPageElement[] = [this.noPickElement];

		for (const color of colors) {
			elements.push(this.choiceElements[color]);
		}

		return new Pagination(this.htmlPage, this.commandPrefix, huesListCommand, {
			elements,
			elementsPerRow: colorsPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
	}

	getChoiceButtonHtml(choice: IColorPick): string {
		if (!(choice.hexCode in Tools.hexCodes)) return "";

		const currentColor = this.currentPicks[0] === choice.hexCode;

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
		const inputView = this.currentView === 'input';
		this.customPrimaryColorInput.active = inputView;
		this.customSecondaryColorInput.active = inputView;
		this.pokemonPicker.active = inputView;

		if (!this.initializedPreSelected) return;

		const preSelectedView = this.currentView === 'preselected';
		this.shadePagination.active = preSelectedView && this.lightness === 'shade';
		this.lowLightnessLowVariationPagination.active = preSelectedView && this.lightness === 'lowlightness' &&
			this.hueVariation === 'lowvariation';
		this.lowLightnessStandardVariationPagination.active = preSelectedView && this.lightness === 'lowlightness' &&
			this.hueVariation === 'standardvariation';
		this.lowLightnessHighVariationPagination.active = preSelectedView && this.lightness === 'lowlightness' &&
			this.hueVariation === 'highvariation';
		this.lowLightnessMaxVariationPagination.active = preSelectedView && this.lightness === 'lowlightness' &&
			this.hueVariation === 'maxvariation';
		this.standardLightnessLowVariationPagination.active = preSelectedView && this.lightness === 'standardlightness' &&
			this.hueVariation === 'lowvariation';
		this.standardLightnessStandardVariationPagination.active = preSelectedView && this.lightness === 'standardlightness' &&
			this.hueVariation === 'standardvariation';
		this.standardLightnessHighVariationPagination.active = preSelectedView && this.lightness === 'standardlightness' &&
			this.hueVariation === 'highvariation';
		this.standardLightnessMaxVariationPagination.active = preSelectedView && this.lightness === 'standardlightness' &&
			this.hueVariation === 'maxvariation';
		this.highLightnessLowVariationPagination.active = preSelectedView && this.lightness === 'highlightness' &&
			this.hueVariation === 'lowvariation';
		this.highLightnessStandardVariationPagination.active = preSelectedView && this.lightness === 'highlightness' &&
			this.hueVariation === 'standardvariation';
		this.highLightnessHighVariationPagination.active = preSelectedView && this.lightness === 'highlightness' &&
			this.hueVariation === 'highvariation';
		this.highLightnessMaxVariationPagination.active = preSelectedView && this.lightness === 'highlightness' &&
			this.hueVariation === 'maxvariation';
		this.tintPagination.active = preSelectedView && this.lightness === 'tint';

		if (preSelectedView && autoSelectPage) {
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
		while (color === this.currentPicks[0]) {
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

	updateCustomColors(): void {
		if (!this.customPrimaryColor) return;

		if (!(customHexCodeKey in this.choices)) {
			this.choices[customHexCodeKey] = {
				hexCode: this.customPrimaryColor,
				hueVariation: 'standardvariation',
				lightness: 'standardlightness',
			};
			this.choiceElements[customHexCodeKey] = {html: ""};
		}

		this.choices[customHexCodeKey].hexCode = this.customPrimaryColor;
		this.choices[customHexCodeKey].secondaryHexCode = this.customSecondaryColor;
		this.choices[customHexCodeKey].gradient = Tools.getHexCodeGradient(this.customPrimaryColor, this.customSecondaryColor);
	}

	submitCustomPrimaryColor(output: HexCode, dontRender?: boolean): void {
		this.customPrimaryColor = output;
		this.updateCustomColors();

		if (!dontRender) this.props.reRender();
	}

	clearCustomSecondaryColor(dontRender?: boolean): void {
		this.customSecondaryColor = undefined;
		this.updateCustomColors();

		if (!dontRender) this.props.reRender();
	}

	submitCustomSecondaryColor(output: HexCode, dontRender?: boolean): void {
		this.customSecondaryColor = output;
		this.updateCustomColors();

		if (!dontRender) this.props.reRender();
	}

	selectPokemon(pokemon: PokemonChoices): void {
		this.pokemon = pokemon[0]!.pokemon;

		this.props.reRender();
	}

	clearPokemon(): void {
		this.pokemon = undefined;

		this.props.reRender();
	}

	parentClearBorderRadius(): void {
		this.borderRadius = undefined;
	}

	parentSetBorderRadius(radius: number): void {
		this.borderRadius = radius;
	}

	parentClearBorderSize(): void {
		this.borderSize = undefined;
	}

	parentSetBorderSize(size: number): void {
		this.borderSize = size;
	}

	parentClearBorderType(): void {
		this.borderType = undefined;
	}

	parentSetBorderType(type: BorderType): void {
		this.borderType = type;
	}

	parentSetPokemon(pokemon: string): void {
		this.pokemon = pokemon;
	}

	pickCustomColor(): void {
		if (!(customHexCodeKey in this.choices)) return;

		if (this.currentPicks[0] === customHexCodeKey) this.currentPicks = [];
		this.pick(customHexCodeKey);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === chooseInputCommand) {
			if (this.currentView === 'input') return;

			this.currentView = 'input';
			this.toggleActivePagination();
			this.props.reRender();
		} else if (cmd === choosePreSelectedCommand) {
			if (this.currentView === 'preselected') return;

			this.currentView = 'preselected';
			this.initializePreSelected();
			this.toggleActivePagination();
			this.props.reRender();
		} else if (cmd === customPrimaryCommand) {
			const validated = Tools.validateHexCode(targets[0].trim());
			if (!validated) {
				return "The specified hex code is invalid.";
			}

			this.customPrimaryColorInput.parentSetInput(validated);
			this.submitCustomPrimaryColor(validated);

			if (this.props.autoSubmitCustomInput) this.pickCustomColor();
		} else if (cmd === customSecondaryCommand) {
			const validated = Tools.validateHexCode(targets[0].trim());
			if (!validated) {
				return "The specified hex code is invalid.";
			}

			this.customSecondaryColorInput.parentSetInput(validated);
			this.submitCustomSecondaryColor(validated);

			if (this.props.autoSubmitCustomInput) this.pickCustomColor();
		} else if (cmd === clearCustomSecondaryCommand) {
			if (!this.customSecondaryColor) return;

			this.customSecondaryColorInput.parentClearInput();
			this.clearCustomSecondaryColor();

			if (this.props.autoSubmitCustomInput) this.pickCustomColor();
		} else if (cmd === hueVariationCommand) {
			const variation = Tools.toId(targets[0]) as HueVariation | '';
			if (variation === lowVariation || variation === standardVariation || variation === highVariation ||
				variation === maxVariation) {
				this.pickHueVariation(variation);
			} else {
				return "'" + variation + "' is not a valid hue variation.";
			}
		} else if (cmd === lightnessCommand) {
			const lightness = Tools.toId(targets[0]) as Lightness | '';
			if (lightness === shade || lightness === lowLightness || lightness === standardLightness || lightness === highLightness ||
				lightness === tint) {
				this.pickLightness(lightness);
			} else {
				return "'" + lightness + "' is not a valid lightness.";
			}
		} else if (cmd === submitCustomHexCodeCommand) {
			this.pickCustomColor();
		} else if (cmd === clearCustomHexCodeCommand) {
			if (!this.customPrimaryColor) return;

			this.customPrimaryColor = undefined;
			this.customSecondaryColor = undefined;
			this.customPrimaryColorInput.parentClearInput();
			this.customSecondaryColorInput.parentClearInput();
			this.updateCustomColors();

			this.currentPicks = [customHexCodeKey];
			this.clear();
		} else if (cmd === chooseBlackTextColorCommand) {
			if (!(customHexCodeKey in this.choices) || this.customTextColor === '#000000') return;
			this.customTextColor = '#000000';
			this.choices[customHexCodeKey].textColor = this.customTextColor;

			this.props.reRender();
		} else if (cmd === chooseWhiteTextColorCommand) {
			if (!(customHexCodeKey in this.choices) || this.customTextColor === '#ffffff') return;
			this.customTextColor = '#ffffff';
			this.choices[customHexCodeKey].textColor = this.customTextColor;

			this.props.reRender();
		} else if (cmd === toggleShinyPokemonCommand) {
			this.shinyPokemon = !this.shinyPokemon;

			this.props.reRender();
		} else if (cmd === copySourceCommand) {
			if (!this.copySources.length) return;

			const index = parseInt(targets[0].trim());
			if (isNaN(index) || !this.copySources[index]) return;

			this.copySource(this.copySources[index]);
			this.props.reRender();
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		const currentViewInput = this.currentView === 'input';

		let html = "";
		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseInputCommand, "Custom input",
			{selectedAndDisabled: currentViewInput});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePreSelectedCommand, "Pre-selected colors",
			{selectedAndDisabled: !currentViewInput});
		html += "<br /><br />";

		if (currentViewInput) {
			html += this.renderInput();
		} else {
			html += this.renderPreSelected();
		}

		return html;
	}

	renderColorForm(type: 'primary' | 'secondary'): string {
		const primary = type === 'primary';
		const tagName = primary ? 'primarycolorpicker' : 'secondarycolorpicker';
		const currentColor = primary ? this.customPrimaryColor : this.customSecondaryColor;

		let html = "<form data-submitsend='/msgroom " + this.htmlPage.room.id + ", /botmsg " + Users.self.name + ", " +
			this.commandPrefix + ", " + (primary ? customPrimaryCommand : customSecondaryCommand) + ", {" + tagName + "}'>";
		html += "<input id='" + tagName + "' name='" + tagName + "' type='color'" +
			(currentColor ? " value='" + currentColor + "'" : "") + " />";
		html += "<label for='" + tagName + "'>" + (primary ? "Primary" : "Secondary") + "</label>"
		html += "&nbsp;<button class='button' type='submit'>Update</button>";
		html += "</form>";

		if (primary) {
			html += this.customPrimaryColorInput.render();
		} else {
			html += this.customSecondaryColorInput.render();
		}

		return html;
	}

	renderInput(): string {
		let html = "";
		if (!this.props.hidePreview) {
			html += "<center>";
			if (this.props.border) {
				const borderColor = this.customPrimaryColor ? {color: this.customPrimaryColor} as IHexCodeData : undefined;

				if (this.props.button) {
					const buttonStyle = Tools.getCustomButtonStyle(Tools.getWhiteHexCode(), borderColor, this.borderRadius,
						this.borderSize, this.borderType);
					html += "<div style='height: 48px;width: 300px'><br /><button class='button' style='" + buttonStyle + "'>Button " +
						"border preview</button></div>";
				} else {
					const span = Tools.getHexSpan(Tools.getWhiteHexCode(), borderColor, this.borderRadius, this.borderSize,
						this.borderType);
					html += "<div style='height: 48px;width: 300px'>" + span + "<br /><b>Border preview</b><br />&nbsp;" +
						(span ? "</span>" : "") + "</div>";
				}
			} else {
				if (this.props.button) {
					const customColor: IHexCodeData = {
						color: (this.customPrimaryColor || "") as HexCode,
						gradient: Tools.getHexCodeGradient(this.customPrimaryColor, this.customSecondaryColor) as HexCode,
						textColor: this.customTextColor,
					};

					html += "<div style='height: 48px;width: 300px'><br /><button class='button' style='" +
						Tools.getCustomButtonStyle(customColor) + "'>Button background preview</button></div>";
				} else {
					html += "<div style='color:#000000;background: " +
						Tools.getHexCodeGradient(this.customPrimaryColor, this.customSecondaryColor) + ";color: " +
						this.customTextColor + ";height: 48px;width: 300px'><br /><b>Background preview</b></div>";
				}
			}

			html += "</center>";
		}

		if (!this.props.autoSubmitCustomInput) {
			html += this.getQuietPmButton(this.commandPrefix + ", " + submitCustomHexCodeCommand, "Save custom color" +
				(this.customSecondaryColor ? "s" : ""), {disabled: !this.customPrimaryColor});
			html += " | " + this.getQuietPmButton(this.commandPrefix + ", " + clearCustomHexCodeCommand, "Clear custom color" +
				(this.customSecondaryColor ? "s" : ""), {disabled: !this.customPrimaryColor});
		}

		if (this.copySources.length) {
			const sources: string[] = [];
			for (let i = 0; i < this.copySources.length; i++) {
				sources.push(this.getQuietPmButton(this.commandPrefix + ", " + copySourceCommand + ", " + i,
					"Copy <b>" + this.copySources[i].props.name + "</b>"));
			}

			html += " | " + sources.join(" | ");
		}

		if (html) html += "<br /><br />";

		html += this.renderColorForm('primary');
		if (!this.onlyCustomPrimary) {
			html += "<br />";
			html += this.renderColorForm('secondary');
			html += "<br />";
			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseBlackTextColorCommand, "Black text color",
				{selectedAndDisabled: this.customTextColor === '#000000'});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseWhiteTextColorCommand, "White text color",
				{selectedAndDisabled: this.customTextColor === '#ffffff'});
		}

		html += "<br /><br />";
		html += "Select colors from a Pokemon" + this.htmlPage.getTooltip("Click the primary" +
			(!this.onlyCustomPrimary ? " or secondary" : "") + " box to access the eyedropper tool");
		html += this.pokemonPicker.render();
		html += this.getQuietPmButton(this.commandPrefix + ", " + toggleShinyPokemonCommand,
			(this.shinyPokemon ? "Regular" : "Shiny") + " Pokemon");

		const pokemon = Dex.getPokemon(this.pokemon || "");
		if (pokemon) {
			html += "<br /><br /><br /><br />";
			if (this.customPrimaryColor && !this.onlyCustomPrimary) html += "<br /><br /><br /><br />";

			const icon = Dex.getPokemonIcon(pokemon);
			if (icon) {
				html += icon;
				html += "&nbsp;";
			}

			const modelGenerations = Dex.getModelGenerations();
			for (const modelGeneration of modelGenerations) {
				if (!Dex.hasModelData(pokemon, modelGeneration)) continue;

				const gif = Dex.getPokemonModel(pokemon, modelGeneration, undefined, this.shinyPokemon);
				if (gif) {
					html += gif;
					html += "&nbsp;";
				}
			}
		}

		return html;
	}

	renderPreSelected(): string {
		const currentShade = this.lightness === 'shade';
		const currentLowLightness = this.lightness === 'lowlightness';
		const currentStandardLightness = this.lightness === 'standardlightness';
		const currentHighLightness = this.lightness === 'highlightness';
		const currentTint = this.lightness === 'tint';

		let html = "Lightness:&nbsp;";
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + lightnessCommand + ", " + shade, "Shade",
			{selectedAndDisabled: currentShade});
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + lightnessCommand + ", " + lowLightness, "Low",
			{selectedAndDisabled: currentLowLightness});
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + lightnessCommand + ", " + standardLightness, "Standard",
			{selectedAndDisabled: currentStandardLightness});
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + lightnessCommand + ", " + highLightness, "High",
			{selectedAndDisabled: currentHighLightness});
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + lightnessCommand + ", " + tint, "Tint",
			{selectedAndDisabled: currentTint});
		html += "<br />";

		const currentLowHueVariation = this.hueVariation === 'lowvariation';
		const currentStandardHueVariation = this.hueVariation === 'standardvariation';
		const currentHighHueVariation = this.hueVariation === 'highvariation';
		const currentMaxHueVariation = this.hueVariation === 'maxvariation';

		if (!currentShade && !currentTint) {
			html += "Hue Variation:&nbsp;";
			html += "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + hueVariationCommand + ", " + lowVariation, "Low",
				{selectedAndDisabled: currentLowHueVariation});
			html += "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + hueVariationCommand + ", " + standardVariation, "Standard",
				{selectedAndDisabled: currentStandardHueVariation});
			html += "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + hueVariationCommand + ", " + highVariation, "High",
				{selectedAndDisabled: currentHighHueVariation});
			html += "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + hueVariationCommand + ", " + maxVariation, "Max",
				{selectedAndDisabled: currentMaxHueVariation});
			html += "<br />";
		}

		html += "<br />";

		if (this.props.random) {
			html += this.renderNoPickElement();
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.randomPickCommand, "Random Color");
		} else {
			if (currentShade) {
				html += this.shadePagination.render();
			} else if (currentLowLightness) {
				if (currentLowHueVariation) {
					html += this.lowLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.lowLightnessStandardVariationPagination.render();
				} else if (currentHighHueVariation) {
					html += this.lowLightnessHighVariationPagination.render();
				} else {
					html += this.lowLightnessMaxVariationPagination.render();
				}
			} else if (currentStandardLightness) {
				if (currentLowHueVariation) {
					html += this.standardLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.standardLightnessStandardVariationPagination.render();
				} else if (currentHighHueVariation) {
					html += this.standardLightnessHighVariationPagination.render();
				} else {
					html += this.standardLightnessMaxVariationPagination.render();
				}
			} else if (currentHighLightness) {
				if (currentLowHueVariation) {
					html += this.highLightnessLowVariationPagination.render();
				} else if (currentStandardHueVariation) {
					html += this.highLightnessStandardVariationPagination.render();
				} else if (currentHighHueVariation) {
					html += this.highLightnessHighVariationPagination.render();
				} else {
					html += this.highLightnessMaxVariationPagination.render();
				}
			} else {
				html += this.tintPagination.render();
			}
		}

		return html;
	}
}