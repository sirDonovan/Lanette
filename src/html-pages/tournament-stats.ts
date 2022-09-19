import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { User } from "../users";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";
import { TournamentLeaderboard } from "./components/tournament-leaderboard";
import { TournamentPointsBreakdown } from "./components/tournament-points-breakdown";

const baseCommand = 'tournamentstats';
const chooseLeaderboard = 'chooseleaderboard';
const choosePointsBreakdown = 'choosepointsbreakdown';

const leaderboardCommand = 'tournamentleaderboard';
const pointsBreakdownCommand = 'tournamentpointsbreakdown';

export const pageId = 'tournament-stats';
export const pages: Dict<TournamentStats> = {};

class TournamentStats extends HtmlPageBase {
	pageId = pageId;
	currentView: 'leaderboard' | 'pointsbreakdown' = 'leaderboard';

	tournamentLeaderboard: TournamentLeaderboard;
	tournamentPointsBreakdown: TournamentPointsBreakdown;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		this.setCloseButton();

		const showPreviousCycles = user.isDeveloper() || user.hasRank(room, 'voice');
		this.tournamentLeaderboard = new TournamentLeaderboard(this, this.commandPrefix, leaderboardCommand, {
			showPreviousCycles,
			reRender: () => this.send(),
		});

		this.tournamentPointsBreakdown = new TournamentPointsBreakdown(this, this.commandPrefix, pointsBreakdownCommand, {
			showPreviousCycles,
			reRender: () => this.send(),
		});
		this.tournamentPointsBreakdown.active = false;

		this.components = [this.tournamentLeaderboard, this.tournamentPointsBreakdown];
	}

	chooseLeaderboard(): void {
		if (this.currentView === 'leaderboard') return;

		this.currentView = 'leaderboard';
		this.tournamentLeaderboard.active = true;
		this.tournamentPointsBreakdown.active = false;

		this.send();
	}

	choosePointsBreakdown(): void {
		if (this.currentView === 'pointsbreakdown') return;

		this.currentView = 'pointsbreakdown';
		this.tournamentLeaderboard.active = false;
		this.tournamentPointsBreakdown.active = true;

		this.send();
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + " Tournament Stats</b>";
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
			html += this.tournamentLeaderboard.render();
		} else if (pointsBreakdownView) {
			html += this.tournamentPointsBreakdown.render();
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
				new TournamentStats(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new TournamentStats(targetRoom, user);

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
		aliases: ['tstats', 'tourstats'],
	},
};