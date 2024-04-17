import type { BattleElimination } from "../../games/templates/battle-elimination";
import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { BattleEliminationTeambuilder } from "../components/battle-elimination-teambuilder";
import { HtmlSelector } from "../html-page-base";
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
	allTeamChangesHtml: string = "";
	bracketHtml: string = "";
	opponentHtml: string = "";
	showAllTeamChanges: boolean = false;
	showBracket: boolean = false;
	usesHtmlSelectors: boolean = true;

	declare activity: BattleElimination;
	declare pageId: string;

	allTeamChangesSelector: HtmlSelector;
	battleEliminationTeambuilder: BattleEliminationTeambuilder;
	battleEliminationTeambuilderSelector: HtmlSelector;
	bracketSelector: HtmlSelector;
	opponentSelector: HtmlSelector;
	rulesHtml: string;
	rulesSelector: HtmlSelector;

	constructor(game: ScriptedGame, player: Player, baseCommand: string, options: IBattleEliminationPageOptions) {
		super(game, player, baseCommand, options);

		this.pageId = game.id;

		this.allTeamChangesSelector = this.newSelector("allteamchanges");
		this.bracketSelector = this.newSelector("bracket");
		this.opponentSelector = this.newSelector("opponent");
		this.rulesSelector = this.newSelector("rules");
		this.battleEliminationTeambuilderSelector = this.newSelector("teambuilder");

		this.addSelector(this.rulesSelector);
		this.addSelector(this.opponentSelector);
		this.addSelector(this.bracketSelector);
		this.addSelector(this.allTeamChangesSelector);
		this.addSelector(this.battleEliminationTeambuilderSelector);

		this.rulesHtml = options.rulesHtml;
		if (options.showBracket) this.showBracket = options.showBracket;

		this.setSwitchLocationButtonHtml();

		this.battleEliminationTeambuilder = new BattleEliminationTeambuilder(this, this.commandPrefix,
			battleEliminationTeambuilderCommand, {
				htmlPageSelector: this.battleEliminationTeambuilderSelector,
				game: game as BattleElimination,
				player,
				rerollCommand: options.rerollCommand,
				gen: options.gen,
				modelGeneration: Dex.getModelGenerationName(options.gen),
			});

		this.components = [this.battleEliminationTeambuilder];
	}

	initializeSelectors(): void {
		if (this.initializedSelectors) return;

		super.initializeSelectors();

		this.battleEliminationTeambuilder.toggleActive(!this.showAllTeamChanges, true);
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
			this.battleEliminationTeambuilder.toggleActive(false);
		} else if (command === hideAllTeamChangesCommand) {
			if (!this.showAllTeamChanges) return;

			this.showAllTeamChanges = false;
			this.send();
			this.battleEliminationTeambuilder.toggleActive(true);
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

	onSendSelector(selector: HtmlSelector): void {
		super.onSendSelector(selector);

		this.activity.debugLog("Sent " + this.player.id + " the selector " + selector.id + ": " + this.lastSelectorRenders[selector.id]);
	}

	renderSelector(selector: HtmlSelector): string {
		if (selector === this.headerSelector) {
			return super.renderSelector(selector);
		}

		let html = "";
		if (selector === this.rulesSelector) {
			if (this.activity.eliminationEnded) {
				if (this.player === this.activity.getFinalPlayer()) {
					html += "<h3>Congratulations! You won the tournament.</h3>";
				} else {
					html += "<h3>The tournament has ended!</h3>";
				}
			} else {
				html += this.rulesHtml;
			}
		} else if (selector === this.opponentSelector) {
			html += this.opponentHtml;
		} else if (selector === this.bracketSelector) {
			if (this.showBracket) {
				html += "<h3><u>" + (this.activity.eliminationEnded ? "Final bracket" : "Bracket") + "</u></h3>" +
					(this.bracketHtml || "The bracket will be created once the tournament starts.");
			}
		} else if (selector === this.allTeamChangesSelector) {
			html += "Select view: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + hideAllTeamChangesCommand, "Teambuilder",
				{selectedAndDisabled: !this.showAllTeamChanges});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + showAllTeamChangesCommand, "All Rounds",
				{selectedAndDisabled: this.showAllTeamChanges});

			if (this.showAllTeamChanges) {
				html += "<br />";
				html += this.allTeamChangesHtml;
			}
		} else {
			html += this.checkComponentSelectors(selector);
		}

		return html;
	}

	// only used for staff view
	renderDetails(): string {
		let html = "";
		const selectors = this.getSelectors();
		for (const selector of selectors) {
			if (selector === this.headerSelector) continue;

			html += this.renderSelector(selector);
		}

		return html;
	}
}
