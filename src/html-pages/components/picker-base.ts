import type { HtmlPageBase } from "../html-page-base";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";

export interface IPickerProps<PickType> extends IComponentProps {
	currentPick?: string | undefined;
	currentPicks?: string[] | undefined;
	noPickName?: string | undefined;
	pickerIndex?: number;
	maxPicks?: number;
	onClear: (pickerIndex: number, dontRender: boolean | undefined) => void;
	onPick: (pickerIndex: number, pick: PickType, dontRender: boolean | undefined) => void;
	onUnPick?: (pickerIndex: number, pick: PickType, dontRender: boolean | undefined) => void;
}

export abstract class PickerBase<PickType = string, PropsType extends IPickerProps<PickType> = IPickerProps<PickType>> extends
	ComponentBase<PropsType> {
	pickCommand: string = 'pick';
	randomPickCommand: string = 'randompick';

	currentPicks: string[];
	choices: Dict<PickType> = {};
	choiceElements: Dict<IPageElement> = {};
	maxPicks: number;
	noPickName: string;
	noPickElement: IPageElement = {html: ""};
	pickerIndex: number;
	singlePick: boolean;

	replicationTargets?: PickerBase<PickType, PropsType>[];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: PropsType) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.currentPicks = props.currentPicks ? props.currentPicks : props.currentPick ? [props.currentPick] : [];
		this.maxPicks = props.maxPicks !== undefined ? props.maxPicks : 1;
		this.singlePick = this.maxPicks === 1;
		this.pickerIndex = props.pickerIndex || 0;
		this.noPickName = props.noPickName || "None";
		this.noPickElement.html = this.renderNoPickElement();
		this.noPickElement.selected = !this.currentPicks.length;
	}

	abstract getChoiceButtonHtml(choice: PickType): string;

	renderChoices(choices?: Dict<PickType>): Dict<IPageElement> {
		if (!choices) choices = this.choices;
		this.choiceElements = {};

		for (const i in choices) {
			this.choiceElements[i] = {html: this.renderChoiceElement(choices, i), selected: this.currentPicks.includes(i)};
		}

		return this.choiceElements;
	}

	renderChoiceElement(choices: Dict<PickType>, key: string): string {
		const picked = this.currentPicks.includes(key);
		return this.getQuietPmButton(this.commandPrefix + ", " + this.pickCommand + ", " + key, this.getChoiceButtonHtml(choices[key]),
			{disabled: this.singlePick && picked, style: !this.singlePick && picked ? "opacity: 50%" : "", selected: picked});
	}

	renderNoPickElement(): string {
		return this.getQuietPmButton(this.commandPrefix + ", " + this.pickCommand + ", " + this.noPickName, this.noPickName,
			{selectedAndDisabled: !this.currentPicks.length});
	}

	isValidChoice(choice: string): boolean {
		return choice in this.choices;
	}

	clear(dontRender?: boolean, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (!this.currentPicks.length) return;

		const previousPicks = this.currentPicks.slice();
		this.currentPicks = [];

		for (const previousPick of previousPicks) {
			if (previousPick in this.choiceElements) {
				if (previousPick in this.choices) {
					this.choiceElements[previousPick].html = this.renderChoiceElement(this.choices, previousPick);
				}
				this.choiceElements[previousPick].selected = false;
			}
		}

		this.noPickElement.html = this.renderNoPickElement();
		this.noPickElement.selected = true;

		this.onClear(dontRender);

		this.replicateClear(replicatedFrom);
	}

	onClear(dontRender: boolean | undefined, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (!replicatedFrom) this.props.onClear(this.pickerIndex, dontRender);
	}

	parentClear(): void {
		this.clear(true);
	}

	replicateClear(replicatedFrom: PickerBase<PickType, PropsType> | undefined): void {
		if (this.replicationTargets) {
			for (const target of this.replicationTargets) {
				if (!replicatedFrom || target !== replicatedFrom) target.clear(true, this);
			}
		}
	}

	pick(pick: string, dontRender?: boolean, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (this.currentPicks.includes(pick)) {
			if (!this.singlePick) this.unPick(pick, dontRender, replicatedFrom);
			return;
		}

		const previousPick = this.currentPicks[0];
		if (this.singlePick) {
			this.currentPicks = [pick];
		} else {
			this.currentPicks.push(pick);
		}

		if (previousPick) {
			if (this.singlePick && previousPick in this.choiceElements) {
				if (previousPick in this.choices) {
					this.choiceElements[previousPick].html = this.renderChoiceElement(this.choices, previousPick);
				}
				this.choiceElements[previousPick].selected = false;
			}
		} else {
			this.noPickElement.html = this.renderNoPickElement();
			this.noPickElement.selected = false;
		}

		this.choiceElements[pick].html = this.renderChoiceElement(this.choices, pick);
		this.choiceElements[pick].selected = true;

		this.onPick(pick, dontRender);

		this.replicatePick(pick, replicatedFrom);
	}

	unPick(pick: string, dontRender?: boolean, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (this.singlePick) return;

		const index = this.currentPicks.indexOf(pick);
		if (index === -1) return;

		this.currentPicks.splice(index, 1);
		if (pick in this.choiceElements) {
			if (pick in this.choices) {
				this.choiceElements[pick].html = this.renderChoiceElement(this.choices, pick);
			}
			this.choiceElements[pick].selected = false;
		}

		if (!this.currentPicks.length) {
			this.noPickElement.html = this.renderNoPickElement();
			this.noPickElement.selected = false;
		}

		this.onUnPick(pick, dontRender);

		this.replicateUnPick(pick, replicatedFrom);
	}

	onPick(pick: string, dontRender: boolean | undefined, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (!replicatedFrom) this.props.onPick(this.pickerIndex, this.choices[pick], dontRender);
	}

	onUnPick(pick: string, dontRender: boolean | undefined, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (this.props.onUnPick && !replicatedFrom) this.props.onUnPick(this.pickerIndex, this.choices[pick], dontRender);
	}

	pickRandom(dontRender?: boolean): void {
		this.pick(Tools.sampleOne(Object.keys(this.choices)), dontRender);
	}

	parentPick(pick: string): void {
		this.pick(pick, true);
	}

	replicatePick(pick: string, replicatedFrom: PickerBase<PickType, PropsType> | undefined): void {
		if (this.replicationTargets) {
			for (const target of this.replicationTargets) {
				if ((!replicatedFrom || target !== replicatedFrom) && target.isValidChoice(pick)) target.pick(pick, true, this);
			}
		}
	}

	replicateUnPick(pick: string, replicatedFrom: PickerBase<PickType, PropsType> | undefined): void {
		if (this.replicationTargets) {
			for (const target of this.replicationTargets) {
				if ((!replicatedFrom || target !== replicatedFrom) && target.isValidChoice(pick)) target.unPick(pick, true, this);
			}
		}
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.pickCommand) {
			if (!targets.length) return "You must specify a choice.";

			const key = targets[0].trim();
			const cleared = key === this.noPickName;
			if (!cleared && (!(key in this.choices) || (this.validateChoice && !this.validateChoice(this.choices[key])))) {
				return "'" + key + "' is not a valid choice.";
			}

			if (cleared) {
				this.clear();
			} else {
				this.pick(key);
			}
		} else if (cmd === this.randomPickCommand) {
			this.pickRandom();
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	addReplicationTarget(target: PickerBase<PickType, PropsType>): void {
		if (!this.replicationTargets) throw new Error("No replicationTargets defined in " + this.componentId);
		if (!this.replicationTargets.includes(target)) this.replicationTargets.push(target);
	}

	removeReplicationTarget(target: PickerBase<PickType, PropsType>): void {
		if (!this.replicationTargets) throw new Error("No replicationTargets defined in " + this.componentId);
		const index = this.replicationTargets.indexOf(target);
		if (index !== -1) this.replicationTargets.splice(index, 1);
	}

	validateChoice?(choice: PickType): boolean;
}