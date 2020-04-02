import { IGameFile } from "../types/games";
import { IMoveCard } from "./templates/card";
import { CardHighLow, game as cardGame } from "./templates/card-high-low";

class MewsMoveCards extends CardHighLow {
	canLateJoin: boolean = true;
	categoriesNames: Dict<string> = {'basePower': 'Base Power', 'pp': 'PP', 'accuracy': 'Accuracy', 'availability': 'Availability'};
	detailCategories: string[] = ['basePower', 'pp', 'accuracy', 'availability'];
	maxPlayers: number = 15;
	usesMoves: boolean = true;

	createDeckPool(): void {
		this.deckPool = [];

		const moves = Games.getMovesCopyList(move => {
			if (!move.basePower || !move.accuracy || !move.pp || isNaN(move.basePower) || move.basePower <= 0 || move.accuracy === true || isNaN(move.accuracy) || move.accuracy === 100 ||
				isNaN(move.pp)) return false;
			return true;
		});

		const pokedex = Games.getPokemonList();
		for (let i = 0; i < moves.length; i++) {
			const availability = Dex.getMoveAvailability(moves[i], pokedex);
			if (!availability) continue;
			const move = moves[i] as IMoveCard;
			move.availability = availability;
			this.deckPool.push(move);
		}
	}

	getCardDetail(card: IMoveCard, detail: string): number {
		// @ts-ignore
		return card[detail];
	}
}

export const game: IGameFile<MewsMoveCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["mews", "mmc"],
	commandDescriptions: [Config.commandCharacter + "play [move]"],
	class: MewsMoveCards,
	description: "Players try to play the highest (or lowest) move card in the randomly chosen category each round!",
	name: "Mew's Move Cards",
	mascot: "Mew",
	scriptedOnly: true,
});
