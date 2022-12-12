import type { CardGame, ICard, IPokemonCard } from "../../games/templates/card";
import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { TextInput } from "../components/text-input";
import { GamePageBase, type IGamePageOptions } from "./game-page-base";

export interface ICardMatchingPageOptions extends IGamePageOptions {
    detailLabelWidth: number;
	showColors?: boolean;
	showEggGroups?: boolean;
	showTypings?: boolean;
}

const actionCardInputCommand = "actioncardinput";
const selectActionCardCommand = "selectactioncard";

export class CardMatchingPage extends GamePageBase {
	actionCardTarget: string = "";
	cardActionsHtml: string = "";
    currentHandHtml: string = "";
    drawnCardsHtml: string = "";
	playedCardsHtml: string = "";
	selectedActionCard: ICard | null = null;
	showColors: boolean = false;
	showSwitchLocationButton = true;
	showTypings: boolean = false;
	showEggGroups: boolean = false;

	detailLabelWidth: number;
	actionCardInput: TextInput;

	declare activity: CardGame;
	declare pageId: string;

	constructor(game: ScriptedGame, player: Player, baseCommand: string, options: ICardMatchingPageOptions) {
		super(game, player, baseCommand, options);

		this.pageId = game.id;

        this.detailLabelWidth = options.detailLabelWidth;
		if (options.showColors) this.showColors = true;
		if (options.showEggGroups) this.showEggGroups = true;
		if (options.showTypings) this.showTypings = true;

		this.setSwitchLocationButton();

		this.actionCardInput = new TextInput(this, this.commandPrefix, actionCardInputCommand, {
			hideClearButton: true,
			submitText: "Validate",
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.validateActionCardTarget(output),
			reRender: () => this.send(),
		});

		this.components = [this.actionCardInput];
	}

	getCardsPrivateHtml(cards: ICard[]): string {
		const html: string[] = [];
		for (const card of cards) {
			html.push('<div style="height:auto">' + this.getCardPrivateHtml(card) + '</div>');
		}

		return html.join("<br />");
	}

    getCardPrivateHtml(card: ICard): string {
		let html = '<div class="infobox">';

		if (card.action) {
			html += '&nbsp;&nbsp;' + Dex.getItemIcon(Dex.getExistingItem("Poke Ball")) + '&nbsp;';
		} else {
			if (this.activity.getDex().getData().pokemonKeys.includes(card.id)) {
				html += Dex.getPokemonIcon(Dex.getExistingPokemon(card.name));
			}
		}

		html += "<b>" + card.name + "</b>";

		const blackHex = Tools.getNamedHexCode('Black');

		html += "&nbsp;|&nbsp;";
		if (card.action) {
			html += '<b>Action</b>:&nbsp;' +
				Tools.getTypeOrColorLabel(blackHex, '&nbsp;&nbsp;&nbsp;' + card.action.description + '&nbsp;&nbsp;&nbsp;', 'auto');
		} else {
			html += this.getCardPrivateDetails(card as IPokemonCard);
		}

		html += '</div>';
		return html;
	}

    getCardPrivateDetails(card: IPokemonCard): string {
		let html = "";
		if (this.showTypings) html += "<b>Typing</b>:&nbsp;" + this.getChatTypeLabel(card);

		if (this.showColors) {
			if (html) html += "&nbsp;|&nbsp;";
			html += "<b>Color</b>:&nbsp;" + this.getChatColorLabel(card);
		}

		if (this.showEggGroups) {
			if (html) html += "&nbsp;|&nbsp;";
			html += "<b>Egg grouping</b>:&nbsp;" + this.getEggGroupLabel(card);
		}

		return html;
	}

    getChatTypeLabel(card: IPokemonCard): string {
		const types = [];
		for (const type of card.types) {
			types.push(Dex.getTypeHtml(Dex.getExistingType(type), this.detailLabelWidth));
		}
		return types.join("&nbsp;/&nbsp;");
	}

    getChatColorLabel(card: IPokemonCard): string {
		return Tools.getTypeOrColorLabel(Tools.getPokemonColorHexCode(card.color)!, card.color, this.detailLabelWidth);
	}

	getEggGroupLabel(card: IPokemonCard): string {
		const eggGroups = [];
		for (const eggGroup of card.eggGroups) {
			const colorData = Tools.getEggGroupHexCode(eggGroup)!;
			eggGroups.push(Tools.getTypeOrColorLabel(colorData, eggGroup, this.detailLabelWidth));
		}
		return eggGroups.join("&nbsp;/&nbsp;");
	}

	getCardPlayButton(card: ICard): string {
		let html = '';

		if (card.action) {
			if (card.action.requiredTarget) {
				html += this.getQuietPmButton(this.commandPrefix + ", " + selectActionCardCommand + ", " + card.name,
					"Enter target for <b>" + card.name + "</b>");
			}

			if (card.action.getRandomTarget) {
				if (html) html += "&nbsp; - ";
				html += this.activity.getMsgRoomButton(this.activity.playCommand + " " + card.action.getRandomTarget(this.activity,
					this.player), "Play <b>randomized " + card.name + "</b>", this.player.eliminated,
					this.player);
			}
		}

		if (!card.action || !card.action.requiredTarget) {
			if (html) html += "&nbsp; - ";
			html += this.activity.getMsgRoomButton(this.activity.playCommand + " " + card.name, "Play <b>" + card.name + "</b>",
				this.player.eliminated, this.player);
		}

		return html;
	}

	getCardGroupPlayButton(cards: ICard[]): string {
		const names = cards.map(x => x.name);
		return this.activity.getMsgRoomButton("play " + names.join(", "), "Play " + Tools.joinList(names, "<b>", "</b>"),
			this.player.eliminated, this.player);
	}

	validateActionCardTarget(target: string): void {
		if (!this.selectedActionCard) return;

		const user = Users.get(this.userName);
		if (!user) return;

		const error = this.selectedActionCard.action!.getTargetErrors(this.activity, target.split(","), this.player);
		if (error) {
			this.actionCardInput.updateAfterSubmitHtml("");
			this.actionCardInput.parentSetErrors([error]);
			this.send();
			return;
		}

		this.actionCardTarget = target;
		this.actionCardInput.updateAfterSubmitHtml("&nbsp; --> " + this.activity.getMsgRoomButton(this.activity.playCommand + " " +
			this.selectedActionCard.name + ", " + this.actionCardTarget, "Play <b>" + this.selectedActionCard.name + " " + target + "</b>",
			this.player.eliminated, this.player));
		this.send();
	}

	tryCommand(command: string, targets: string[]): void {
		if (this.tryGlobalCommand(command)) return;

		if (command === selectActionCardCommand) {
			const name = targets[0].trim();
			if (this.selectedActionCard && this.selectedActionCard.name === name) return;

			const playerCards = this.activity.playerCards.get(this.player)!;
			for (const card of playerCards) {
				if (card.action && card.name === name) {
					this.selectedActionCard = card;
					break;
				}
			}

			if (!this.selectedActionCard) return;

			this.actionCardInput.updateAfterSubmitHtml("");
			this.send();
		} else {
			this.checkComponentCommands(command, targets);
		}
	}

    renderDetails(): string {
        let html = "";
		if (this.currentHandHtml) html += this.currentHandHtml + "<br />";
		if (this.cardActionsHtml) html += this.cardActionsHtml + "<br />";

		if (this.selectedActionCard) {
			html += "<br /><br />" + this.actionCardInput.render();
		}

		if (this.playedCardsHtml) html += this.playedCardsHtml + "<br />";
		if (this.drawnCardsHtml) html += this.drawnCardsHtml + "<br />";

		return html;
    }

	renderHandHtml(): void {
		const playerCards = this.activity.playerCards.get(this.player)!.sort((a, b) => {
			if (b.action && !a.action) return 1;
			if (a.action && !b.action) return -1;
			return 0;
		});

		let html = '<b>Your cards' + (this.activity.finitePlayerCards ? " (" + playerCards.length + ")" : "") + '</b>:<br /><br />';
		html += this.getCardsPrivateHtml(playerCards);

		this.currentHandHtml = html;
	}

	renderCardActionsHtml(actionCards?: ICard[], groupCards?: ICard[][], singleCards?: ICard[]): void {
		const playButtons: string[] = [];
		if (actionCards) {
			for (const card of actionCards) {
				playButtons.push(this.getCardPlayButton(card));
			}
		}

		if (groupCards) {
			for (const card of groupCards) {
				playButtons.push(this.getCardGroupPlayButton(card));
			}
		}

		if (singleCards) {
			for (const card of singleCards) {
				playButtons.push(this.getCardPlayButton(card));
			}
		}

		let html = "";
		if (playButtons.length) {
			html += '<br /><b>Playable cards</b>' + (groupCards && groupCards.length && this.activity.maxShownPlayableGroupSize &&
				(!this.activity.maximumPlayedCards || this.activity.maxShownPlayableGroupSize < this.activity.maximumPlayedCards) ?
				' (there may be longer chains to play manually)' : '') + ':<br />' + playButtons.join("&nbsp;|&nbsp;");
		}

		this.cardActionsHtml = html;
		this.selectedActionCard = null;
	}

	renderDrawnCardsHtml(drawnCards?: ICard[]): void {
		let html = "";
		if (drawnCards) {
			html += "You drew <b>" + Tools.joinList(drawnCards.map(x => x.name)) + "</b>!";
		}

		this.drawnCardsHtml = html;
	}

	renderPlayedCardsHtml(playedCards?: ICard[]): void {
		let html = "";
		if (playedCards) {
			html += "You played <b>" + Tools.joinList(playedCards.map(x => x.name)) + "</b>!";
		}

		this.playedCardsHtml = html;
	}
}
