import { PRNG } from "../lib/prng";
import type { PRNGSeed } from "../lib/prng";
import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_POKEMON = 5;
const MAX_ADDITIONAL_POKEMON = 2;

class LinoonesLetterDetector extends QuestionAndAnswer {
	roundTime = 30 * 1000;
	showLetter: boolean = true;
	usesWorkers: boolean = true;

	static loadData(): void {
		Games.getWorkers().letterDetector.init();
	}

	async customGenerateHint(): Promise<string> {
		const result = await Games.getWorkers().letterDetector.search({
			basePokemon: BASE_POKEMON,
			maxAdditionalPokemon: MAX_ADDITIONAL_POKEMON,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
		});

		if (this.ended) return "";

		if (result === null || !result.hiddenName) {
			this.say("An error occurred while generating an answer.");
			this.deallocate(true);
			return "";
		}

		this.prng = new PRNG(result.prngSeed);
		this.answers = [result.hiddenName];
		const hintKey = result.names.join(", ") + (this.showLetter ?
			" (" + Tools.toNumberOrderString(result.index + 1) + " letter)" : "");
		this.hint = "<b>Randomly generated Pokemon</b>: <i>" + hintKey + "</i>";
		return hintKey;
	}
}

export const game: IGameFile<LinoonesLetterDetector> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['linoones', 'letterdetector', 'lld'],
	canGetRandomAnswer: false,
	category: 'identification-2',
	class: LinoonesLetterDetector,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	defaultOptions: ['points'],
	description: "Players guess the Pokemon hidden in the other Pokemon names!",
	freejoin: true,
	name: "Linoone's Letter Detector",
	mascot: "Linoone",
	minigameCommand: 'letterdetect',
	minigameCommandAliases: ['ldetect'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon hidden in the other Pokemon names!",
	modes: ["collectiveteam", "spotlightteam", "survival"],
	modeProperties: {
		'survival': {
			roundTime: 15 * 1000,
		},
	},
	variants: [
		{
			name: "No Hint Linoone's Letter Detector",
			variantAliases: ['hidden', 'nohint', 'nohints'],
			roundTime: 60 * 1000,
			modes: ["collectiveteam", "spotlightteam"],
			showLetter: false,
		},
	],
});
