import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "livingontheedge";

interface IEkansEdgesData {
	'Characters': Dict<string[]>;
	'Locations': Dict<string[]>;
	'Pokemon': Dict<string[]>;
	'Pokemon Abilities': Dict<string[]>;
	'Pokemon Items': Dict<string[]>;
	'Pokemon Moves': Dict<string[]>;
}

const data: IEkansEdgesData = {
	"Characters": {},
	"Locations": {},
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof IEkansEdgesData;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<DataKey, string[]> = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};

function getEdge(word: string): string | null {
	if (word.length < 3) return null;
	return word.charAt(0) + " - " + word.substr(-1);
}

class EkansEdges extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'livingontheedge': {name: "Living on the Edge", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = EkansEdges.achievements.livingontheedge;
	lastEdge: string = '';

	static loadData(): void {
		const characters = Dex.getCharacters();
		for (const character of characters) {
			const edge = getEdge(character);
			if (!edge) continue;
			if (!(edge in data["Characters"])) data["Characters"][edge] = [];
			data["Characters"][edge].push(character);
		}

		const locations = Dex.getLocations();
		for (const location of locations) {
			const edge = getEdge(location);
			if (!edge) continue;
			if (!(edge in data["Locations"])) data["Locations"][edge] = [];
			data["Locations"][edge].push(location);
		}

		for (const pokemon of Games.getPokemonList()) {
			const edge = getEdge(pokemon.name);
			if (!edge) continue;
			if (!(edge in data["Pokemon"])) data["Pokemon"][edge] = [];
			data["Pokemon"][edge].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			const edge = getEdge(ability.name);
			if (!edge) continue;
			if (!(edge in data["Pokemon Abilities"])) data["Pokemon Abilities"][edge] = [];
			data["Pokemon Abilities"][edge].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const edge = getEdge(item.name);
			if (!edge) continue;
			if (!(edge in data["Pokemon Items"])) data["Pokemon Items"][edge] = [];
			data["Pokemon Items"][edge].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const edge = getEdge(move.name);
			if (!edge) continue;
			if (!(edge in data["Pokemon Moves"])) data["Pokemon Moves"][edge] = [];
			data["Pokemon Moves"][edge].push(move.name);
		}

		const keys = Object.keys(data) as DataKey[];
		for (const key of keys) {
			dataKeys[key] = Object.keys(data[key]);
		}
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		let edge = this.sampleOne(dataKeys[category]);
		while (edge === this.lastEdge) {
			edge = this.sampleOne(dataKeys[category]);
		}
		this.lastEdge = edge;
		this.answers = data[category][edge];
		this.hint = "<b>" + category + "</b>: <i>" + edge + "</i>";
	}
}

export const game: IGameFile<EkansEdges> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['ekans', 'ee'],
	category: 'identification',
	class: EkansEdges,
	defaultOptions: ['points'],
	description: "Players guess answers that have the given starting and ending letters!",
	formerNames: ["Edges"],
	freejoin: true,
	name: "Ekans' Edges",
	mascot: "Ekans",
	minigameCommand: 'edge',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer with the given starting and ending letters!",
	modes: ["multianswer", "survival", "team", "timeattack"],
	variants: [
		{
			name: "Ekans' Ability Edges",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Ekans' Character Edges",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Ekans' Item Edges",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Ekans' Location Edges",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Ekans' Move Edges",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Ekans' Pokemon Edges",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
