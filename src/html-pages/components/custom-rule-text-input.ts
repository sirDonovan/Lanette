import type { Room } from "../../rooms";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export class CustomRuleTextInput extends TextInput {
	componentId: string = 'custom-rule-text-input';

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const parts = Dex.resolveCustomRuleAliases(input.split(','));
		const validRules: string[] = [];
		const invalidRules: string[] = [];
		for (const part of parts) {
			try {
				const validated = Dex.validateRule(part);
				if (typeof validated !== 'string') throw new Error("Complex bans are not currently supported.");

				validRules.push(validated);
			} catch (e) {
				this.errors.push(part + " error: " + (e as Error).message);
				invalidRules.push(part);
			}
		}

		this.currentOutput = validRules.join(',');
		this.currentInput = invalidRules.join(', ');
	}
}