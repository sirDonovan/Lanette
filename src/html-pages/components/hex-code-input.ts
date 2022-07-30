import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export class HexCodeInput extends TextInput {
	componentId: string = 'hex-code-input';

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const validated = Tools.validateHexCode(input);
		if (!validated) {
			this.errors.push("The specified hex code is invalid.");
		} else {
			this.currentOutput = validated;
		}
	}
}