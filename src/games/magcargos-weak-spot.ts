import type { Player } from "../room-activity";
import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "achillesheel" | "captainachilles";

class MagcargosWeakSpot extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"achillesheel": {name: "Achilles Heel", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
		"captainachilles": {name: "Captain Achilles", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam',
			description: 'get every answer for your team and win the game'},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = MagcargosWeakSpot.achievements.achillesheel;
	allAnswersTeamAchievement = MagcargosWeakSpot.achievements.captainachilles;
	lastAnswers: string[] = [];
	oneGuessPerHint = true;
	roundGuesses = new Map<Player, boolean>();

	static loadData(): void {
		const types: string[] = [];
		for (const key of Dex.getData().typeKeys) {
			types.push(Dex.getExistingType(key).name);
		}

		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];
		const inverseHints: Dict<string[]> = {};
		const inverseHintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.name.startsWith("Arceus-") || pokemon.name.startsWith('Silvally-')) continue;

			for (const type of types) {
				const effectiveness = Dex.getEffectiveness(type, pokemon);
				if (Dex.isImmune(type, pokemon) || effectiveness <= -1) {
					if (!(type in inverseHints)) {
						inverseHints[type] = [];
						inverseHintKeys.push(type);
					}
					inverseHints[type].push(pokemon.name);
				} else if (effectiveness >= 1) {
					if (!(type in hints)) {
						hints[type] = [];
						hintKeys.push(type);
					}
					hints[type].push(pokemon.name);
				}
			}
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
		this.cachedData.inverseHintAnswers = inverseHints;
		this.cachedData.inverseHintKeys = inverseHintKeys;
	}

	async onSetGeneratedHint(hintKey: string): Promise<void> {
		const typeWeaknesses: Dict<readonly string[]> = this.inverse ? MagcargosWeakSpot.cachedData.inverseHintAnswers! :
			MagcargosWeakSpot.cachedData.hintAnswers!;
		const pokemonList = this.sampleMany(typeWeaknesses[hintKey], 3).sort();
		if (this.pokemonGifHints) {
			for (const pokemon of pokemonList) {
				if (!this.getHintKeyGif(pokemon)) {
					await this.generateHint();
					return;
				}
			}
		}

		const answers: string[] = [hintKey];
		for (const i in typeWeaknesses) {
			if (i === hintKey) continue;
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
			await this.generateHint();
			return;
		}

		this.answers = answers;
		let hint = "<b>Randomly generated Pokemon</b>:";
		if (this.pokemonGifHints) {
			hint += "<br /><center>" + pokemonList.map(x => this.getHintKeyGif(x) || x).join("") + "</center>";
		} else {
			hint += " <i>" + pokemonList.join(", ") + "</i>";
		}

		this.hint = hint;
	}
}

export const game: IGameFile<MagcargosWeakSpot> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["Magcargos", "ws"],
	category: 'knowledge-1',
	class: MagcargosWeakSpot,
	defaultOptions: ['points'],
	description: "Players guess the weakness(es) that the given Pokemon share!",
	formerNames: ["Weak Spot"],
	freejoin: true,
	name: "Magcargo's Weak Spot",
	mascot: "Magcargo",
	minigameCommand: 'weakspot',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the weakness(es) that the given Pokemon share!",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	variants: [
		{
			name: "Magcargo's Inverse Weak Spot",
			description: "Using an inverted type chart, players guess the weakness(es) that the given Pokemon share!",
			inverse: true,
			variantAliases: ['inverse'],
		},
		{
			name: "Magcargo's Weak Spot (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});
