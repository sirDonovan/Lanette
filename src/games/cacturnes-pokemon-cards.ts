import { IGameFile } from "../types/games";
import { IPokemonCard } from "./templates/card";
import { CardHighLow, commands as templateCommands } from "./templates/card-high-low";

class CacturnesPokemonCards extends CardHighLow {
	canLateJoin: boolean = true;
	categoriesNames: Dict<string> = {hp: 'HP', atk: 'Atk', attack: 'Atk', def: 'Def', defense: 'Def', spa: 'SpA', specialattack: 'SpA', spd: 'SpD', specialdefense: 'SpD', spe: 'Spe',
		speed: 'Spe', bst: 'BST', basestattotal: 'BST'};
	detailCategories: string[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

	getCardDetail(card: IPokemonCard, detail: string): number {
		if (detail === 'bst') {
			let bst = 0;
			for (const i in card.baseStats) {
				// @ts-ignore
				bst += card.baseStats[i];
			}
			return bst;
		} else {
			// @ts-ignore
			return card.baseStats[detail];
		}
	}
}

export const game: IGameFile<CacturnesPokemonCards> = {
	aliases: ["cacturnes", "cpc"],
	commandDescriptions: [Config.commandCharacter + "play [Pokemon]"],
	commands: Object.assign({}, templateCommands),
	class: CacturnesPokemonCards,
	description: "Players try to play the highest (or lowest) Pokemon card in the randomly chosen category each round!",
	name: "Cacturne's Pokemon Cards",
	mascot: "Cacturne",
	scriptedOnly: true,
};
