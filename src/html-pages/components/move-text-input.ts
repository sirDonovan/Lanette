import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

export interface IMovePick {
	move: string;
}

export type MoveChoices = (IMovePick | undefined)[];

export interface IMoveTextInputProps extends ITextInputProps<MoveChoices> {
	moveList?: string[];
	maxMoves?: number;
	minMoves?: number;
}

export class MoveTextInput extends TextInput<MoveChoices> {
	componentId: string = 'move-text-input';

	moveList: string[];

	declare props: IMoveTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IMoveTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.moveList = props.moveList || Dex.getMovesList().map(x => x.name);
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const moveChoices: MoveChoices = [];

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i].trim();
			const id = Tools.toId(target);
			if (!id) continue;

			const move = Dex.getMove(target);
			if (!move) {
				this.errors.push(CommandParser.getErrorText(['invalidMove', id]));
				continue;
			}

			if (!this.moveList.includes(move.name)) {
				this.errors.push(move.name + " cannot be used.");
				continue;
			}

			targets[i] = move.name;

			moveChoices.push({move: move.name});
		}

		const inputAmount = moveChoices.length;
		if (!inputAmount || (this.props.minMoves && inputAmount < this.props.minMoves)) {
			const min = this.props.minMoves || 1;
			this.errors.push("You must specify at least " + min + " valid move" + (min > 1 ? "s" : "") + ".");
		}

		if (this.props.maxMoves && inputAmount > this.props.maxMoves) {
			this.errors.push("You may only specify up to " + this.props.maxMoves + " move" + (this.props.maxMoves > 1 ? "s" : "") + ".");
		}

		this.currentInput = targets.join(', ');
		this.currentOutput = moveChoices;
	}
}