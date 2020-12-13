import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const data: {'Characters': string[]; 'Locations': string[]; 'Pokemon': string[]; 'Pokemon Abilities': string[];
	'Pokemon Items': string[]; 'Pokemon Moves': string[];} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class HitmonchansHangman extends QuestionAndAnswer {
	allLetters: number = 0;
	currentCategory: string = '';
	guessedLetters: string[] = [];
	guessLimit: number = 10;
	hints: string[] = [];
	lastAnswer: string = '';
	letters: string[] = [];
	multiRoundHints = true;
	roundGuesses = new Map<Player, boolean>();
	roundTime = 45 * 1000;
	solvedLetters: string[] = [];
	updateHintTime = 3000;

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length >= 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length >= 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length >= 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length >= 3).map(x => x.name);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.solvedLetters = [];
		this.guessedLetters = [];
		const letters = answer.split("");
		this.letters = letters;
		const allLetters = Tools.toId(answer).split("");
		this.allLetters = allLetters.filter((value, pos) => allLetters.indexOf(value) === pos).length;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = Tools.toId(this.hints[i]).length ? "_" : this.hints[i] === ' ' ? "/" : this.hints[i];
		}
	}

	updateHint(): void {
		if (this.timeout) this.timeout = null;
		this.roundGuesses.clear();
		for (let i = 0; i < this.letters.length; i++) {
			if (this.solvedLetters.includes(Tools.toId(this.letters[i]))) this.hints[i] = this.letters[i];
		}
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.hints.join(" ") + (this.guessedLetters.length ?
			' | <font color="red">' + this.guessedLetters.join(", ") + '</font>' : "");
	}

	onHintHtml(): void {
		if (this.guessedLetters.length >= this.guessLimit) {
			this.say("All guesses have been used! The answer was __" + this.answers[0] + "__");
			if (this.isMiniGame) {
				this.end();
			} else {
				this.answers = [];
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
		} else {
			this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}

	filterGuess(guess: string): boolean {
		guess = Tools.toId(guess);
		if (this.guessedLetters.includes(guess) || this.solvedLetters.includes(guess) ||
			guess.length > Tools.toId(this.answers[0]).length) return true;
		return false;
	}

	onIncorrectGuess(player: Player, guess: string): string {
		guess = Tools.toId(guess);
		for (const letter of this.letters) {
			if (Tools.toId(letter) === guess) {
				if (!this.solvedLetters.includes(guess)) {
					this.solvedLetters.push(guess);
					if (this.solvedLetters.length === this.allLetters) return this.answers[0];
				}
				return '';
			}
		}
		this.guessedLetters.push(guess);
		return '';
	}

	increaseDifficulty(): void {
		this.roundTime = Math.max(5000, this.roundTime - 2000);
	}
}

export const game: IGameFile<HitmonchansHangman> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["hitmonchans", "hh"],
	category: 'identification',
	class: HitmonchansHangman,
	defaultOptions: ['points'],
	description: "Players guess letters to fill in the blanks and reveal the answers!",
	formerNames: ["Hangman"],
	freejoin: true,
	name: "Hitmonchan's Hangman",
	mascot: "Hitmonchan",
	minigameCommand: 'hangman',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess one letter per round or the answer!',
	modes: ['survival', 'group'],
	modeProperties: {
		'survival': {
			guessLimit: 4,
			roundTime: 20 * 1000,
			updateHintTime: 500,
		},
	},
	variants: [
		{
			name: "Hitmonchan's Ability Hangman",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Hitmonchan's Character Hangman",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Hitmonchan's Item Hangman",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Hitmonchan's Location Hangman",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Hitmonchan's Move Hangman",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Hitmonchan's Pokemon Hangman",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
