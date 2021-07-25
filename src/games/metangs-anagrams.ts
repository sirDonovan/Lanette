import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "wordmaster" | "captainwordmaster";

const MIN_LETTERS = 3;

class MetangsAnagrams extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'wordmaster': {name: "Wordmaster", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		'captainwordmaster': {name: "Captain Wordmaster", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam',
			description: "get every answer for your team and win the game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = MetangsAnagrams.achievements.wordmaster;
	allAnswersTeamAchievement = MetangsAnagrams.achievements.captainwordmaster;

	static loadData(): void {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		this.cachedData.categoryHintKeys = {
			"Characters": Dex.getCharacters().filter(x => x.length >= MIN_LETTERS),
			"Locations": Dex.getLocations().filter(x => x.length >= MIN_LETTERS),
			"Pokemon": Games.getPokemonList().map(x => x.name).filter(x => x.length >= MIN_LETTERS),
			"Pokemon Abilities": Games.getAbilitiesList().map(x => x.name).filter(x => x.length >= MIN_LETTERS),
			"Pokemon Items": Games.getItemsList().map(x => x.name).filter(x => x.length >= MIN_LETTERS),
			"Pokemon Moves": Games.getMovesList().map(x => x.name).filter(x => x.length >= MIN_LETTERS),
		};
	}

	onSetGeneratedHint(hintKey: string): void {
		const id = Tools.toId(hintKey);
		const letters = id.split("");
		let hint = this.shuffle(letters);
		while (hint.join("") === id) {
			hint = this.shuffle(letters);
		}
		this.hint = '<b>' + this.currentCategory + '</b>: <i>' + hint.join(", ") + '</i>';
	}
}

export const game: IGameFile<MetangsAnagrams> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['metangs', 'anags', 'ma'],
	category: 'identification-1',
	class: MetangsAnagrams,
	defaultOptions: ['points'],
	description: "Players unscramble letters to reveal the answers!",
	formerNames: ["Anagrams"],
	freejoin: true,
	name: "Metang's Anagrams",
	mascot: "Metang",
	minigameCommand: 'anagram',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after unscrambling the letters!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	variants: [
		{
			name: "Metangs's Ability Anagrams",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Metangs's Character Anagrams",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Metangs's Item Anagrams",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Metangs's Location Anagrams",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Metangs's Move Anagrams",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Metangs's Pokemon Anagrams",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
