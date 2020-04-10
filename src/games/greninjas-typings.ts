import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Greninja's Typings";
const data: {pokedex: string[]; reverseTypes: Dict<string>; species: Dict<string>; types: Dict<string>} = {
	pokedex: [],
	reverseTypes: {},
	species: {},
	types: {},
};
let loadedData = false;

const achievements: AchievementsDict = {
	'proteaneye': {name: "Protean Eye", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	'captainproteaneye': {name: "Captain Protean Eye", type: 'all-answers-team', bits: 1000, mode: 'team', description: "get every answer for your team and win"},
};

class GreninjasTypings extends Guessing {
	allAnswersAchievement = achievements.proteaneye;
	allAnswersTeamAchievement = achievements.captainproteaneye;
	lastPokemon: string = '';
	lastTyping: string = '';
	noOrder: boolean = false;

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Games.getPokemonList(x => !x.name.startsWith('Arceus-') && !x.name.startsWith('Silvally-'));
		for (const pokemon of pokedex) {
			data.pokedex.push(pokemon.id);
			data.species[pokemon.id] = pokemon.name;
			data.reverseTypes[pokemon.id] = pokemon.types.slice().reverse().join('/');
			data.types[pokemon.id] = pokemon.types.join('/');
		}

		loadedData = true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		let pokemon = this.sampleOne(data.pokedex);
		let typing = data.types[pokemon];
		let reverseTyping = data.reverseTypes[pokemon];
		while (!typing.includes('/') || typing === this.lastTyping || (this.noOrder && reverseTyping === this.lastTyping)) {
			pokemon = this.sampleOne(data.pokedex);
			typing = data.types[pokemon];
			reverseTyping = data.reverseTypes[pokemon];
		}
		const answers: string[] = [];
		for (const pokemon of data.pokedex) {
			if (typing === data.types[pokemon] || (this.noOrder && typing === data.reverseTypes[pokemon])) {
				answers.push(data.species[pokemon]);
			}
		}
		this.lastTyping = typing;
		this.answers = answers;
		this.hint = "<b>Randomly generated typing</b>: <i>" + typing + "</i>";
	}
}

export const game: IGameFile<GreninjasTypings> = Games.copyTemplateProperties(guessingGame, {
	achievements,
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
	modes: ["survival", "team"],
	variants: [
		{
			name: "Greninja's No Order Typings",
			description: "Players guess Pokemon that match the given typing (order not important)!",
			noOrder: true,
			variant: "noorder",
		},
	],
});
