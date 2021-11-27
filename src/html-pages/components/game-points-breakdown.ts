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

	renderPointBreakdowns(breakdown: Dict<IPointBreakdown>): string {
		let html = "";
		for (const source in breakdown) {
			let name: string;
			if (source === Storage.manualSource) {
				name = "<code>" + Config.commandCharacter + "abits</code>";
			} else {
				const format = Games.getFormat(source);
				name = Array.isArray(format) ? source : format.name;
			}

			html += "&bull;&nbsp;<b>" + name + "</b> - " +
				("" + breakdown[source].percentage).substr(0, this.getPercentageLength()) + "% (" + breakdown[source].points +
				" " + this.pointsName + (breakdown[source].points > 1 ? "s" : "") + ")<br />";
		}
		return html;
	}
}