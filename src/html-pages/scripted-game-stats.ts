import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { User } from "../users";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";
import { GameLeaderboard } from "./components/game-leaderboard";
import { GamePointsBreakdown } from "./components/game-points-breakdown";

const baseCommand = 'scriptedgamestats';
const chooseLeaderboard = 'chooseleaderboard';
const choosePointsBreakdown = 'choosepointsbreakdown';

const leaderboardCommand = 'gameleaderboard';
const pointsBreakdownCommand = 'gamepointsbreakdown';

export const pageId = 'scripted-game-stats';
export const pages: Dict<ScriptedGameStats> = {};

class ScriptedGameStats extends HtmlPageBase {
	pageId = pageId;
	currentView: 'leaderboard' | 'pointsbreakdown' = 'leaderboard';

	gameLeaderboard: GameLeaderboard;
	gamePointsBreakdown: GamePointsBreakdown;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		this.setCloseButton();

		const showPreviousCycles = user.isDeveloper() || user.hasRank(room, 'voice');
		this.gameLeaderboard = new GameLeaderboard(this, this.commandPrefix, leaderboardCommand, {
			showPreviousCycles,
			reRender: () => this.send(),
		});

		this.gamePointsBreakdown = new GamePointsBreakdown(this, this.commandPrefix, pointsBreakdownCommand, {
			showPreviousCycles,
			reRender: () => this.send(),
		});
		this.gamePointsBreakdown.active = false;

		this.components = [this.gameLeaderboard, this.gamePointsBreakdown];
	}

	chooseLeaderboard(): void {
		if (this.currentView === 'leaderboard') return;

		this.currentView = 'leaderboard';
		this.gameLeaderboard.active = true;
		this.gamePointsBreakdown.active = false;

		this.send();
	}

	choosePointsBreakdown(): void {
		if (this.currentView === 'pointsbreakdown') return;

		this.currentView = 'pointsbreakdown';
		this.gameLeaderboard.active = false;
		this.gamePointsBreakdown.active = true;

		this.send();
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + " Scripted Game Stats</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "<br /><br />";

        const leaderboardView = this.currentView === 'leaderboard';
		const pointsBreakdownView = this.currentView === 'pointsbreakdown';

		html += "<b>Options</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseLeaderboard, "Leaderboard",
			{selectedAndDisabled: leaderboardView});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePointsBreakdown, "Points breakdown",
			{selectedAndDisabled: pointsBreakdownView});
		html += "</center>";

		if (leaderboardView) {
			html += this.gameLeaderboard.render();
		} else if (pointsBreakdownView) {
			html += this.gamePointsBreakdown.render();
		}

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new ScriptedGameStats(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new ScriptedGameStats(targetRoom, user);

			if (cmd === chooseLeaderboard) {
				pages[user.id].chooseLeaderboard();
			} else if (cmd === choosePointsBreakdown) {
				pages[user.id].choosePointsBreakdown();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['sgstats'],
	},
};