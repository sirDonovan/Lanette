import type { Room } from "../../rooms";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";

export interface ITextAreaConfiguration {
	cols?: number;
	rows?: number;
}

export interface ITextInputProps<OutputType = string> extends IComponentProps {
	clearText?: string;
	currentInput?: string;
	inputWidth?: number;
	label?: string;
	placeholder?: string;
	submitText?: string;
	textArea?: boolean;
	textAreaConfiguration?: ITextAreaConfiguration;
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

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps<OutputType>) {
		super(room, parentCommandPrefix, componentCommand, props);

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
		this.currentInput = input;

		this.onSubmit(input);

		if (this.errors.length) {
			this.props.onErrors(this.errors);
		} else {
			this.props.onSubmit(this.currentOutput!);
		}
	}

	/**Set `currentOutput` and any validation errors */
	onSubmit(input: string): void {
		this.errors = [];

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
			html += this.errors.map(x => "<b>Error</b>: " + x).join("<br />");
			html += "<br />";
		}

		html += "<form data-submitsend='/msgroom " + this.room.id + ", /botmsg " + Users.self.name + ", " + this.commandPrefix + ", " +
			this.submitCommand + ", {" + tagName + "}'>";

		if (this.props.label) html += this.props.label + ":&nbsp;";
		if (this.props.textArea) {
			const configuration = this.props.textAreaConfiguration;
			html += "<textarea name='" + tagName + "' rows='" + (configuration && configuration.rows ? configuration.rows : 4) +
				"' cols='" + (configuration && configuration.cols ? configuration.cols : 50) + "'>";
			if (this.currentInput) {
				html += this.currentInput;
			} else if (this.props.placeholder) {
				html += this.props.placeholder;
			}
			html += "</textarea><br />";
		} else {
			html += "<input name='" + tagName + "'";
			if (this.props.placeholder) html += " placeholder='" + this.props.placeholder + "'";
			if (this.currentInput) html += " value='" + this.currentInput + "'";
			if (this.props.inputWidth) html += " style='width:" + this.props.inputWidth + "px'";
			html += " />&nbsp;";
		}

		html += "<button class='button' type='submit'>" + this.submitText + "</button>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.clearCommand, this.clearText, !this.currentInput);
		html += "</form>";

		return html;
	}
}