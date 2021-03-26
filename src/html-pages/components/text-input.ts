import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";

export interface ITextInputProps<OutputType = string> extends IComponentProps {
	clearText?: string;
	currentInput?: string;
	placeholder?: string;
	submitText?: string;
	onClear: () => void;
	onErrors: (errors: string[]) => void;
	onSubmit: (output: OutputType) => void;
}

const tagName = 'textInput';

export class TextInput<OutputType = string> extends ComponentBase<ITextInputProps<OutputType>> {
	componentId: string = 'text-input';
	clearCommand: string = 'clear';
	currentInput: string | undefined = undefined;
	currentOutput: OutputType | undefined = undefined;
	errors: string[] = [];
	submitCommand: string = 'submit';

	clearText: string;
	submitText: string;

	constructor(parentCommandPrefix: string, componentCommand: string, props: ITextInputProps<OutputType>) {
		super(parentCommandPrefix, componentCommand, props);

		if (props.currentInput) this.currentInput = props.currentInput;
		this.clearText = props.clearText || "Clear";
		this.submitText = props.submitText || "Submit";
	}

	parentClearInput(): void {
		this.currentInput = undefined;
	}

	parentSetInput(input: string): void {
		this.currentInput = input;
	}

	clear(): void {
		if (this.currentInput === undefined) return;

		this.currentInput = undefined;

		this.props.onClear();
	}

	submit(input: string): void {
		this.errors = [];

		this.onSubmit(input);

		if (this.errors.length) {
			this.props.onErrors(this.errors);
		} else {
			this.currentInput = input;
			this.props.onSubmit(this.currentOutput!);
		}
	}

	/**Set `currentOutput` and any validation errors */
	onSubmit(input: string): void {
		// @ts-expect-error - re-implement submit() if OutputType !== string
		this.currentOutput = input;
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.clearCommand) {
			this.clear();
		} else if (cmd === this.submitCommand) {
			this.submit(targets.join(',').trim());
		} else {
			return "'" + cmd + "' is not a valid text input command.";
		}
	}

	render(): string {
		let html = "";
		if (this.errors.length) {
			html += this.errors.map(x => "<b>Error</b> " + x).join("<br />");
			html += "<br />";
		}

		html += "<form data-submitsend='/msg " + Users.self.name + ", " + this.commandPrefix + ", " + this.submitCommand +
			", {" + tagName + "}'>";
		html += "<input name='" + tagName + "'";
		if (this.props.placeholder) html += " placeholder='" + this.props.placeholder + "'";
		if (this.currentInput) html += " value='" + this.currentInput + "'";
		html += " />&nbsp;<button class='button' type='submit'>" + this.submitText + "</button>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.clearCommand, this.clearText, !this.currentInput);
		html += "</form>";

		return html;
	}
}