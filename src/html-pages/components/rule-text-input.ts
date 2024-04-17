import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IRulePick {
	rule: string;
}

export type RuleChoices = (IRulePick | undefined)[];

export interface IRuleTextInputProps extends ITextInputProps<RuleChoices> {
	ruleList?: string[];
	maxRules?: number;
	minRules?: number;
}

export class RuleTextInput extends TextInput<RuleChoices> {
	componentId: string = 'rule-text-input';

	ruleList: string[];

	declare props: IRuleTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IRuleTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.ruleList = props.ruleList || Dex.getRulesList().map(x => x.name);
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const ruleChoices: RuleChoices = [];

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i].trim();
			const id = Tools.toId(target);
			if (!id) continue;

			const rule = Dex.getFormat(target);
			if (!rule || rule.effectType === 'Format') {
				this.errors.push(CommandParser.getErrorText(['invalidRule', id]));
				continue;
			}

			if (!this.ruleList.includes(rule.name)) {
				this.errors.push(rule.name + " cannot be used.");
				continue;
			}

			targets[i] = rule.name;

			ruleChoices.push({rule: rule.name});
		}

		const inputAmount = ruleChoices.length;
		if (!inputAmount || (this.props.minRules && inputAmount < this.props.minRules)) {
			const min = this.props.minRules || 1;
			this.errors.push("You must specify at least " + min + " valid rule" + (min > 1 ? "s" : "") + ".");
		}

		if (this.props.maxRules && inputAmount > this.props.maxRules) {
			this.errors.push("You may only specify up to " + this.props.maxRules + " rule" + (this.props.maxRules > 1 ? "s" : "") + ".");
		}

		this.currentInput = targets.join(', ');
		this.currentOutput = ruleChoices;
	}
}