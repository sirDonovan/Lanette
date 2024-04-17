import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IAbilityPick {
	ability: string;
}

export type AbilityChoices = (IAbilityPick | undefined)[];

export interface IAbilityTextInputProps extends ITextInputProps<AbilityChoices> {
	abilityList?: string[];
	maxAbilities?: number;
	minAbilities?: number;
}

export class AbilityTextInput extends TextInput<AbilityChoices> {
	componentId: string = 'ability-text-input';

	abilityList: string[];

	declare props: IAbilityTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IAbilityTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.abilityList = props.abilityList || Dex.getAbilitiesList().map(x => x.name);
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const abilityChoices: AbilityChoices = [];

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i].trim();
			const id = Tools.toId(target);
			if (!id) continue;

			const ability = Dex.getAbility(target);
			if (!ability) {
				this.errors.push(CommandParser.getErrorText(['invalidAbility', id]));
				continue;
			}

			if (!this.abilityList.includes(ability.name)) {
				this.errors.push(ability.name + " cannot be used.");
				continue;
			}

			targets[i] = ability.name;

			abilityChoices.push({ability: ability.name});
		}

		const inputAmount = abilityChoices.length;
		if (!inputAmount || (this.props.minAbilities && inputAmount < this.props.minAbilities)) {
			const min = this.props.minAbilities || 1;
			this.errors.push("You must specify at least " + min + " valid " + (min > 1 ? "abilities" : "ability") + ".");
		}

		if (this.props.maxAbilities && inputAmount > this.props.maxAbilities) {
			this.errors.push("You may only specify up to " + this.props.maxAbilities +
				(this.props.maxAbilities > 1 ? "abilities" : "ability") + ".");
		}

		this.currentInput = targets.join(', ');
		this.currentOutput = abilityChoices;
	}
}