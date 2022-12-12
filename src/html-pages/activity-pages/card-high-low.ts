import type { ICard } from "../../games/templates/card";
import type { CardHighLow } from "../../games/templates/card-high-low";
import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { CardMatchingPage, type ICardMatchingPageOptions } from "./card-matching";

export class CardHighLowPage extends CardMatchingPage {

	detailLabelWidth: number = 50;

	declare activity: CardHighLow;
	declare pageId: string;

	constructor(game: ScriptedGame, player: Player, baseCommand: string, options: ICardMatchingPageOptions) {
		super(game, player, baseCommand, options);

        if (options.detailLabelWidth) this.detailLabelWidth = options.detailLabelWidth;
		if (options.showColors) this.showColors = true;
		if (options.showEggGroups) this.showEggGroups = true;
		if (options.showTypings) this.showTypings = true;

		this.setSwitchLocationButton();
	}

	getCardsPrivateHtml(cards: ICard[]): string {
		const cardInfo: {card: ICard; detail: number}[] = [];
		for (const card of cards) {
			cardInfo.push({card: card, detail: this.activity.getCardDetail(card, this.activity.currentCategory)});
		}

		const sorted = this.activity.sortCardInfoForRound(cardInfo);

		const canPlay = this.activity.currentCategory && !this.activity.roundPlays.has(this.player);
		let bestDetail = -1;
		if (canPlay) {
			bestDetail = sorted[0].detail;
		}

		const data = Dex.getData();
		const cardsHtml: string[] = [];
		for (const info of sorted) {
			const card = info.card;
			let cardHtml = '<div class="infobox">';
			if (canPlay) {
				cardHtml += Client.getQuietPmButton(this.getPmRoom(), Config.commandCharacter + "play " + card.name, "Play!") +
					'&nbsp;&nbsp;|&nbsp;';
			}

			const currentHex = Tools.getNamedHexCode('Black');
			let otherCategoryHex = currentHex;
			if (data.pokemonKeys.includes(card.id)) {
				const pokemon = Dex.getExistingPokemon(card.id);
				cardHtml += Dex.getPokemonIcon(pokemon);
				otherCategoryHex = Tools.getPokemonColorHexCode(pokemon.color)!;
			} else if (data.moveKeys.includes(card.id)) {
				const move = Dex.getExistingMove(card.id);
				cardHtml += Dex.getMoveCategoryIcon(move) + "&nbsp;";
				otherCategoryHex = Tools.getMoveCategoryHexCode(move.category)!;
			}

			const bolded = canPlay && info.detail === bestDetail;
			if (bolded) {
				cardHtml += '<b>' + card.name + '</b>';
			} else {
				cardHtml += card.name + '';
			}

			if (this.activity.currentCategory) {
				cardHtml += '&nbsp;|&nbsp;<b>Current category</b>:&nbsp;' + Tools.getTypeOrColorLabel(currentHex, info.detail +
					'<br /><span title="' + this.activity.categoryNames[this.activity.currentCategory] + '">' +
					this.activity.categoryAbbreviations[this.activity.currentCategory] + '</span>', this.detailLabelWidth);

				cardHtml += '<br />';

				const otherCategories: string[] = [];
				for (const category of this.activity.detailCategories) {
					if (category === this.activity.currentCategory) continue;
					const detail = '' + this.activity.getCardDetail(card, category);
					otherCategories.push(Tools.getTypeOrColorLabel(otherCategoryHex, detail +
						'<br /><span title="' + this.activity.categoryNames[category] + '">' +
						this.activity.categoryAbbreviations[category] + '</span>', this.detailLabelWidth));
				}
				cardHtml += '<div>' + otherCategories.join('&nbsp;|&nbsp;') + '</div>';
			}

			cardHtml += '</div>';

			cardsHtml.push(cardHtml);
		}

		return cardsHtml.join("<br />");
	}
}
