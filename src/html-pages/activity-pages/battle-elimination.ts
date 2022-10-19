import type { BattleElimination } from "../../games/templates/battle-elimination";
import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { BattleEliminationTeambuilder } from "../components/battle-elimination-teambuilder";
import { GamePageBase, type IGamePageOptions } from "./game-page-base";

export interface IBattleEliminationPageOptions extends IGamePageOptions {
	gen: number;
	rerollCommand: string;
	rulesHtml: string;
	showBracket?: boolean;
}

const battleEliminationTeambuilderCommand = 'teambuilder';
const showAllTeamChangesCommand = 'showallteamchanges';
const hideAllTeamChangesCommand = 'hideallteamchanges';

export class BattleEliminationPage extends GamePageBase {
	bracketHtml: string = "";
	opponentHtml: string = "";
	allTeamChangesHtml: string = "";
	showAllTeamChanges: boolean = false;
	showBracket: boolean = false;

	declare activity: BattleElimination;
	declare pageId: string;

	rulesHtml: string;
	battleEliminationTeambuilder: BattleEliminationTeambuilder;

	constructor(game: ScriptedGame, player: Player, baseCommand: string, options: IBattleEliminationPageOptions) {
		super(game, player, baseCommand, options);

		this.pageId = game.id;
		this.rulesHtml = options.rulesHtml;
		if (options.showBracket) this.showBracket = options.showBracket;

		this.setSwitchLocationButton();

		this.battleEliminationTeambuilder = new BattleEliminationTeambuilder(this, this.commandPrefix,
			battleEliminationTeambuilderCommand, {
				game: game as BattleElimination,
				player,
				rerollCommand: options.rerollCommand,
				gen: options.gen,
				modelGeneration: Dex.getModelGenerationName(options.gen),
				reRender: () => this.send(),
			});

		this.components = [this.battleEliminationTeambuilder];
	}

	setBracketHtml(html: string): void {
		this.bracketHtml = html;
	}

	setOpponentHtml(html: string): void {
		this.opponentHtml = html;
	}

	setRulesHtml(html: string): void {
		this.rulesHtml = html;
	}

	setAllTeamChangesHtml(html: string): void {
		this.allTeamChangesHtml = html;
	}

	tryCommand(command: string, targets: string[]): void {
		if (this.tryGlobalCommand(command)) return;

		if (command === showAllTeamChangesCommand) {
			if (this.showAllTeamChanges) return;

			this.showAllTeamChanges = true;
			this.send();
		} else if (command === hideAllTeamChangesCommand) {
			if (!this.showAllTeamChanges) return;

			this.showAllTeamChanges = false;
			this.send();
		} else {
			this.checkComponentCommands(command, targets);
		}
	}

	syncRound(): void {
		this.battleEliminationTeambuilder.syncRound();
	}

	giveStartingTeam(): void {
		this.battleEliminationTeambuilder.giveStartingTeam();
	}

	onSend(): void {
		super.onSend();

		this.activity.debugLog("Sent " + this.player.id + " the page: " + this.lastRender);
	}

    renderDetails(): string {
        let html = "";

		if (this.activity.eliminationEnded) {
			if (this.player === this.activity.getFinalPlayer()) {
				html += "<h3>Congratulations! You won the tournament.</h3>";
			} else {
				html += "<h3>The tournament has ended!</h3>";
			}
			html += "<br />";
		} else {
			html += this.rulesHtml;
		}

		html += this.opponentHtml;

		if (this.showBracket) {
			html += "<h3><u>" + (this.activity.eliminationEnded ? "Final bracket" : "Bracket") + "</u></h3>" +
				(this.bracketHtml || "The bracket will be created once the tournament starts.") + "<br /><br />";
		}

		html += "<br /><br />";
		html += "Select view: ";
		html += this.getQuietPmButton(this.commandPrefix + ", " + hideAllTeamChangesCommand, "Teambuilder",
			{selectedAndDisabled: !this.showAllTeamChanges});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + showAllTeamChangesCommand, "All Rounds",
			{selectedAndDisabled: this.showAllTeamChanges});

		if (this.showAllTeamChanges) {
			html += "<br /><br />";
			html += this.allTeamChangesHtml;
		} else {
			html += this.battleEliminationTeambuilder.render();
		}

		return html;
    }
}
