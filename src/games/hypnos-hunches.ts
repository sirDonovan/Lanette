import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const MIN_LETTERS = 3;

class HypnosHunches extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';
	guessLimit: number = 10;
	guessedLetters: string[] = [];
	hints: string[] = [];
	hintUpdates: number = 0;
	hunchesRound: number = 0;
	solvedLetters: string[] = [];
	uniqueLetters: number = 0;
	letters: string[] = [];
	multiRoundHints = true;
	roundGuesses = new Map<Player, boolean>();
	roundTime: number = 45 * 1000;
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
		return this.hints.join("");
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.solvedLetters = [];
		this.guessedLetters = [];
		this.hintUpdates = 0;

		const letters = hintKey.split("");
		this.letters = letters;
		const id = Tools.toId(hintKey).split("");
		const uniqueLetters: string[] = [];
		for (const letter of id) {
			if (!uniqueLetters.includes(letter)) uniqueLetters.push(letter);
		}
		this.uniqueLetters = uniqueLetters.length;
		this.hints = new Array(letters.length).fill('') as string[];

		this.setHintHtml();
	}

	updateHint(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}

		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.hunchesRound++;
		}

		this.roundGuesses.clear();
		for (let i = 0; i < this.letters.length; i++) {
			const id = Tools.toId(this.letters[i]);
			if (this.solvedLetters.includes(id)) this.hints[i] = id;
		}

		this.setHintHtml();
	}

	setHintHtml(): void {
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.getHintKey() + (this.guessedLetters.length ?
			' | <font color="red">' + this.guessedLetters.join(", ") + '</font>' : "");
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		let endReason: string | undefined;
		if (this.guessedLetters.length >= this.guessLimit) {
			endReason = "All guesses have been used!";
		} else if (this.solvedLetters.length >= this.uniqueLetters) {
			endReason = "All letters have been revealed!";
		}

		if (endReason) {
			this.canGuess = false;
			this.on(endReason, () => {
				this.displayAnswers();
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.setTimeout(() => this.nextRound(), 5000);
			});
			this.say(endReason);
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

	getDisplayedRoundNumber(): number {
		return this.hunchesRound;
	}
}

export const game: IGameFile<HypnosHunches> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["hypnos"],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
	}),
	category: 'identification-2',
	class: HypnosHunches,
	defaultOptions: ['points'],
	description: "Players guess letters to reveal the answers without being shown any blanks!",
	formerNames: ["Hunches"],
	freejoin: true,
	name: "Hypno's Hunches",
	mascot: "Hypno",
	minigameCommand: 'hunch',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess one letter per round or the answer (no blanks shown)!',
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
