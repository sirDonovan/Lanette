import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "achillesheel" | "captainachilles";

const data: {pokedex: string[]; inverseTypeKeys: string[]; inverseTypeWeaknesses: Dict<string[]>; typeKeys: string[];
	typeWeaknesses: Dict<string[]>;} = {
	pokedex: [],
	inverseTypeKeys: [],
	inverseTypeWeaknesses: {},
	typeKeys: [],
	typeWeaknesses: {},
};

class MagcargosWeakSpot extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"achillesheel": {name: "Achilles Heel", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
		"captainachilles": {name: "Captain Achilles", type: 'all-answers-team', bits: 1000, description: 'get every answer for your team ' +
			'and win the game'},
	};

	allAnswersAchievement = MagcargosWeakSpot.achievements.achillesheel;
	allAnswersTeamAchievement = MagcargosWeakSpot.achievements.captainachilles;
	inverseTypes: boolean = false;
	lastAnswers: string[] = [];
	lastPokemon: string = '';
	lastType: string = '';
	roundGuesses = new Map<Player, boolean>();

	static loadData(): void {
		const types: string[] = [];
		for (const key of Dex.data.typeKeys) {
			types.push(Dex.getExistingType(key).name);
		}

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
	}

	generateAnswer(): void {
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
			this.generateAnswer();
			return;
		}

		this.roundGuesses.clear();
		this.lastAnswers = answers;
		this.answers = answers;
		this.hint = "<b>Randomly generated Pokemon</b>: <i>" + pokemonList.join(", ") + "</i>";
	}
}

export const game: IGameFile<MagcargosWeakSpot> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["Magcargos", "ws"],
	category: 'knowledge',
	class: MagcargosWeakSpot,
	defaultOptions: ['points'],
	description: "Players guess the weakness(es) that the given Pokemon share!",
	formerNames: ["Weak Spot"],
	freejoin: true,
	name: "Magcargo's Weak Spot",
	mascot: "Magcargo",
	modes: ['multianswer', 'survival', 'team', 'timeattack'],
	variants: [
		{
			name: "Magcargo's Inverse Weak Spot",
			description: "Using an inverted type chart, players guess the weakness(es) that the given Pokemon share!",
			inverseTypes: true,
			variantAliases: ['inverse'],
		},
	],
});
