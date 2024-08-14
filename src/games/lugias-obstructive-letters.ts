import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_POINTS = 50;
const BASE_TEAM_POINTS = 100;
const MIN_LETTERS = 6;
const MAX_ANSWERS = 20;

function getAvailableLetters(id: string): string[] {
	const availableLetters: string[] = [];
	for (const letter of Tools.lettersArray) {
		if (!id.includes(letter)) availableLetters.push(letter);
	}

	return availableLetters;
}

type AchievementNames = "roadblockremover" | "captainroadblockremover";

class LugiasObstructiveLetters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"roadblockremover": {name: "Roadblock Remover", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
		"captainroadblockremover": {name: "Captain Roadblock Remover", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam', 
			description: "get every answer for your team and win the game"},
	};
	static availableLetters: Dict<string[]> = {};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = LugiasObstructiveLetters.achievements.roadblockremover;
	allAnswersTeamAchievement = LugiasObstructiveLetters.achievements.captainroadblockremover;
	currentCategory: string = '';
	loserPointsToBits: number = 2;
	roundTime: number = 30 * 1000;
	winnerPointsToBits: number = 10;

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		const categoryHintKeys: Dict<string[]> = {
			"Characters": [],
			"Locations": [],
			"Pokemon": [],
			"Pokemon Abilities": [],
			"Pokemon Items": [],
			"Pokemon Moves": [],
		};

		for (const character of Dex.getCharacters()) {
			if (character.length < MIN_LETTERS) continue;

			this.availableLetters[character] = getAvailableLetters(Tools.toId(character));
			categoryHintKeys["Characters"].push(character); // eslint-disable-line @typescript-eslint/dot-notation
		}

		for (const location of Dex.getLocations()) {
			if (location.length < MIN_LETTERS) continue;

			this.availableLetters[location] = getAvailableLetters(Tools.toId(location));
			categoryHintKeys["Locations"].push(location); // eslint-disable-line @typescript-eslint/dot-notation
		}

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.length < MIN_LETTERS) continue;

			this.availableLetters[pokemon.name] = getAvailableLetters(pokemon.id);
			categoryHintKeys["Pokemon"].push(pokemon.name); // eslint-disable-line @typescript-eslint/dot-notation
		}

		for (const ability of Games.getAbilitiesList()) {
			if (ability.name.length < MIN_LETTERS) continue;

			this.availableLetters[ability.name] = getAvailableLetters(ability.id);
			categoryHintKeys["Pokemon Abilities"].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			if (item.name.length < MIN_LETTERS) continue;

			this.availableLetters[item.name] = getAvailableLetters(item.id);
			categoryHintKeys["Pokemon Items"].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			if (move.name.length < MIN_LETTERS) continue;

			this.availableLetters[move.name] = getAvailableLetters(move.id);
			categoryHintKeys["Pokemon Moves"].push(move.name);
		}

		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	async onSetGeneratedHint(baseHintKey: string): Promise<void> {
		const unavailableLetters = this.sampleMany(LugiasObstructiveLetters.availableLetters[baseHintKey],
			Math.floor(LugiasObstructiveLetters.availableLetters[baseHintKey].length / 2)).sort();
		const answers: string[] = [];
		for (const answer of LugiasObstructiveLetters.cachedData.categoryHintKeys![this.currentCategory]) {
			const id = Tools.toId(answer);
			let hasUnavailableLetter = false;
			for (const letter of unavailableLetters) {
				if (id.includes(letter)) {
					hasUnavailableLetter = true;
					break;
				}
			}

			if (hasUnavailableLetter) continue;

			answers.push(answer);
		}

		if (answers.length > MAX_ANSWERS) {
			await this.generateHint();
			return;
		}

		this.answers = answers;
		this.hint = "<b>" + this.currentCategory + "</b>: <i>" + unavailableLetters.join(", ").toUpperCase() + "</i>";
	}

	getPointsForAnswer(answer: string): number {
		return Tools.toId(answer).length;
	}
}

export const game: IGameFile<LugiasObstructiveLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lugias', 'lol'],
	category: 'identification-1',
	class: LugiasObstructiveLetters,
	customizableNumberOptions: {
		points: {min: BASE_POINTS, base: BASE_POINTS, max: BASE_POINTS},
		teamPoints: {min: BASE_TEAM_POINTS, base: BASE_TEAM_POINTS, max: BASE_TEAM_POINTS},
	},
	description: "Players guess answers that are missing the given letters! Answers must be at least 6 letters long.",
	freejoin: true,
	name: "Lugia's Obstructive Letters",
	mascot: "Lugia",
	minigameCommand: 'obstruction',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer that is missing the given letters!",
	modes: ["collectiveteam", "spotlightteam", "survival"],
});
