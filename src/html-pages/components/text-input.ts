import type { HtmlPageBase } from "../html-page-base";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";

export interface ITextAreaConfiguration {
	cols?: number;
	rows?: number;
}

export interface ITextInputValidation<OutputType = string> {
	currentOutput?: OutputType;
	errors?: string[];
}

export interface ITextInputProps<OutputType = string> extends IComponentProps {
	clearText?: string;
	currentInput?: string;
	inputWidth?: number;
	label?: string;
	placeholder?: string;
	stripHtmlCharacters?: boolean;
	submitText?: string;
	textArea?: boolean;
	textAreaConfiguration?: ITextAreaConfiguration;
	hideClearButton?: boolean;
	onClear: () => void;
	onErrors: (errors: string[]) => void;
	onSubmit: (output: OutputType) => void;
	validateSubmission?: (input: string, output?: OutputType) => ITextInputValidation;
}

const tagName = 'textInput';

export class TextInput<OutputType = string> extends ComponentBase<ITextInputProps<OutputType>> {
	componentId: string = 'text-input';
	afterSubmitHtml: string = "";
	clearCommand: string = 'clear';
	currentInput: string | undefined = undefined;
	currentOutput: OutputType | undefined = undefined;
	errors: string[] = [];
	submitCommand: string = 'submit';

	clearText: string;
	submitText: string;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITextInputProps<OutputType>) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		if (props.currentInput) this.currentInput = props.currentInput;
		this.clearText = props.clearText || "Clear";
		this.submitText = props.submitText || "Submit";
	}

	updateSubmitText(text: string): void {
		this.submitText = text;
	}

	updateAfterSubmitHtml(html: string): void {
		this.afterSubmitHtml = html;
	}

	parentClearInput(): void {
		this.currentInput = undefined;
	}

	parentSetInput(input: string): void {
		this.currentInput = input;
	}

	parentSetErrors(errors: readonly string[]): void {
		this.errors = errors.slice();
	}

	clear(): void {
		if (this.currentInput === undefined) return;

		this.currentInput = undefined;

		this.props.onClear();
	}

	submit(input: string): void {
		if (this.props.stripHtmlCharacters) input = Tools.stripHtmlCharacters(input);
		this.currentInput = Tools.unescapeHTML(input);
		this.errors = [];

		this.onSubmit(this.currentInput);

		if (this.props.validateSubmission) {
			const validation = this.props.validateSubmission(this.currentInput, this.currentOutput);
			// @ts-expect-error
			if (validation.currentOutput) this.currentOutput = validation.currentOutput;
			if (validation.errors) this.errors = this.errors.concat(validation.errors);
		}

		this.currentInput = Tools.escapeHTML(this.currentInput);

		if (this.errors.length) {
			this.props.onErrors(this.errors);
		} else {
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
			html += this.errors.map(x => "<b>Error</b>: " + x).join("<br />");
			html += "<br />";
		}

		html += "<form data-submitsend='/msgroom " + this.htmlPage.room.id + ", /botmsg " + Users.self.name + ", " +
			this.commandPrefix + ", " + this.submitCommand + ", {" + tagName + "}'>";

		if (this.props.label) html += this.props.label + ":&nbsp;";
		if (this.props.textArea) {
			const configuration = this.props.textAreaConfiguration;
			html += "<textarea name='" + tagName + "' rows='" + (configuration && configuration.rows ? configuration.rows : 4) +
				"' cols='" + (configuration && configuration.cols ? configuration.cols : 50) + "'" +
				(this.props.readonly ? " disabled" : "") + ">";
			if (this.currentInput) {
				html += this.currentInput;
			} else if (this.props.placeholder) {
				html += this.props.placeholder;
			}
			html += "</textarea><br />";
		} else {
			html += "<input name='" + tagName + "'";
			if (this.props.placeholder) html += " placeholder='" + this.props.placeholder + "'";
			if (this.currentInput) html += ' value="' + this.currentInput + '"';
			if (this.props.inputWidth) html += " style='width:" + this.props.inputWidth + "px'";
			if (this.props.readonly) html += " disabled";
			html += " />&nbsp;";
		}

		html += "<button class='button" + (this.props.readonly ? " disabled" : "") + "' type='submit'" +
			(this.props.readonly ? " disabled" : "") + ">" + this.submitText + "</button>";

		if (!this.props.hideClearButton) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.clearCommand, this.clearText,
				{disabled: !this.currentInput});
		}

		html += this.afterSubmitHtml;

		html += "</form>";

		return html;
	}
}