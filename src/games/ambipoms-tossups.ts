import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const MAX_LETTERS = 18;

class AmbipomsTossups extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';
	hints: string[] = [];
	hintUpdates: number = 0;
	letterCount: number = 0;
	letters: string[] = [];
	maxRevealedLetters: number | undefined;
	multiRoundHints = true;
	oneGuessPerHint = true;
	revealedLetters: number = 0;
	readonly roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	scaleMaxRevealedLetters: boolean = false;
	tossupsRound: number = 0;
	updateHintTime: number = 5 * 1000;

	static loadData(): void {
		this.cachedData.categories = ["Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		this.cachedData.categoryHintKeys = {
			"Locations": Dex.getLocations().filter(x => x.length <= MAX_LETTERS),
			"Pokemon": Games.getPokemonList().map(x => x.name).filter(x => x.length <= MAX_LETTERS),
			"Pokemon Abilities": Games.getAbilitiesList().map(x => x.name).filter(x => x.length <= MAX_LETTERS),
			"Pokemon Items": Games.getItemsList().map(x => x.name).filter(x => x.length <= MAX_LETTERS),
			"Pokemon Moves": Games.getMovesList().map(x => x.name).filter(x => x.length <= MAX_LETTERS),
		};
	}

	afterInitialize(): void {
		super.afterInitialize();

		if (this.scaleMaxRevealedLetters) this.minHintKeyLength = 7;
	}

	getHintKey(): string {
		return this.hints.join(" ");
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.revealedLetters = 0;
		this.hintUpdates = 0;
		this.roundGuesses.clear();

		const letters = hintKey.split("");
		this.letters = letters;
		this.letterCount = Tools.toId(hintKey).split("").length;
		if (this.scaleMaxRevealedLetters) this.maxRevealedLetters = Math.floor(this.letterCount / 2) + 1;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = Tools.toId(this.hints[i]).length ? "_" : this.hints[i] === ' ' ? "/" : this.hints[i];
		}

		this.setHintHtml();
	}

	updateHint(): void {
		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.tossupsRound++;
		} else if (this.hintUpdates > 1 && this.hints.includes('_')) {
			let index = this.random(this.hints.length);
			while (this.hints[index] !== '_') {
				index = this.random(this.hints.length);
			}
			this.hints[index] = this.letters[index];
			this.revealedLetters++;
		}

		this.setHintHtml();
	}

	setHintHtml(): void {
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.getHintKey();
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.revealedLetters >= this.letterCount || (this.maxRevealedLetters && this.revealedLetters >= this.maxRevealedLetters)) {
			this.canGuess = false;
			const text = (this.maxRevealedLetters ? "The maximum number of" : "All possible") + " letters have been revealed!";
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
		if (Tools.toId(guess).length > this.answers[0].length) return true;
		return false;
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(1000, this.updateHintTime - 500);
	}

	getDisplayedRoundNumber(): number {
		return this.tossupsRound;
	}
}

export const game: IGameFile<AmbipomsTossups> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['ambipoms', 'at'],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'identification-2',
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
	modes: ['collectiveteam', 'survival'],
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
		{
			name: "Ambipom's Location Tossups",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
	],
});
