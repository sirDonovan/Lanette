import type { Player } from "../room-activity";
import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "tallorder";

const MIN_LETTERS = 3;
const MAX_LETTERS = 18;

class ZygardesOrders extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"tallorder": {name: "Tall Order", type: 'special', bits: 1000, description: "guess the answer with only 1 letter revealed"},
	};
	static cachedData: IGameCachedData = {};

	allLetters: number = 0;
	currentCategory: string = '';
	guessedLetters: string[] = [];
	hints: string[] = [];
	hintUpdates: number = 0;
	letters: string[] = [];
	maxRevealedLetters: number | undefined;
	multiRoundHints = true;
	oneGuessPerHint = true;
	ordersRound: number = 0;
	revealedLetters: number = 0;
	roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	scaleMaxRevealedLetters: boolean = false;
	solvedLetters: string[] = [];
	updateHintTime = 5 * 1000;

	static loadData(): void {
		this.cachedData.categories = ["Characters", "Locations", "Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		this.cachedData.categoryHintKeys = {
			"Characters": Dex.getCharacters().filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
			"Locations": Dex.getLocations().filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
			"Pokemon": Games.getPokemonList().map(x => x.name).filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
			"Pokemon Abilities": Games.getAbilitiesList().map(x => x.name).filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
			"Pokemon Items": Games.getItemsList().map(x => x.name).filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
			"Pokemon Moves": Games.getMovesList().map(x => x.name).filter(x => x.length >= MIN_LETTERS && x.length <= MAX_LETTERS),
		};
	}

	getHintKey(): string {
		return this.hints.join("");
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.hintUpdates = 0;
		this.ordersRound = 0;
		this.roundGuesses.clear();

		this.letters = Tools.toId(hintKey).split("");
		this.allLetters = this.letters.length;
		if (this.scaleMaxRevealedLetters) this.maxRevealedLetters = Math.floor(this.allLetters / 2) + 2;

		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = '';
		}

		const firstLetter = this.random(this.letters.length);
		this.hints[firstLetter] = this.letters[firstLetter];
		this.revealedLetters = 1;

		this.setHintHtml();
	}

	updateHint(): void {
		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.ordersRound++;
		} else if (this.hintUpdates > 1) {
			let indicies: number[] = [];
			for (let i = 0; i < this.hints.length; i++) {
				if (this.hints[i] === '') indicies.push(i);
			}

			indicies = this.shuffle(indicies);
			let revealedLetter = false;
			for (const index of indicies) {
				this.hints[index] = this.letters[index];
				if (Client.checkFilters(this.hints.join(""), this.isPmActivity(this.room) ? undefined : this.room)) {
					this.hints[index] = '';
					continue;
				}
				revealedLetter = true;
				break;
			}

			if (revealedLetter) {
				this.revealedLetters++;
			} else {
				this.revealedLetters = this.allLetters;
			}
		}

		this.setHintHtml();
	}

	setHintHtml(): void {
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.getHintKey();
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.revealedLetters >= this.allLetters || (this.maxRevealedLetters && this.revealedLetters >= this.maxRevealedLetters)) {
			this.canGuess = false;
			const text = (this.maxRevealedLetters ? "The maximum number of" : "All possible") + " letters have been revealed!";
			this.on(text, () => {
				this.displayAnswers();
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.say(text);
		} else {
			this.setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}

	onCorrectGuess(player: Player): void {
		if (this.revealedLetters === 1) this.unlockAchievement(player, ZygardesOrders.achievements.tallorder);
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(1000, this.updateHintTime - 500);
	}

	getDisplayedRoundNumber(): number {
		return this.ordersRound;
	}
}

export const game: IGameFile<ZygardesOrders> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["zygardes", "zo"],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'identification-2',
	class: ZygardesOrders,
	defaultOptions: ['points'],
	description: "Players guess answers as letters are revealed one by one (one guess per round)!",
	formerNames: ["Orders"],
	freejoin: true,
	name: "Zygarde's Orders",
	mascot: "Zygarde",
	minigameCommand: 'order',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer as letters are revealed one by one " +
		"(one chance to guess correctly)!",
	modes: ['collectiveteam', 'survival'],
	modeProperties: {
		'survival': {
			scaleMaxRevealedLetters: true,
			updateHintTime: 3000,
		},
	},
	variants: [
		{
			name: "Zygarde's Ability Orders",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Zygarde's Character Orders",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Zygarde's Item Orders",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Zygarde's Location Orders",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Zygarde's Move Orders",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Zygarde's Pokemon Orders",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
