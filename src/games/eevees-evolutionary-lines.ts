import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const HIDDEN_POKEMON = "______";

class EeveesEvolutionaryLines extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	static loadData(): void {
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.prevo || !pokemon.evos.length) continue;

			const evolutionLines = Dex.getEvolutionLines(pokemon);
			if (evolutionLines.length === 1 && evolutionLines[0].length === 1) continue;

			const key = evolutionLines.map(x => x.join(",")).join("|");
			hints[key] = [pokemon.name];
			hintKeys.push(key);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}

	async onSetGeneratedHint(hintKey: string): Promise<void> {
		const evolutionLines = hintKey.split("|").map(x => x.split(","));
		let hiddenLine = this.sampleOne(evolutionLines);
		while (hiddenLine.length === 1) {
			hiddenLine = this.sampleOne(evolutionLines);
		}

		const branchEvolution = evolutionLines.length > 1;
		const lineHints: string[] = [];
		for (const line of evolutionLines) {
			if (this.pokemonGifHints) {
				for (const pokemon of line) {
					if (!this.getHintKeyGif(pokemon)) {
						await this.generateHint();
						return;
					}
				}
			}

			if (line === hiddenLine) {
				let hidden = this.sampleOne(line);
				while (branchEvolution && hidden === line[0]) {
					hidden = this.sampleOne(line);
				}

				this.answers = [hidden];
				lineHints.push(line.map(x => {
					if (x === hidden) return this.pokemonGifHints ? Dex.getPlaceholderSprite() : HIDDEN_POKEMON;
					return this.getHintKeyGif(x) || x;
				}).join(this.pokemonGifHints ? "-> " : ", "));
			} else {
				lineHints.push(line.map(x => this.getHintKeyGif(x) || x).join(this.pokemonGifHints ? "-> " : ", "));
			}
		}

		let hint = "<b>Randomly generated evolution line" + (branchEvolution ? "s" : "") + "</b>:";
		if (this.pokemonGifHints) {
			hint += "<br /><center>" + lineHints.join(" or ") + "</center>";
		} else {
			hint += " <i>" + lineHints.join(" or ") + "</i>";
		}
		this.hint = hint;
	}
}

export const game: IGameFile<EeveesEvolutionaryLines> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['eevees', 'eel', 'eeveesevolutionaryline'],
	category: 'knowledge-2',
	class: EeveesEvolutionaryLines,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon that are missing from the given evolution lines!",
	freejoin: true,
	name: "Eevee's Evolutionary Lines",
	mascot: "Eevee",
	minigameCommand: 'evolutionaryline',
	minigameCommandAliases: ['eline'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon that is missing from the given " +
		"evolution line!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	variants: [
		{
			name: "Eevee's Evolutionary Lines (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});
