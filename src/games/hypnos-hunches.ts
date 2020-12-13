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

class HypnosHunches extends QuestionAndAnswer {
	currentCategory: string = '';
	guessLimit: number = 10;
	guessedLetters: string[] = [];
	hints: string[] = [];
	solvedLetters: string[] = [];
	uniqueLetters: number = 0;
	lastAnswer: string = '';
	letters: string[] = [];
	multiRoundHints = true;
	roundGuesses = new Map<Player, boolean>();
	roundTime: number = 45 * 1000;
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
		const id = Tools.toId(answer).split("");
		const uniqueLetters: string[] = [];
		for (const letter of id) {
			if (!uniqueLetters.includes(letter)) uniqueLetters.push(letter);
		}
		this.uniqueLetters = uniqueLetters.length;
		this.hints = new Array(letters.length).fill('') as string[];
	}

	updateHint(): void {
		if (this.timeout) this.timeout = null;
		this.roundGuesses.clear();
		for (let i = 0; i < this.letters.length; i++) {
			const id = Tools.toId(this.letters[i]);
			if (this.solvedLetters.includes(id)) this.hints[i] = id;
		}
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.hints.join("") + (this.guessedLetters.length ?
			' | <font color="red">' + this.guessedLetters.join(", ") + '</font>' : "");
	}

	onHintHtml(): void {
		let ended = false;
		if (this.guessedLetters.length >= this.guessLimit) {
			this.say("All guesses have been used! The answer was __" + this.answers[0] + "__");
			ended = true;
		} else if (this.solvedLetters.length >= this.uniqueLetters) {
			this.say("All letters have been revealed! The answer was __" + this.answers[0] + "__");
			ended = true;
		}

		if (ended) {
			if (this.isMiniGame) {
				this.end();
			} else {
				this.answers = [];
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return;
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
					if (this.solvedLetters.length === this.uniqueLetters) return this.answers[0];
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

export const game: IGameFile<HypnosHunches> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["hypnos"],
	category: 'identification',
	class: HypnosHunches,
	defaultOptions: ['points'],
	description: "Players guess letters to reveal the answers without being shown any blanks!",
	formerNames: ["Hunches"],
	freejoin: true,
	name: "Hypno's Hunches",
	mascot: "Hypno",
	minigameCommand: 'hunch',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess one letter per round or the answer (no blanks shown)!',
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
			name: "Hypno's Ability Hunches",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Hypno's Character Hunches",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Hypno's Item Hunches",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Hypno's Location Hunches",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Hypno's Move Hunches",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Hypno's Pokemon Hunches",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
