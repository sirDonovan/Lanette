import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "swiftplacing";

const MIN_LETTERS = 4;

class PiplupsLetterPlacements extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'swiftplacing': {name: "Swift Placing", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = PiplupsLetterPlacements.achievements.swiftplacing;

	static loadData(): void {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];

		const categoryHints: Dict<Dict<string[]>> = {
			"Characters": {},
			"Locations": {},
			"Pokemon": {},
			"Pokemon Abilities": {},
			"Pokemon Items": {},
			"Pokemon Moves": {},
		};
		const categoryHintKeys: Dict<string[]> = {
			"Characters": [],
			"Locations": [],
			"Pokemon": [],
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};

		/* eslint-disable @typescript-eslint/dot-notation */
		for (const character of Dex.getCharacters()) {
			const id = Tools.toId(character);
			if (id.length < MIN_LETTERS) continue;

			for (let i = 0; i < id.length; i++) {
				const b = id[i + 1];
				const c = id[i + 2];
				if (!b || !c) break;

				const key = id[i] + b + c;
				if (!(key in categoryHints["Characters"])) {
					categoryHints["Characters"][key] = [];
					categoryHintKeys["Characters"].push(key);
				}

				if (!categoryHints["Characters"][key].includes(character)) {
					categoryHints["Characters"][key].push(character);
				}
			}
		}

		for (const location of Dex.getLocations()) {
			const id = Tools.toId(location);
			if (id.length < MIN_LETTERS) continue;

			for (let i = 0; i < id.length; i++) {
				const b = id[i + 1];
				const c = id[i + 2];
				if (!b || !c) break;

				const key = id[i] + b + c;
				if (!(key in categoryHints["Locations"])) {
					categoryHints["Locations"][key] = [];
					categoryHintKeys["Locations"].push(key);
				}

				if (!categoryHints["Locations"][key].includes(location)) {
					categoryHints["Locations"][key].push(location);
				}
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.id.length < MIN_LETTERS) continue;

			for (let i = 0; i < pokemon.id.length; i++) {
				const b = pokemon.id[i + 1];
				const c = pokemon.id[i + 2];
				if (!b || !c) break;

				const key = pokemon.id[i] + b + c;
				if (!(key in categoryHints["Pokemon"])) {
					categoryHints["Pokemon"][key] = [];
					categoryHintKeys["Pokemon"].push(key);
				}

				if (!categoryHints["Pokemon"][key].includes(pokemon.name)) {
					categoryHints["Pokemon"][key].push(pokemon.name);
				}
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			if (ability.id.length < MIN_LETTERS) continue;

			for (let i = 0; i < ability.id.length; i++) {
				const b = ability.id[i + 1];
				const c = ability.id[i + 2];
				if (!b || !c) break;

				const key = ability.id[i] + b + c;
				if (!(key in categoryHints["Pokemon Abilities"])) {
					categoryHints["Pokemon Abilities"][key] = [];
					categoryHintKeys["Pokemon Abilities"].push(key);
				}

				if (!categoryHints["Pokemon Abilities"][key].includes(ability.name)) {
					categoryHints["Pokemon Abilities"][key].push(ability.name);
				}
			}
		}

		for (const item of Games.getItemsList()) {
			if (item.id.length < MIN_LETTERS) continue;

			for (let i = 0; i < item.id.length; i++) {
				const b = item.id[i + 1];
				const c = item.id[i + 2];
				if (!b || !c) break;

				const key = item.id[i] + b + c;
				if (!(key in categoryHints["Pokemon Items"])) {
					categoryHints["Pokemon Items"][key] = [];
					categoryHintKeys["Pokemon Items"].push(key);
				}

				if (!categoryHints["Pokemon Items"][key].includes(item.name)) {
					categoryHints["Pokemon Items"][key].push(item.name);
				}
			}
		}

		for (const move of Games.getMovesList()) {
			if (move.id.length < MIN_LETTERS) continue;

			for (let i = 0; i < move.id.length; i++) {
				const b = move.id[i + 1];
				const c = move.id[i + 2];
				if (!b || !c) break;

				const key = move.id[i] + b + c;
				if (!(key in categoryHints["Pokemon Moves"])) {
					categoryHints["Pokemon Moves"][key] = [];
					categoryHintKeys["Pokemon Moves"].push(key);
				}

				if (!categoryHints["Pokemon Moves"][key].includes(move.name)) {
					categoryHints["Pokemon Moves"][key].push(move.name);
				}
			}
		}
		/* eslint-enable */

		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}
}

export const game: IGameFile<PiplupsLetterPlacements> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["piplups", "plp"],
	category: 'identification-1',
	class: PiplupsLetterPlacements,
	defaultOptions: ['points'],
	description: "Players guess answers that contain the given letters back-to-back!",
	freejoin: true,
	name: "Piplup's Letter Placements",
	mascot: "Piplup",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	minigameCommand: 'placement',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer that contains the given letters " +
		"back-to-back!",
	variants: [
		{
			name: "Piplup's Ability Letter Placements",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Piplup's Character Letter Placements",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Piplup's Item Letter Placements",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Piplup's Location Letter Placements",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Piplup's Move Letter Placements",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Piplup's Pokemon Letter Placements",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
