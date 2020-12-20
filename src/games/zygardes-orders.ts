import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "tallorder";

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

class ZygardesOrders extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"tallorder": {name: "Tall Order", type: 'special', bits: 1000, description: "guess the answer with only 1 letter revealed"},
	};

	allLetters: number = 0;
	currentCategory: string = '';
	guessedLetters: string[] = [];
	hints: string[] = [];
	lastAnswer: string = '';
	letters: string[] = [];
	maxRevealedLetters: number | undefined;
	multiRoundHints = true;
	orderRound: number = 0;
	revealedLetters: number = 0;
	roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	scaleMaxRevealedLetters: boolean = false;
	solvedLetters: string[] = [];
	updateHintTime = 5 * 1000;

	static loadData(): void {
		data["Characters"] = Dex.getCharacters().filter(x => x.length < 18 && x.length >= 3);
		data["Locations"] = Dex.getLocations().filter(x => x.length < 18 && x.length >= 3);
		data["Pokemon"] = Games.getPokemonList(x => x.name.length < 18 && x.name.length >= 3).map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length < 18 && x.name.length >= 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length < 18 && x.name.length >= 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length < 18 && x.name.length >= 3).map(x => x.name);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer || (this.maxRevealedLetters && answer.length < 7)) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.orderRound = 0;
		this.roundGuesses.clear();
		this.letters = Tools.toId(answer).split("");
		this.allLetters = this.letters.length;
		if (this.scaleMaxRevealedLetters) this.maxRevealedLetters = Math.floor(this.allLetters / 2) + 2;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = '';
		}
		const firstLetter = this.random(this.letters.length);
		this.hints[firstLetter] = this.letters[firstLetter];
		this.revealedLetters = 1;
	}

	updateHint(): void {
		this.orderRound++;
		if (this.orderRound > 1) {
			let indicies: number[] = [];
			for (let i = 0; i < this.hints.length; i++) {
				if (this.hints[i] === '') indicies.push(i);
			}

			indicies = this.shuffle(indicies);
			let revealedLetter = false;
			for (const index of indicies) {
				this.hints[index] = this.letters[index];
				if (Client.checkFilters(this.hints.join(""), this.isPm(this.room) ? undefined : this.room)) {
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

		this.hint = "<b>" + this.currentCategory + "</b> | " + this.hints.join("");
	}

	onHintHtml(): void {
		if (this.revealedLetters >= this.allLetters || (this.maxRevealedLetters && this.revealedLetters >= this.maxRevealedLetters)) {
			const text = (this.maxRevealedLetters ? "The maximum number of" : "All possible") + " letters have been revealed! " +
				this.getAnswers('');
			this.on(text, () => {
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.say(text);
		} else {
			this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}

	onCorrectGuess(player: Player): void {
		if (this.revealedLetters === 1) this.unlockAchievement(player, ZygardesOrders.achievements.tallorder);
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(1000, this.updateHintTime - 500);
	}
}

export const game: IGameFile<ZygardesOrders> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["zygardes", "zo"],
	category: 'identification',
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
	modes: ['survival', 'group'],
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
