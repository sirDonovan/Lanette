import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface ICustomRuleTextInputProps extends ITextInputProps {
	noComplexBans?: boolean;
}

export class CustomRuleTextInput extends TextInput {
	componentId: string = 'custom-rule-text-input';

	declare props: ICustomRuleTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ICustomRuleTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		input = input.trim();
		const parts = Dex.resolveCustomRuleAliases(input.split(','));
		const validRules: string[] = [];
		const invalidRules: string[] = [];
		for (const part of parts) {
			try {
				const validated = Dex.validateRule(part);
				if (typeof validated !== 'string') {
					if (this.props.noComplexBans) throw new Error("Complex bans are not supported.");
					let limit = "";
					let type: string;
					if (validated[3] === Infinity) {
						type = "+";
					} else {
						type = "-";
						if (validated[3]) {
							limit = " > " + validated[3];
						}
					}

					const complexSymbol = validated[0] === 'complexBan' ? ' + ' : ' ++ ';
					validRules.push(type + validated[4].join(complexSymbol) + limit);
				} else {
					validRules.push(validated);
				}
			} catch (e) {
				const format = Dex.getFormat(part);
				if (format) {
					validRules.push(format.name);
				} else {
					this.errors.push(part + " error: " + (e as Error).message);
					invalidRules.push(part);
				}
			}
		}

		this.currentOutput = validRules.join(',');
		this.currentInput = invalidRules.join(', ');
	}
}