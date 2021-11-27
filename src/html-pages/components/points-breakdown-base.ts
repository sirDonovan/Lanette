import type { Room } from "../../rooms";
import type { ICachedPointsBreakdown, IPointBreakdown } from "../../types/storage";
import { LeaderboardBase } from "./leaderboard-base";
import type { ILeaderboardProps } from "./leaderboard-base";
import type { IPageElement } from "./pagination";

export abstract class PointsBreakdownBase extends LeaderboardBase {
	cachedPointBreakdowns: ICachedPointsBreakdown[] = [];
	displayedPercentagePlaces: number = 2;
	rowsPerPage: number = 10;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(room, parentCommandPrefix, componentCommand, props);
	}

	abstract renderPointBreakdowns(breakdown: Dict<IPointBreakdown>): string;

	getPercentageLength(): number {
		return 2 + this.displayedPercentagePlaces;
	}

	onUpdateLeaderboardParameters(): void {
		this.updateCachedPointBreakdowns();
		this.updateLeaderboardPagination();
	}

	updateCachedPointBreakdowns(): void {
		if (this.selectedCycle === Storage.currentCycle) {
			this.cachedPointBreakdowns = Storage.getPointsBreakdownCache(this.room, this.leaderboardType);
		} else {
			if (this.cycleLeaderboard) {
				this.cachedPointBreakdowns = Storage.getPreviousCyclePointsBreakdownCache(this.room, this.cycleLeaderboard,
					this.selectedCycle);
			} else {
				this.cachedPointBreakdowns = [];
			}
		}
	}

	getLeaderboardPaginationElements(): IPageElement[] {
		const elements: IPageElement[] = [];

		for (let i = 0; i < this.cachedPointBreakdowns.length; i++) {
			elements.push({html: "&nbsp;&nbsp;&nbsp;<b>" + Tools.toNumberOrderString(i + 1) + "</b>: <details><summary><username>" +
				this.cachedPointBreakdowns[i].name + "</username> - " + this.cachedPointBreakdowns[i].breakdown.total + " " +
				this.pointsName + (this.cachedPointBreakdowns[i].breakdown.total > 1 ? "s" : "") + "</summary>" +
				this.renderPointBreakdowns(this.cachedPointBreakdowns[i].breakdown.breakdowns) + "</details>"});
		}

		return elements;
	}

	renderLeaderboardName(): string {
		let html = "<h3>";
		if (this.selectedCycle !== Storage.currentCycle) {
			html += this.selectedCycle + " ";
		}

		if (this.selectedFormats.length) {
			html += "Sub-points breakdown (" + Tools.joinList(this.selectedFormats) + ")";
		} else {
			html += "Points breakdown";
		}

		html += "</h3>";
		return html;
	}
}