import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from './templates/guessing';

const data: {stats: Dict<string[]>} = {
	stats: {},
};
const statsKeys: string[] = [];

class ChimechosStatSchool extends Guessing {
	static loadData(room: Room | User): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const stats = Object.values(pokemon.baseStats).join(" / ");
			if (!(stats in data.stats)) {
				data.stats[stats] = [];
				statsKeys.push(stats);
			}
			data.stats[stats].push(pokemon.name);
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const stats = this.sampleOne(statsKeys);
		this.answers = data.stats[stats];
		this.hint = "<b>Randomly generated base stats</b>: <i>" + stats + "</i>";
	}
}

export const game: IGameFile<ChimechosStatSchool> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['chimechos', 'css', 'statschool'],
	category: 'knowledge',
	class: ChimechosStatSchool,
	defaultOptions: ['points'],
	description: "Players guess Pokemon with the given base stat distributions!",
	freejoin: true,
	name: "Chimecho's Stat School",
	mascot: "Chimecho",
	modes: ["survival", "team"],
});
