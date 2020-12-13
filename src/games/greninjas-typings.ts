import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "proteaneye" | "captainproteaneye";

const data: {pokedex: string[]; reverseTypes: Dict<string>; species: Dict<string>; types: Dict<string>} = {
	pokedex: [],
	reverseTypes: {},
	species: {},
	types: {},
};

class GreninjasTypings extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'proteaneye': {name: "Protean Eye", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainproteaneye': {name: "Captain Protean Eye", type: 'all-answers-team', bits: 1000, mode: 'team', description: "get every " +
			"answer for your team and win the game"},
	};

	allAnswersAchievement = GreninjasTypings.achievements.proteaneye;
	allAnswersTeamAchievement = GreninjasTypings.achievements.captainproteaneye;
	lastPokemon: string = '';
	lastTyping: string = '';
	noOrder: boolean = false;

	static loadData(): void {
		const pokedex = Games.getPokemonList(x => !x.name.startsWith('Arceus-') && !x.name.startsWith('Silvally-'));
		for (const pokemon of pokedex) {
			data.pokedex.push(pokemon.id);
			data.species[pokemon.id] = pokemon.name;
			data.reverseTypes[pokemon.id] = pokemon.types.slice().reverse().join('/');
			data.types[pokemon.id] = pokemon.types.join('/');
		}
	}

	generateAnswer(): void {
		let pokemon = this.sampleOne(data.pokedex);
		let typing = data.types[pokemon];
		let reverseTyping = data.reverseTypes[pokemon];
		while (!typing.includes('/') || typing === this.lastTyping || (this.noOrder && reverseTyping === this.lastTyping)) {
			pokemon = this.sampleOne(data.pokedex);
			typing = data.types[pokemon];
			reverseTyping = data.reverseTypes[pokemon];
		}
		const answers: string[] = [];
		for (const otherPokemon of data.pokedex) {
			if (typing === data.types[otherPokemon] || (this.noOrder && typing === data.reverseTypes[otherPokemon])) {
				answers.push(data.species[otherPokemon]);
			}
		}
		this.lastTyping = typing;
		this.answers = answers;
		this.hint = "<b>Randomly generated typing</b>: <i>" + typing + "</i>";
	}
}

export const game: IGameFile<GreninjasTypings> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['greninjas'],
	category: 'knowledge',
	class: GreninjasTypings,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon that match the given typing!",
	freejoin: true,
	formerNames: ['Typings'],
	name: "Greninja's Typings",
	mascot: "Greninja",
	minigameCommand: 'typing',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon that match the given typing!",
	modes: ["multianswer", "survival", "team", "timeattack"],
	variants: [
		{
			name: "Greninja's No Order Typings",
			description: "Players guess Pokemon that match the given typing (order not important)!",
			noOrder: true,
			variantAliases: ['no order'],
		},
	],
});
