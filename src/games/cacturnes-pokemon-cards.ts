import type { IGameFile } from "../types/games";
import type { IPokemonCard } from "./templates/card";
import { CardHighLow, game as cardGame } from "./templates/card-high-low";

class CacturnesPokemonCards extends CardHighLow {
	canLateJoin: boolean = true;
	categoryAbbreviations: Dict<string> = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', bst: 'BST'};
	categoryNames: Dict<string> = {hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Special Attack', spd: 'Special Defense', spe: 'Speed',
		bst: 'Base Stat Total',
	};
	detailCategories: string[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

	getCardDetail(card: IPokemonCard, detail: string): number {
		if (detail === 'bst') {
			let bst = 0;
			for (const i in card.baseStats) {
				// @ts-expect-error
				bst += card.baseStats[i];
			}
			return bst;
		} else {
			// @ts-expect-error
			return card.baseStats[detail] as number;
		}
	}
}

export const game: IGameFile<CacturnesPokemonCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["cacturnes", "cpc"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]"],
	class: CacturnesPokemonCards,
	description: "Players try to play the highest (or lowest) Pokemon card in the randomly chosen category each round!",
	name: "Cacturne's Pokemon Cards",
	noOneVsOne: true,
	mascot: "Cacturne",
	scriptedOnly: true,
});
