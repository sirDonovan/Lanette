import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export class GameTextInput extends TextInput {
	componentId: string = 'game-text-input';

	declare props: ITextInputProps;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const parts = input.split(',');
		const games: string[] = [];
		for (const part of parts) {
			const format = Games.getFormat(part);
			if (Array.isArray(format)) {
				this.errors.push("'" + part + "' is not a valid game.");
			} else {
				games.push(format.name);
			}
		}

		this.currentOutput = games.join(',');
	}
}