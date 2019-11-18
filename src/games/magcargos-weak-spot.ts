import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Magcargo's Weak Spot";
const data: {pokedex: string[], inverseTypeKeys: string[], inverseTypeWeaknesses: Dict<string[]>, typeKeys: string[], typeWeaknesses: Dict<string[]>} = {
	pokedex: [],
	inverseTypeKeys: [],
	inverseTypeWeaknesses: {},
	typeKeys: [],
	typeWeaknesses: {},
};
let loadedData = false;

class MagcargosWeakSpot extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		const types = Object.keys(Dex.data.typeChart);
		const pokemonList = Dex.getPokemonList(x => !x.species.startsWith("Arceus-") && !x.species.startsWith('Silvally-'));
		for (let i = 0; i < pokemonList.length; i++) {
			for (let j = 0; j < types.length; j++) {
				const effectiveness = Dex.getEffectiveness(types[j], pokemonList[i]);
				if (Dex.isImmune(types[j], pokemonList[i]) || effectiveness <= -1) {
					if (!(types[j] in data.inverseTypeWeaknesses)) {
						data.inverseTypeWeaknesses[types[j]] = [];
						data.inverseTypeKeys.push(types[j]);
					}
					data.inverseTypeWeaknesses[types[j]].push(pokemonList[i].species);
				} else if (effectiveness >= 1) {
					if (!(types[j] in data.typeWeaknesses)) {
						data.typeWeaknesses[types[j]] = [];
						data.typeKeys.push(types[j]);
					}
					data.typeWeaknesses[types[j]].push(pokemonList[i].species);
				}
			}
		}

		loadedData = true;
	}

	inverseTypes: boolean = false;
	lastAnswers: string[] = [];
	lastPokemon: string = '';
	lastType: string = '';
	roundGuesses = new Map<Player, boolean>();

	async setAnswers() {
		const typeKeys: string[] = this.inverseTypes ? data.inverseTypeKeys : data.typeKeys;
		const typeWeaknesses: Dict<string[]> = this.inverseTypes ? data.inverseTypeWeaknesses : data.typeWeaknesses;
		let type = this.sampleOne(typeKeys);
		let pokemon = this.sampleMany(typeWeaknesses[type], 3).sort();
		while (type === this.lastType || pokemon.join(', ') === this.lastPokemon) {
			type = this.sampleOne(typeKeys);
			pokemon = this.sampleMany(typeWeaknesses[type], 3).sort();
		}
		this.lastPokemon = pokemon.join(', ');
		this.lastType = type;

		const answers: string[] = [type];
		for (const i in typeWeaknesses) {
			if (i === type) continue;
			let containsPokemon = true;
			for (let j = 0; j < pokemon.length; j++) {
				if (!typeWeaknesses[i].includes(pokemon[j])) {
					containsPokemon = false;
					break;
				}
			}
			if (containsPokemon) answers.push(i);
		}
		let containsPreviousAnswer = false;
		for (let i = 0; i < answers.length; i++) {
			if (this.lastAnswers.includes(answers[i])) {
				containsPreviousAnswer = true;
				break;
			}
		}
		if (containsPreviousAnswer) {
			await this.setAnswers();
			return;
		}

		this.roundGuesses.clear();
		this.lastAnswers = answers;
		this.answers = answers;
		this.hint = "Randomly generated Pokemon: **" + pokemon.join(", ") + "**";
	}
}

export const game: IGameFile<MagcargosWeakSpot> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["Magcargos", "ws"],
	class: MagcargosWeakSpot,
	defaultOptions: ['points'],
	description: "Players guess the weakness(es) that the given Pokemon share!",
	formerNames: ["Weak Spot"],
	freejoin: true,
	name,
	mascot: "Magcargo",
	modes: ['survival'],
	variants: [
		{
			name: "Magcargo's Inverse Weak Spot",
			description: "Using an inverted type chart, players guess the weakness(es) that the given Pokemon share!",
			inverseTypes: true,
			variant: "inverse",
		},
	],
});
