import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "genusgenius";

const data: {pokemon: Dict<string[]>} = {
	pokemon: {},
};
const pokemonKeys: string[] = [];

class BonslysCategoryClutters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'genusgenius': {name: "Genus Genius", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = BonslysCategoryClutters.achievements.genusgenius;

	static loadData(): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const category = Dex.getPokemonCategory(pokemon);
			if (!category) continue;
			data.pokemon[pokemon.name] = [category];
			pokemonKeys.push(pokemon.name);
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	generateAnswer(): void {
		const pokemon = this.sampleOne(pokemonKeys);
		this.answers = data.pokemon[pokemon];
		this.hint = "<b>Bonsly imitated</b>: <i>" + pokemon + "</i>";
	}
}

export const game: IGameFile<BonslysCategoryClutters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["bonslys", "bcc", "categoryclutters"],
	category: 'knowledge',
	class: BonslysCategoryClutters,
	defaultOptions: ['points'],
	description: "Players guess categories of randomly chosen Pokemon!",
	freejoin: true,
	name: "Bonsly's Category Clutters",
	mascot: "Bonsly",
	minigameCommand: 'bonslyclutter',
	minigameCommandAliases: ['bclutter'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the category of the given Pokemon!",
	modes: ['survival', 'team', 'timeattack'],
});
