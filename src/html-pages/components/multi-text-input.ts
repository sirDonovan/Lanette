import type { HtmlPageBase } from "../html-page-base";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { ITextAreaConfiguration } from "./text-input";

export interface IMultiTextInputProps<OutputType = string[]> extends IComponentProps {
	inputCount: number;
	labels: string[];
	clearText?: string;
	currentInputs?: string[];
	delimiter?: string;
	placeholders?: string[];
	submitText?: string;
	textAreas?: boolean[];
	textAreaConfigurations?: (ITextAreaConfiguration | null)[];
	onClear: () => void;
	onErrors: (errors: string[]) => void;
	onSubmit: (output: OutputType) => void;
}

const tagBaseName = 'textInput';

export class MultiTextInput<OutputType = string[]> extends ComponentBase<IMultiTextInputProps<OutputType>> {
	componentId: string = 'text-input';
	clearCommand: string = 'clear';
	currentInputs: string[] = [];
	currentOutput: OutputType | undefined = undefined;
	delimiter: string;
	errors: string[] = [];
	submitCommand: string = 'submit';

	clearText: string;
	submitText: string;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IMultiTextInputProps<OutputType>) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		if (props.currentInputs) this.currentInputs = props.currentInputs;
		this.clearText = props.clearText || "Clear";
		this.delimiter = props.delimiter || "|";
		this.submitText = props.submitText || "Submit";
	}

	parentClearInputs(): void {
		this.currentInputs = [];
	}

	parentSetInputs(inputs: string[]): void {
		this.currentInputs = inputs;
	}

	clear(): void {
		if (!this.currentInputs.length) return;

		this.currentInputs = [];

		this.props.onClear();
	}

	submit(inputs: string[]): void {
		this.currentInputs = inputs;
		this.errors = [];

		this.onSubmit(inputs);

		if (this.errors.length) {
			this.props.onErrors(this.errors);
		} else {
			this.props.onSubmit(this.currentOutput!);
		}
	}

	/**Set `currentOutput` and any validation errors */
	onSubmit(inputs: string[]): void {
		// @ts-expect-error - re-implement submit() if OutputType !== string[]
		this.currentOutput = inputs;
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.clearCommand) {
			this.clear();
		} else if (cmd === this.submitCommand) {
			this.submit(targets.join(',').trim().split(this.delimiter));
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

		const tagNames: string[] = [];
		for (let i = 1; i <= this.props.inputCount; i++) {
			tagNames.push(tagBaseName + "-" + i);
		}

		html += "<form data-submitsend='/msgroom " + this.htmlPage.room.id + ", /botmsg " + Users.self.name + ", " +
			this.commandPrefix + ", " + this.submitCommand + ", {" + tagNames.join("}" + this.delimiter + "{") + "}'>";

		for (let i = 0; i < tagNames.length; i++) {
			html += this.props.labels[i] + ":&nbsp;";
			if (this.props.textAreas && this.props.textAreas[i]) {
				const configuration = this.props.textAreaConfigurations ? this.props.textAreaConfigurations[i] : null;
				html += "<textarea name='" + tagNames[i] + "' rows='" + (configuration && configuration.rows ? configuration.rows : 4) +
					"' cols='" + (configuration && configuration.cols ? configuration.cols : 50) + "'" +
					(this.props.readonly ? " disabled" : "") + ">";
				if (this.currentInputs[i]) {
					html += this.currentInputs[i];
				} else if (this.props.placeholders && this.props.placeholders[i]) {
					html += this.props.placeholders[i];
				}
				html += "</textarea>";
			} else {
				html += "<input name='" + tagNames[i] + "'";
				if (this.props.placeholders && this.props.placeholders[i]) html += " placeholder='" + this.props.placeholders[i] + "'";
				if (this.currentInputs[i]) html += " value='" + this.currentInputs[i] + "'";
				if (this.props.readonly) html += " disabled";
				html += " /><br />";
			}
		}

		html += "<button class='button" + (this.props.readonly ? " disabled" : "") + "' type='submit'" +
			(this.props.readonly ? " disabled" : "") + ">" + this.submitText + "</button>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.clearCommand, this.clearText,
			{disabled: !this.currentInputs.length});
		html += "</form>";

		return html;
	}
}