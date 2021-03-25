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
	onSelectPage: (selectedPage: number) => void;
}

const pageCommand = 'gotopage';

export class Pagination extends ComponentBase<IPaginationProps> {
	componentId: string = 'pagination';

	currentPage: number;
	elementsIncrement: number;
	pagesLabel: string;
	totalPages!: number;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPaginationProps) {
		super(parentCommandPrefix, componentCommand, props);

		this.currentPage = props.currentPage || 0;
		this.elementsIncrement = props.elementsPerRow * props.rowsPerPage;
		this.pagesLabel = props.pagesLabel || "Pages";
		this.totalPages = Math.ceil(props.elements.length / this.elementsIncrement);

		this.autoSelectPage();
	}

	autoSelectPage(): void {
		for (let i = 0; i < this.props.elements.length; i++) {
			if (this.props.elements[i].selected) {
				this.currentPage = Math.ceil((i + 1) / this.elementsIncrement) - 1;
				break;
			}
		}
	}

	selectPage(page: number): void {
		if (this.currentPage === page) return;

		this.currentPage = page;
		this.props.onSelectPage(page);
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
		const totalElements = this.props.elements.length;
		const startIndex = this.currentPage * this.elementsIncrement;
		let endIndex = (this.currentPage + 1) * this.elementsIncrement;
		if (endIndex > totalElements) endIndex = totalElements;

		let html = this.pagesLabel + " (" + (startIndex + 1) + "-" + endIndex + "/" + totalElements + "):&nbsp;";

		if (this.totalPages > 1) {
			for (let i = 0; i < this.totalPages; i++) {
				const page = "" + (i + 1);
				html += Client.getPmSelfButton(this.commandPrefix + ", " + pageCommand + ", " + page, page,
					this.currentPage === i) + "&nbsp;";
			}
		}

		html += "<br /><br />";

		let elementsInRow = 0;
		for (let i = startIndex; i < endIndex; i++) {
			html += this.props.elements[i].html;

			elementsInRow++;
			if (elementsInRow === this.props.elementsPerRow) {
				html += "<br />";
				elementsInRow = 0;
			}
		}

		return html;
	}
}