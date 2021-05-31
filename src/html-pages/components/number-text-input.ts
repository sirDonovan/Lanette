import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface INumberTextInputProps extends ITextInputProps {
	max?: number;
	min?: number;
}

export class NumberTextInput extends TextInput {
	componentId: string = 'number-text-input';

	declare props: INumberTextInputProps;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: INumberTextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		const inputAmount = parseInt(input);
		if (isNaN(inputAmount)) {
			this.errors.push("You must specify a valid number.");
		} else {
			if (this.props.min && inputAmount < this.props.min) {
				this.errors.push("You must specify a number that is greater than or equal to " + this.props.min + ".");
			}

			if (this.props.max && inputAmount < this.props.max) {
				this.errors.push("You must specify a number that is less than or equal to " + this.props.max + ".");
			}
		}

		this.currentOutput = input;
	}
}