import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export class FormatTextInput extends TextInput {
	componentId: string = 'format-text-input';

	declare props: ITextInputProps;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const parts = input.split(',');
		const games: string[] = [];
		for (const part of parts) {
			const format = Dex.getFormat(part);
			if (!format) {
				this.errors.push("'" + part + "' is not a valid format.");
			} else {
				games.push(format.name);
			}
		}

		this.currentOutput = games.join(',');
	}
}