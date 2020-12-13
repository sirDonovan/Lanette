import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const data: {'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class AmbipomsTossups extends QuestionAndAnswer {
	currentCategory: string = '';
	hints: string[] = [];
	lastAnswer: string = '';
	letterCount: number = 0;
	letters: string[] = [];
	maxRevealedLetters: number | undefined;
	multiRoundHints = true;
	revealedLetters: number = 0;
	readonly roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	scaleMaxRevealedLetters: boolean = false;
	tossupRound: number = 0;
	updateHintTime: number = 5 * 1000;

	static loadData(): void {
		data["Pokemon"] = Games.getPokemonList().filter(x => x.name.length < 18).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().filter(x => x.name.length < 18).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().filter(x => x.name.length < 18).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().filter(x => x.name.length < 18).map(x => x.name);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer || (this.maxRevealedLetters && answer.length < 7)) {
			answer = this.sampleOne(data[category]);
		}
		this.answers = [answer];
		this.revealedLetters = 0;
		this.tossupRound = 0;
		this.roundGuesses.clear();
		const letters = answer.split("");
		this.letters = letters;
		this.letterCount = Tools.toId(answer).split("").length;
		if (this.scaleMaxRevealedLetters) this.maxRevealedLetters = Math.floor(this.letterCount / 2) + 1;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = Tools.toId(this.hints[i]).length ? "_" : this.hints[i] === ' ' ? "/" : this.hints[i];
		}
	}

	updateHint(): void {
		this.tossupRound++;
		if (this.tossupRound > 1) {
			let index = this.random(this.hints.length);
			while (this.hints[index] !== '_') {
				index = this.random(this.hints.length);
			}
			this.hints[index] = this.letters[index];
			this.revealedLetters++;
		}

		this.hint = "<b>" + this.currentCategory + "</b> | " + this.hints.join(" ");
	}

	onHintHtml(): void {
		if (this.revealedLetters >= this.letterCount || (this.maxRevealedLetters && this.revealedLetters >= this.maxRevealedLetters)) {
			const text = (this.maxRevealedLetters ? "The maximum number of" : "All possible") + " letters have been revealed! " +
				this.getAnswers('');
			this.on(text, () => {
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
		} else {
			this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}

	filterGuess(guess: string): boolean {
		if (Tools.toId(guess).length > this.answers[0].length) return true;
		return false;
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(1000, this.updateHintTime - 500);
	}
}

export const game: IGameFile<AmbipomsTossups> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['ambipoms', 'at'],
	category: 'identification',
	class: AmbipomsTossups,
	defaultOptions: ['points'],
	description: "Players guess answers as blanks are filled in one by one (one guess per round)!",
	formerNames: ["Tossups"],
	freejoin: true,
	name: "Ambipom's Tossups",
	mascot: "Ambipom",
	minigameCommand: 'tossup',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer as blanks are filled in (one chance to " +
		"guess correctly)!",
	modes: ['survival', 'group'],
	modeProperties: {
		'survival': {
			scaleMaxRevealedLetters: true,
			updateHintTime: 3000,
		},
	},
	variants: [
		{
			name: "Ambipom's Pokemon Tossups",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
		{
			name: "Ambipom's Ability Tossups",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Ambipom's Item Tossups",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Ambipom's Move Tossups",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
	],
});
