import type { IGameFile } from "../types/games";
import type { IMoveCard } from "./templates/card";
import { CardHighLow, game as cardGame } from "./templates/card-high-low";

class MewsMoveCards extends CardHighLow {
	canLateJoin: boolean = true;
	categoryAbbreviations: Dict<string> = {'basePower': 'BP', 'pp': 'PP', 'accuracy': 'ACC', 'availability': 'AVAL'};
	categoryNames: Dict<string> = {'basePower': 'Base Power', 'pp': 'Power Points', 'accuracy': 'Accuracy',
		'availability': 'Availability'};
	detailCategories: string[] = ['basePower', 'pp', 'accuracy', 'availability'];
	maxPlayers: number = 15;

	createDeckPool(): void {
		this.deckPool = [];

		const moves = Games.getMovesCopyList(move => {
			if (!move.basePower || !move.accuracy || !move.pp || isNaN(move.basePower) || move.basePower <= 0 || move.accuracy === true ||
				isNaN(move.accuracy) || move.accuracy === 100 || isNaN(move.pp)) return false;
			return true;
		});

		for (const move of moves) {
			const availability = Dex.getMoveAvailability(move);
			if (!availability) continue;
			this.deckPool.push(this.moveToCard(move, availability));
		}
	}

	getCardDetail(card: IMoveCard, detail: string): number {
		// @ts-expect-error
		return card[detail] as number;
	}
}

export const game: IGameFile<MewsMoveCards> = Games.copyTemplateProperties(cardGame, {
	aliases: ["mews", "mmc"],
	commandDescriptions: [Config.commandCharacter + "play [move]"],
	class: MewsMoveCards,
	description: "Players try to play the highest (or lowest) move card in the randomly chosen category each round!",
	name: "Mew's Move Cards",
	noOneVsOne: true,
	mascot: "Mew",
	scriptedOnly: true,
});
