import { IGameFile } from "../types/games";
import { IMoveCard } from "./templates/card";
import { CardHighLow, commands as templateCommands } from "./templates/card-high-low";

class MewsMoveCards extends CardHighLow {
	canLateJoin: boolean = true;
	categoriesNames: Dict<string> = {'basePower': 'Base Power', 'pp': 'PP', 'accuracy': 'Accuracy', 'availability': 'Availability'};
	detailCategories: string[] = ['basePower', 'pp', 'accuracy', 'availability'];
	maxPlayers: number = 15;
	usesMoves: boolean = true;

	createDeckPool() {
		this.deckPool = [];

		const pokedex = Dex.getPokemonList();
		const moves = Dex.getMovesCopyList(move => {
			if (!move.basePower || !move.accuracy || !move.pp || isNaN(move.basePower) || move.basePower <= 0 || move.accuracy === true || isNaN(move.accuracy) || move.accuracy === 100 ||
				isNaN(move.pp)) return false;
			return true;
		});

		for (let i = 0; i < moves.length; i++) {
			const move = moves[i] as IMoveCard;
			const availability: string[] = [];
			for (let i = 0; i < pokedex.length; i++) {
				if (pokedex[i].allPossibleMoves.includes(move.id) && !(pokedex[i].baseSpecies !== pokedex[i].species && availability.includes(pokedex[i].baseSpecies))) {
					availability.push(pokedex[i].species);
				}
			}
			if (!availability.length) continue;
			move.availability = availability.length;
			this.deckPool.push(move);
		}
	}

	getCardDetail(card: IMoveCard, detail: string) {
		// @ts-ignore
		return card[detail];
	}
}

export const game: IGameFile<MewsMoveCards> = {
	aliases: ["mews", "mmc"],
	commandDescriptions: [Config.commandCharacter + "play [move]"],
	commands: Object.assign({}, templateCommands),
	class: MewsMoveCards,
	description: "Players try to play the highest (or lowest) move card in the randomly chosen category each round!",
	name: "Mews's Move Cards",
	mascot: "Mew",
	scriptedOnly: true,
};
