import type { IGameFile } from "../types/games";
import type { IPokemonCard } from "./templates/card";
import { CardCloseFar, game as cardGame } from "./templates/card-close-far";

class CradilysCloseupCards extends CardCloseFar {
	canLateJoin: boolean = true;
	categoryAbbreviations: Dict<string> = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', bst: 'BST'};
	categoryNames: Dict<string> = {hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Special Attack', spd: 'Special Defense', spe: 'Speed',
		bst: 'Base Stat Total',
	};
	categoryMaxDetails: Dict<number> = {hp: 255, atk: 190, def: 250, spa: 194, spd: 250, spe: 200, bst: 780};
	categoryMinDetails: Dict<number> = {hp: 1, atk: 5, def: 5, spa: 10, spd: 20, spe: 5, bst: 175};
	closeOrFar: 'close' | 'far' = 'close';
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

export const game: IGameFile<CradilysCloseupCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["cradilys", "closeupcards", "cccards"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]"],
	class: CradilysCloseupCards,
	description: "Players try to play the Pokemon card closest to the randomly chosen category each round!",
	name: "Cradily's Closeup Cards",
	mascot: "Cradily",
	scriptedOnly: true,
});
