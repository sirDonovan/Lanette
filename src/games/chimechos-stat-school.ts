import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Chimecho's Stat School";
const data: {stats: Dict<string[]>} = {
	stats: {},
};
const statsKeys: string[] = [];
let loadedData = false;

class ChimechosStatSchool extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemon = Dex.getPokemonList();
		for (let i = 0; i < pokemon.length; i++) {
			const stats = Object.values(pokemon[i].baseStats).join(" / ");
			if (!(stats in data.stats)) {
				data.stats[stats] = [];
				statsKeys.push(stats);
			}
			data.stats[stats].push(pokemon[i].species);
		}

		loadedData = true;
	}

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	async setAnswers() {
		const stats = this.sampleOne(statsKeys);
		this.answers = data.stats[stats];
		this.hint = "**Base stats**: " + stats;
	}
}

export const game: IGameFile<ChimechosStatSchool> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['chimechos', 'css', 'statschool'],
	class: ChimechosStatSchool,
	defaultOptions: ['points'],
	description: "Players guess Pokémon with the given base stat distributions!",
	freejoin: true,
	name,
	mascot: "Chimecho",
	modes: ["survival"],
});
