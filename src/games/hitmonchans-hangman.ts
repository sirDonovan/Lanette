import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const MIN_LETTERS = 3;

class HitmonchansHangman extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	allLetters: number = 0;
	currentCategory: string = '';
	guessedLetters: string[] = [];
	guessLimit: number = 10;
	hangmanRound: number = 0;
	hints: string[] = [];
	hintUpdates: number = 0;
	letters: string[] = [];
	multiRoundHints = true;
	roundGuesses = new Map<Player, boolean>();
	roundTime = 45 * 1000;
	solvedLetters: string[] = [];
	updateHintTime = 3000;

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

	getHintKey(): string {
		return this.hints.join(" ");
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.solvedLetters = [];
		this.guessedLetters = [];
		this.hintUpdates = 0;

		const letters = hintKey.split("");
		this.letters = letters;
		const allLetters = Tools.toId(hintKey).split("");
		this.allLetters = allLetters.filter((value, pos) => allLetters.indexOf(value) === pos).length;

		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = Tools.toId(this.hints[i]).length ? "_" : this.hints[i] === ' ' ? "/" : this.hints[i];
		}

		this.setHintHtml();
	}

	updateHint(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}

		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.hangmanRound++;
		}

		this.roundGuesses.clear();
		for (let i = 0; i < this.letters.length; i++) {
			if (this.solvedLetters.includes(Tools.toId(this.letters[i]))) this.hints[i] = this.letters[i];
		}

		this.setHintHtml();
	}

	setHintHtml(): void {
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.getHintKey() + (this.guessedLetters.length ?
			' | <font color="red">' + this.guessedLetters.join(", ") + '</font>' : "");
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.guessedLetters.length >= this.guessLimit) {
			this.canGuess = false;
			const text = "All guesses have been used!";
			this.on(text, () => {
				this.displayAnswers();
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
		} else {
			this.setTimeout(() => this.nextRound(), this.updateHintTime);
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

	getDisplayedRoundNumber(): number {
		return this.hangmanRound;
	}
}

export const game: IGameFile<HitmonchansHangman> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["hitmonchans", "hh"],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
	}),
	category: 'identification-2',
	class: HitmonchansHangman,
	defaultOptions: ['points'],
	description: "Players guess letters to fill in the blanks and reveal the answers!",
	formerNames: ["Hangman"],
	freejoin: true,
	name: "Hitmonchan's Hangman",
	mascot: "Hitmonchan",
	minigameCommand: 'hangman',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess one letter per round or the answer!',
	modes: ['collectiveteam', 'survival'],
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
