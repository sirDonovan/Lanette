import type { Room } from "../../rooms";
import type { ICachedPointsBreakdown, IPointBreakdown } from "../../types/storage";
import type { ILeaderboardProps } from "./leaderboard-base";
import { PointsBreakdownBase } from "./points-breakdown-base";

export class GamePointsBreakdown extends PointsBreakdownBase {
	componentId = 'game-points-breakdown';
	cachedPointBreakdowns: ICachedPointsBreakdown[] = [];

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(room, parentCommandPrefix, componentCommand, Object.assign({}, props, {
			leaderboardType: 'gameLeaderboard',
			pointsName: 'bit',
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
					name = "<code>" + Config.commandCharacter + "abits</code>";
				} else {
					const format = Games.getFormat(source);
					name = Array.isArray(format) ? source : format.name;
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