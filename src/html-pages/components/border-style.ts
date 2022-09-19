import type { ICustomBorder } from "../../types/storage";
import type { BorderType } from "../../types/tools";
import { ColorPicker } from "./color-picker";
import type { IColorPick } from "./color-picker";
import { ComponentBase } from "./component-base";
import type { IComponentProps } from "./component-base";
import type { HtmlPageBase } from "../html-page-base";

export interface IBorderStyleProps extends IComponentProps {
	currentBorder: ICustomBorder | undefined;
	minRadius: number;
	maxRadius: number;
	minSize: number;
	maxSize: number;
	onClearColor: (dontRender: boolean | undefined) => void;
	onPickColor: (color: IColorPick, dontRender: boolean | undefined) => void;
	onClearRadius: () => void;
	onPickRadius: (radius: number) => void;
	onClearSize: () => void;
	onPickSize: (size: number) => void;
	onClearType: () => void;
	onPickType: (type: BorderType) => void;
}

const defaultValue = 'default';
const setColorCommand = 'setcolor';
const setRadiusCommand = 'setradius';
const setSizeCommand = 'setsize';
const setTypeCommand = 'settype';

export class BorderStyle extends ComponentBase<IBorderStyleProps> {
	componentId: string = 'border-style';

	borderTypes: BorderType[];
	colorPicker: ColorPicker;
	radius: number | undefined;
	size: number | undefined;
	type: BorderType | undefined;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IBorderStyleProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.colorPicker = new ColorPicker(htmlPage, this.commandPrefix, setColorCommand, {
			currentPick: props.currentBorder && typeof props.currentBorder.color === 'string' ? props.currentBorder.color : undefined,
			currentPickObject: props.currentBorder && props.currentBorder.color && typeof props.currentBorder.color !== 'string' ?
				props.currentBorder.color : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickColorHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickColorLightness(dontRender),
			onClear: (index, dontRender) => this.clearColor(dontRender),
			onPick: (index, color, dontRender) => this.setColor(color, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.components = [this.colorPicker];

		this.radius = props.currentBorder ? props.currentBorder.radius : undefined;
		this.size = props.currentBorder ? props.currentBorder.size : undefined;
		this.type = props.currentBorder ? props.currentBorder.type : undefined;

		const borderTypes = Tools.getBorderTypes();
		borderTypes.splice(borderTypes.indexOf('solid'), 1);

		this.borderTypes = borderTypes;
	}

	pickColorHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickColorLightness(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearColor(dontRender?: boolean): void {
		this.props.onClearColor(dontRender);
	}

	setColor(color: IColorPick, dontRender?: boolean): void {
		this.props.onPickColor(color, dontRender);
	}

	clearRadius(): void {
		if (this.radius === undefined) return;

		this.radius = undefined;

		this.props.onClearRadius();
	}

	setRadius(radius: number): void {
		if (this.radius === radius) return;

		this.radius = radius;

		this.props.onPickRadius(radius);
	}

	clearSize(): void {
		if (this.size === undefined) return;

		this.size = undefined;

		this.props.onClearSize();
	}

	setSize(size: number): void {
		if (this.size === size) return;

		this.size = size;

		this.props.onPickSize(size);
	}

	clearType(): void {
		if (this.type === undefined) return;

		this.type = undefined;

		this.props.onClearType();
	}

	setType(type: BorderType): void {
		if (this.type === type) return;

		this.type = type;

		this.props.onPickType(type);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === setRadiusCommand) {
			const radius = targets[0].trim();
			if (radius === defaultValue) {
				this.clearRadius();
			} else {
				const value = parseInt(radius);
				if (isNaN(value) || value < this.props.minRadius || value > this.props.maxRadius) {
					return "'" + radius + "' is not a valid radius.";
				}
				this.setRadius(value);
			}
		} else if (cmd === setSizeCommand) {
			const size = targets[0].trim();
			if (size === defaultValue) {
				this.clearSize();
			} else {
				const value = parseInt(size);
				if (isNaN(value) || value < this.props.minSize || value > this.props.maxSize) {
					return "'" + size + "' is not a valid size.";
				}
				this.setSize(value);
			}
		} else if (cmd === setTypeCommand) {
			const type = targets[0].trim();
			if (type === defaultValue) {
				this.clearType();
			} else {
				if (!this.borderTypes.includes(type as BorderType)) {
					return "'" + type + "' is not a valid type.";
				}
				this.setType(type as BorderType);
			}
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		let html = "";
		if (this.props.minRadius && this.props.maxRadius) {
			html += "Radius:&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + setRadiusCommand + ", " + defaultValue, "Default",
				{selectedAndDisabled: !this.radius});
			for (let i = 2; i <= 10; i++) {
				if (i < this.props.minRadius) continue;
				if (i > this.props.maxRadius) break;
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setRadiusCommand + ", " + i, i + "px",
					{selectedAndDisabled: this.radius === i});
			}

			if (this.props.maxRadius >= 15) {
				for (let i = 15; i <= this.props.maxRadius; i += 5) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setRadiusCommand + ", " + i, i + "px",
						{selectedAndDisabled: this.radius === i});
				}
			}

			html += "<br /><br />";
		}

		if (this.props.minSize && this.props.maxSize) {
			html += "Size:&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + setSizeCommand + ", " + defaultValue, "Default",
				{selectedAndDisabled: !this.size});
			for (let i = 1; i <= this.props.maxSize; i++) {
				if (i < this.props.minSize) continue;
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setSizeCommand + ", " + i, i + "px",
					{selectedAndDisabled: this.size === i});
			}

			html += "<br /><br />";
		}

		html += "Type:&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + setTypeCommand + ", " + defaultValue, "Default",
			{selectedAndDisabled: !this.type});
		for (const borderType of this.borderTypes) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTypeCommand + ", " + borderType, borderType,
				{selectedAndDisabled: this.type === borderType});
		}

		html += "<br /><br />";
		html += "Color:";
		html += "<br /><br />";
		html += this.colorPicker.render();

		return html;
	}
}