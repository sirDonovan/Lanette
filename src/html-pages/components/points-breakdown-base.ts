import type { ICachedPointsBreakdown, IPointBreakdown } from "../../types/storage";
import { LeaderboardBase } from "./leaderboard-base";
import type { ILeaderboardProps } from "./leaderboard-base";
import type { IPageElement } from "./pagination";
import type { HtmlPageBase } from "../html-page-base";

export abstract class PointsBreakdownBase extends LeaderboardBase {
	cachedPointBreakdowns: ICachedPointsBreakdown[] = [];
	rowsPerPage: number = 10;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);
	}

	abstract renderPointBreakdowns(breakdown: Dict<IPointBreakdown>, maxPercentageLength: number): string;

	onUpdateLeaderboardParameters(noPageUpdate?: boolean): void {
		this.updateCachedPointBreakdowns();
		this.updateLeaderboardPagination(noPageUpdate);
	}

	updateCachedPointBreakdowns(): void {
		if (this.selectedCycle === Storage.currentCycle) {
			this.cachedPointBreakdowns = Storage.getPointsBreakdownCache(this.htmlPage.room, this.leaderboardType);
		} else {
			if (this.cycleLeaderboard) {
				this.cachedPointBreakdowns = Storage.getPreviousCyclePointsBreakdownCache(this.htmlPage.room, this.cycleLeaderboard,
					this.selectedCycle);
			} else {
				this.cachedPointBreakdowns = [];
			}
		}
	}

	getLeaderboardPaginationElements(): IPageElement[] {
		const maxPercentageLength = this.getMaxPercentageLength();
		const elements: IPageElement[] = [];

		for (let i = 0; i < this.cachedPointBreakdowns.length; i++) {
			elements.push({html: "&nbsp;&nbsp;&nbsp;<b>" + Tools.toNumberOrderString(i + 1) + "</b>: <details><summary><username>" +
				this.cachedPointBreakdowns[i].name + "</username> - " + this.cachedPointBreakdowns[i].breakdown.total + " " +
				this.pointsName + (this.cachedPointBreakdowns[i].breakdown.total > 1 ? "s" : "") + "</summary>" +
				this.renderPointBreakdowns(this.cachedPointBreakdowns[i].breakdown.breakdowns, maxPercentageLength) + "</details>"});
		}

		return elements;
	}

	renderLeaderboardName(): string {
		let html = "<h3>";
		if (this.selectedCycle !== Storage.currentCycle) {
			html += this.selectedCycle + " ";
		}

		if (this.selectedFormatNames.length) {
			html += "Sub-points breakdown (" + Tools.joinList(this.selectedFormatNames) + ")";
		} else {
			html += "Points breakdown";
		}

		html += "</h3>";
		return html;
	}
}