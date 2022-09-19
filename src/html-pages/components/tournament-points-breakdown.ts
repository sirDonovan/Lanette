import type { ICachedPointsBreakdown, IPointBreakdown } from "../../types/storage";
import type { HtmlPageBase } from "../html-page-base";
import type { ILeaderboardProps } from "./leaderboard-base";
import { PointsBreakdownBase } from "./points-breakdown-base";

export class TournamentPointsBreakdown extends PointsBreakdownBase {
	componentId = 'tournament-points-breakdown';
	cachedPointBreakdowns: ICachedPointsBreakdown[] = [];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, Object.assign({}, props, {
			leaderboardType: 'tournamentLeaderboard',
			pointsName: 'point',
		}));
	}

	renderPointBreakdowns(breakdown: Dict<IPointBreakdown>, maxPercentageLength: number): string {
		let html = "";
		for (const source in breakdown) {
			let name: string;
			if (source in this.sourceNameCache) {
				name = this.sourceNameCache[source];
			} else {
				if (source === Storage.manualSource) {
					name = "<code>" + Config.commandCharacter + "addpoints</code>";
				} else {
					const format = Dex.getFormat(source);
					name = format ? format.name : source;
				}

				this.sourceNameCache[source] = name;
			}

			let percentage = "" + breakdown[source].percentage;
			if (percentage.length > maxPercentageLength) percentage = percentage.substr(0, maxPercentageLength);

			html += "&bull;&nbsp;<b>" + name + "</b> - " + percentage + "% (" + breakdown[source].points + " " + this.pointsName +
				(breakdown[source].points > 1 ? "s" : "") + ")<br />";
		}
		return html;
	}
}