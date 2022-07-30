import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IFormatTextInputProps extends ITextInputProps {
	maxFormats?: number;
	minFormats?: number;
	nameWithoutGen?: boolean;
	customRules?: boolean;
}

export class FormatTextInput extends TextInput {
	componentId: string = 'format-text-input';

	declare props: IFormatTextInputProps;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: IFormatTextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const parts = this.props.customRules && this.props.maxFormats === 1 ? [input] : input.split(',');

		const formats: string[] = [];
		for (const part of parts) {
			const format = Tournaments.getFormat(part, this.room);
			if (!format || format.effectType !== 'Format') {
				this.errors.push("'" + part + "' is not a valid format.");
			} else {
				formats.push(this.props.customRules ? format.inputTarget : this.props.nameWithoutGen ? format.nameWithoutGen : format.name);
			}
		}

		const inputAmount = formats.length;
		if (!inputAmount || (this.props.minFormats && inputAmount < this.props.minFormats)) {
			this.errors.push("You must specify at least " + (this.props.minFormats || 1) + " valid format.");
		}

		if (this.props.maxFormats && inputAmount > this.props.maxFormats) {
			this.errors.push("You may only specify " + this.props.maxFormats + " format" + (this.props.maxFormats > 1 ? "s" : "") + ".");
		}

		this.currentOutput = formats.join(',');
	}
}