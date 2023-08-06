import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import { TextInput } from "./text-input";
import type { HtmlPageBase } from "../html-page-base";
import { NumberTextInput } from "./number-text-input";

const updateNameCommand = "updatename";
const updateSourceCommand = "updatesource";
const updateWidthCommand = "updatewidth";
const updateHeightCommand = "updateheight";

export interface ITrainerCardPrizeProps extends IComponentProps {
	updating?: boolean;
	onUpdateName: (name: string) => void;
	onUpdateSource: (source: string) => void;
	onUpdateWidth: (width: number) => void;
	onUpdateHeight: (width: number) => void;
}

export class TrainerCardPrize extends ComponentBase<ITrainerCardPrizeProps> {
	componentId: string = 'trainer-card-prize';

	name: string = "";

	nameInput: TextInput;
	sourceInput: TextInput;
	widthInput: NumberTextInput;
	heightInput: NumberTextInput;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITrainerCardPrizeProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.nameInput = new TextInput(htmlPage, this.commandPrefix, updateNameCommand, {
			readonly: props.updating,
			label: "Name",
			hideClearButton: true,
			onSubmit: (output) => this.updateName(output),
			reRender: () => this.props.reRender(),
		});

		this.sourceInput = new TextInput(htmlPage, this.commandPrefix, updateSourceCommand, {
			label: "Source",
			hideClearButton: true,
			onSubmit: (output) => this.updateSource(output),
			reRender: () => this.props.reRender(),
		});

		this.widthInput = new NumberTextInput(htmlPage, this.commandPrefix, updateWidthCommand, {
			label: "Width",
			hideClearButton: true,
			min: 1,
			onSubmit: (output) => this.updateWidth(output),
			reRender: () => this.props.reRender(),
		});

		this.heightInput = new NumberTextInput(htmlPage, this.commandPrefix, updateHeightCommand, {
			label: "Height",
			hideClearButton: true,
			min: 1,
			onSubmit: (output) => this.updateHeight(output),
			reRender: () => this.props.reRender(),
		});

		this.components = [this.nameInput, this.sourceInput, this.widthInput, this.heightInput];
	}

	updateName(output: string): void {
		this.props.onUpdateName(output);
	}

	updateSource(output: string): void {
		this.props.onUpdateSource(output);
	}

	updateWidth(output: string): void {
		this.props.onUpdateWidth(parseInt(output));
	}

	updateHeight(output: string): void {
		this.props.onUpdateHeight(parseInt(output));
	}

	parentSetName(input: string): void {
		this.name = input;
		this.nameInput.parentSetInput(input);
	}

	parentSetSource(input: string): void {
		this.sourceInput.parentSetInput(input);
	}

	parentSetWidth(input: number): void {
		this.widthInput.parentSetInput("" + input);
	}

	parentSetHeight(input: number): void {
		this.heightInput.parentSetInput("" + input);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		return this.checkComponentCommands(cmd, targets);
	}

	render(): string {
		let html = "";

		html += this.nameInput.render();
		html += this.sourceInput.render();
		html += this.widthInput.render();
		html += this.heightInput.render();

		return html;
	}
}