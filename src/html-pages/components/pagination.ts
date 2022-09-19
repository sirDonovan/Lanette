import type { HtmlPageBase } from "../html-page-base";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";

export interface IPageElement {
	html: string;
	selected?: boolean;
}

interface IPaginationProps extends IComponentProps {
	elements: IPageElement[];
	elementsPerRow: number;
	rowsPerPage: number;
	currentPage?: number;
	pagesLabel?: string;
	noElementsLabel?: string;
	noPickElement?: boolean;
	hideSinglePageNavigation?: boolean;
	onSelectPage: (selectedPage: number) => void;
}

const pageCommand = 'gotopage';

export class Pagination extends ComponentBase<IPaginationProps> {
	componentId: string = 'pagination';

	currentPage: number;
	elements!: IPageElement[];
	elementsIncrement: number;
	pagesLabel: string;
	totalPages!: number;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPaginationProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.currentPage = props.currentPage || 0;
		this.elementsIncrement = props.elementsPerRow * props.rowsPerPage;
		this.pagesLabel = props.pagesLabel || "Pages";
		this.updateElements(props.elements, true);
	}

	autoSelectPage(): void {
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].selected) {
				this.currentPage = Math.ceil((i + 1) / this.elementsIncrement) - 1;
				break;
			}
		}
	}

	selectPage(page: number, parent?: boolean): void {
		if (this.currentPage === page) return;

		this.currentPage = page;
		if (!parent) this.props.onSelectPage(page);
	}

	parentSelectPage(page: number): void {
		this.selectPage(page, true);
	}

	updateElements(elements: IPageElement[], dontRender?: boolean): void {
		this.elements = elements;
		this.totalPages = Math.ceil(elements.length / this.elementsIncrement);
		this.autoSelectPage();

		if (!dontRender) this.props.onSelectPage(this.currentPage);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === pageCommand) {
			const page = parseInt(targets[0]);
			if (isNaN(page) || page < 1 || page > this.totalPages) return "'" + targets[0].trim() + "' is not a valid page number.";
			this.selectPage(page - 1);
		}
	}

	render(): string {
		const totalElements = this.elements.length;
		const startIndex = this.currentPage * this.elementsIncrement;
		let endIndex = (this.currentPage + 1) * this.elementsIncrement;
		if (endIndex > totalElements) endIndex = totalElements;

		let html = "";
		if (!(this.props.hideSinglePageNavigation && this.totalPages === 1)) {
			const endIndexDisplay = "" + (endIndex === totalElements && this.props.noPickElement ? totalElements - 1 : endIndex);
			const totalElementsDisplay = "" + (this.props.noPickElement ? totalElements - 1 : totalElements);
			html += this.pagesLabel + " (" + (totalElements ? startIndex + 1 : 0) + "-" + endIndexDisplay + "/" +
				totalElementsDisplay + "):";
		}

		if (this.totalPages > 1) {
			for (let i = 0; i < this.totalPages; i++) {
				const page = "" + (i + 1);
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + pageCommand + ", " + page, page,
					{selectedAndDisabled: this.currentPage === i});
			}
		}

		html += "<br /><br />";

		if (totalElements) {
			let elementsInRow = 0;
			for (let i = startIndex; i < endIndex; i++) {
				html += this.elements[i].html;

				elementsInRow++;
				if (elementsInRow === this.props.elementsPerRow) {
					html += "<br />";
					elementsInRow = 0;
				}
			}
		} else {
			html += this.props.noElementsLabel || "There are no results.";
		}

		return html;
	}
}