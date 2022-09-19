import type { HtmlPageBase } from "../html-page-base";
import { type IPageElement, Pagination } from "./pagination";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface INamePickerProps extends IPickerProps<string> {
	names: string[];
	label?: string;
	pagesLabel?: string;
	namesHtml?: Dict<string>;
	elementsPerRow?: number;
	rowsPerPage?: number;
}

const namePickerPageCommand = 'namepickerpage';

export class NamePicker extends PickerBase {

	componentId: string = 'name-picker';
	declare props: INamePickerProps;

	pagination: Pagination;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: INamePickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		for (const name of props.names) {
			this.choices[name] = name;
		}

		this.renderChoices();

		const elements: IPageElement[] = [];
		for (const name of props.names) {
			elements.push(this.choiceElements[name]);
		}

		this.pagination = new Pagination(htmlPage, this.commandPrefix, namePickerPageCommand, {
			elements,
			elementsPerRow: this.props.elementsPerRow || 5,
			rowsPerPage: this.props.rowsPerPage || 20,
			pagesLabel: this.props.pagesLabel,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.pagination.active = true;

		this.components = [this.pagination];
	}

	getChoiceButtonHtml(name: string): string {
		return this.props.namesHtml ? this.props.namesHtml[name] : name;
	}

	render(): string {
		let html = (this.props.label || "Name") + ":";
		html += "<br /><br />";

		html += this.pagination.render();

		return html;
	}
}