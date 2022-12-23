import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import type { IMove } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "mootronome";

class MiltanksMoves extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'mootronome': {name: "Mootronome", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = MiltanksMoves.achievements.mootronome;

	static loadData(): void {
		const categories: string[] = [];
		const categoryHints: Dict<Dict<string[]>> = {};
		const categoryHintKeys: Dict<string[]> = {};

		const maxMoveAvailability = Games.getMaxMoveAvailability();
		const bannedMoves: string[] = [];
		for (const move of Games.getMovesList()) {
			if (move.id.startsWith('hiddenpower')) {
				bannedMoves.push(move.id);
				continue;
			}

			const availability = Dex.getMoveAvailability(move);
			if (availability >= maxMoveAvailability) bannedMoves.push(move.id);
		}

		const moveCache: Dict<IMove> = {};
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme) continue;

			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			if (allPossibleMoves.length === 1) continue;

			for (const possibleMove of allPossibleMoves) {
				if (bannedMoves.includes(possibleMove)) continue;
				if (!(possibleMove in moveCache)) {
					moveCache[possibleMove] = Dex.getExistingMove(possibleMove);
				}

				const move = moveCache[possibleMove];
				if (!(pokemon.name in categoryHints)) {
					categoryHints[pokemon.name] = {};
					categoryHintKeys[pokemon.name] = [];
					categories.push(pokemon.name);
				}

				if (!(move.type in categoryHints[pokemon.name])) categoryHints[pokemon.name][move.type] = [];

				categoryHints[pokemon.name][move.type].push(move.name);
			}
		}

		for (const species in categoryHints) {
			for (const type in categoryHints[species]) {
				if (categoryHints[species][type].length > 4) {
					delete categoryHints[species][type];
				} else {
					categoryHintKeys[species].push(type);
				}
			}

			if (!Object.keys(categoryHints[species]).length) {
				delete categoryHints[species];
				delete categoryHintKeys[species];
				categories.splice(categories.indexOf(species), 1);
			}
		}

		this.cachedData.categories = categories;
		this.cachedData.categoryHintAnswers = categoryHints;
		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	async onSetGeneratedHint(hintKey: string): Promise<void> {
		const hintKeyGif = this.getHintKeyGif(this.currentCategory!);
		if (this.pokemonGifHints && !hintKeyGif) {
			await this.generateHint();
			return;
		}

		let hint = "<b>Randomly generated Pokemon and type</b>:";
		if (hintKeyGif) {
			hint += "<br /><center>" + hintKeyGif + "<br />" + Dex.getTypeHtml(Dex.getExistingType(hintKey)) + "</center>";
		} else {
			hint += " <i>" + this.currentCategory + " - " + hintKey + " type</i>";
		}
		this.hint = hint;
	}
}

export const game: IGameFile<MiltanksMoves> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['miltanks', 'mm'],
	category: 'knowledge-1',
	class: MiltanksMoves,
	defaultOptions: ['points'],
	description: "Players guess moves of the specified type that the given Pokemon learn!",
	freejoin: true,
	name: "Miltank's Moves",
	mascot: "Miltank",
	minigameCommand: "miltankmove",
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a move of the specified type that the Pokemon learns!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	nonTrivialLoadData: true,
	variants: [
		{
			name: "Miltank's Moves (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});
