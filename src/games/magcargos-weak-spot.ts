import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Magcargo's Weak Spot";
const data: {pokedex: string[]; inverseTypeKeys: string[]; inverseTypeWeaknesses: Dict<string[]>; typeKeys: string[]; typeWeaknesses: Dict<string[]>} = {
	pokedex: [],
	inverseTypeKeys: [],
	inverseTypeWeaknesses: {},
	typeKeys: [],
	typeWeaknesses: {},
};
let loadedData = false;

const achievements: AchievementsDict = {
	"achillesheel": {name: "Achilles Heel", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	"captainachilles": {name: "Captain Achilles", type: 'all-answers-team', bits: 1000, description: 'get every answer for your team and win'},
};

class MagcargosWeakSpot extends Guessing {
	allAnswersAchievement = achievements.achillesheel;
	allAnswersTeamAchievement = achievements.captainachilles;
	inverseTypes: boolean = false;
	lastAnswers: string[] = [];
	lastPokemon: string = '';
	lastType: string = '';
	roundGuesses = new Map<Player, boolean>();

	static loadData(room: Room): void {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		const types = Object.keys(Dex.data.typeChart);
		const pokemonList = Games.getPokemonList(x => !x.name.startsWith("Arceus-") && !x.name.startsWith('Silvally-'));
		for (const pokemon of pokemonList) {
			for (const type of types) {
				const effectiveness = Dex.getEffectiveness(type, pokemon);
				if (Dex.isImmune(type, pokemon) || effectiveness <= -1) {
					if (!(type in data.inverseTypeWeaknesses)) {
						data.inverseTypeWeaknesses[type] = [];
						data.inverseTypeKeys.push(type);
					}
					data.inverseTypeWeaknesses[type].push(pokemon.name);
				} else if (effectiveness >= 1) {
					if (!(type in data.typeWeaknesses)) {
						data.typeWeaknesses[type] = [];
						data.typeKeys.push(type);
					}
					data.typeWeaknesses[type].push(pokemon.name);
				}
			}
		}

		loadedData = true;
	}

	async setAnswers(): Promise<void> {
		const typeKeys: string[] = this.inverseTypes ? data.inverseTypeKeys : data.typeKeys;
		const typeWeaknesses: Dict<string[]> = this.inverseTypes ? data.inverseTypeWeaknesses : data.typeWeaknesses;
		let type = this.sampleOne(typeKeys);
		let pokemonList = this.sampleMany(typeWeaknesses[type], 3).sort();
		while (type === this.lastType || pokemonList.join(', ') === this.lastPokemon) {
			type = this.sampleOne(typeKeys);
			pokemonList = this.sampleMany(typeWeaknesses[type], 3).sort();
		}
		this.lastPokemon = pokemonList.join(', ');
		this.lastType = type;

		const answers: string[] = [type];
		for (const i in typeWeaknesses) {
			if (i === type) continue;
			let containsPokemon = true;
			for (const pokemon of pokemonList) {
				if (!typeWeaknesses[i].includes(pokemon)) {
					containsPokemon = false;
					break;
				}
			}
			if (containsPokemon) answers.push(i);
		}
		let containsPreviousAnswer = false;
		for (const answer of answers) {
			if (this.lastAnswers.includes(answer)) {
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
		this.hint = "<b>Randomly generated Pokemon</b>: <i>" + pokemonList.join(", ") + "</i>";
	}
}

export const game: IGameFile<MagcargosWeakSpot> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ["Magcargos", "ws"],
	category: 'knowledge',
	class: MagcargosWeakSpot,
	defaultOptions: ['points'],
	description: "Players guess the weakness(es) that the given Pokemon share!",
	formerNames: ["Weak Spot"],
	freejoin: true,
	name,
	mascot: "Magcargo",
	modes: ['survival', 'team'],
	variants: [
		{
			name: "Magcargo's Inverse Weak Spot",
			description: "Using an inverted type chart, players guess the weakness(es) that the given Pokemon share!",
			inverseTypes: true,
			variant: "inverse",
		},
	],
});
