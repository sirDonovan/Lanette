import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IGameTextInputProps extends ITextInputProps {
	allowModes: boolean;
	allowVariants: boolean;
}

export class GameTextInput extends TextInput {
	componentId: string = 'game-text-input';

	declare props: IGameTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IGameTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);
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
				if (format.mode && !this.props.allowModes) {
					this.errors.push("Modes are not allowed.");
				} else if (format.variant && !this.props.allowVariants) {
					this.errors.push("Variants are not allowed.");
				} else {
					games.push(format.name);
				}
			}
		}

		this.currentOutput = games.join(',');
	}
}