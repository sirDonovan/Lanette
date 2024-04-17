import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IItemPick {
	item: string;
}

export type ItemChoices = (IItemPick | undefined)[];

export interface IItemTextInputProps extends ITextInputProps<ItemChoices> {
	itemList?: string[];
	maxItems?: number;
	minItems?: number;
}

export class ItemTextInput extends TextInput<ItemChoices> {
	componentId: string = 'ability-text-input';

	itemList: string[];

	declare props: IItemTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IItemTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.itemList = props.itemList || Dex.getItemsList().map(x => x.name);
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const itemChoices: ItemChoices = [];

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i].trim();
			const id = Tools.toId(target);
			if (!id) continue;

			const item = Dex.getItem(target);
			if (!item) {
				this.errors.push(CommandParser.getErrorText(['invalidItem', id]));
				continue;
			}

			if (!this.itemList.includes(item.name)) {
				this.errors.push(item.name + " cannot be used.");
				continue;
			}

			targets[i] = item.name;

			itemChoices.push({item: item.name});
		}

		const inputAmount = itemChoices.length;
		if (!inputAmount || (this.props.minItems && inputAmount < this.props.minItems)) {
			const min = this.props.minItems || 1;
			this.errors.push("You must specify at least " + min + " valid item" + (min > 1 ? "s" : "") + ".");
		}

		if (this.props.maxItems && inputAmount > this.props.maxItems) {
			this.errors.push("You may only specify up to " + this.props.maxItems + " item" + (this.props.maxItems > 1 ? "s" : "") + ".");
		}

		this.currentInput = targets.join(', ');
		this.currentOutput = itemChoices;
	}
}