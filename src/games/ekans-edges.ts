import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "livingontheedge";

function getEdge(word: string): string | null {
	if (word.length < 3 || !Tools.letters.includes(word.charAt(0).toLowerCase()) ||
		!Tools.letters.includes(word.substr(-1).toLowerCase())) return null;
	return word.charAt(0) + " - " + word.substr(-1);
}

class EkansEdges extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'livingontheedge': {name: "Living on the Edge", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = EkansEdges.achievements.livingontheedge;

	// eslint-disable-next-line @typescript-eslint/require-await
	static async loadData(): Promise<void> {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		const categoryHintKeys: Dict<string[]> = {
			"Characters": [],
			"Locations": [],
			"Pokemon": [],
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};
		const categoryHints: Dict<Dict<string[]>> = {
			"Characters": {},
			"Locations": {},
			"Pokemon": {},
			"Pokemon Abilities": {},
			"Pokemon Items": {},
			"Pokemon Moves": {},
		};

		for (const character of Dex.getCharacters()) {
			const edge = getEdge(character);
			if (!edge) continue;
			if (!(edge in categoryHints.Characters)) {
				categoryHintKeys.Characters.push(edge);
				categoryHints.Characters[edge] = [];
			}
			categoryHints.Characters[edge].push(character);
		}

		for (const location of Dex.getLocations()) {
			const edge = getEdge(location);
			if (!edge) continue;
			if (!(edge in categoryHints.Locations)) {
				categoryHintKeys.Locations.push(edge);
				categoryHints.Locations[edge] = [];
			}
			categoryHints.Locations[edge].push(location);
		}

		for (const pokemon of Games.getPokemonList()) {
			const edge = getEdge(pokemon.name);
			if (!edge) continue;
			if (!(edge in categoryHints.Pokemon)) {
				categoryHintKeys.Pokemon.push(edge);
				categoryHints.Pokemon[edge] = [];
			}
			categoryHints.Pokemon[edge].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			const edge = getEdge(ability.name);
			if (!edge) continue;
			if (!(edge in categoryHints["Pokemon Abilities"])) {
				categoryHintKeys["Pokemon Abilities"].push(edge);
				categoryHints["Pokemon Abilities"][edge] = [];
			}
			categoryHints["Pokemon Abilities"][edge].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const edge = getEdge(item.name);
			if (!edge) continue;
			if (!(edge in categoryHints["Pokemon Items"])) {
				categoryHintKeys["Pokemon Items"].push(edge);
				categoryHints["Pokemon Items"][edge] = [];
			}
			categoryHints["Pokemon Items"][edge].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const edge = getEdge(move.name);
			if (!edge) continue;
			if (!(edge in categoryHints["Pokemon Moves"])) {
				categoryHintKeys["Pokemon Moves"].push(edge);
				categoryHints["Pokemon Moves"][edge] = [];
			}
			categoryHints["Pokemon Moves"][edge].push(move.name);
		}

		this.cachedData.categoryHintKeys = categoryHintKeys;
		this.cachedData.categoryHintAnswers = categoryHints;
	}
}

export const game: IGameFile<EkansEdges> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['ekans', 'ee'],
	category: 'identification-1',
	class: EkansEdges,
	defaultOptions: ['points'],
	description: "Players guess answers that have the given starting and ending letters!",
	formerNames: ["Edges"],
	freejoin: true,
	name: "Ekans' Edges",
	mascot: "Ekans",
	minigameCommand: 'edge',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer with the given starting and ending letters!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
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
