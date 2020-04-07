import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Ambipom's Tossups";
const data: {'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

class AmbipomsTossups extends Guessing {
	hints: string[] = [];
	lastAnswer: string = '';
	letterCount: number = 0;
	letters: string[] = [];
	revealedLetters: number = 0;
	readonly roundGuesses = new Map<Player, boolean>();
	tossupRound: number = 0;

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Pokemon"] = Games.getPokemonList().map(x => x.species);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);

		loadedData = true;
	}
	
	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.answers = [answer];
		this.revealedLetters = 0;
		this.tossupRound = 0;
		this.roundGuesses.clear();
		const letters = answer.split("");
		this.letters = letters;
		this.letterCount = Tools.toId(answer).split("").length;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = (Tools.toId(this.hints[i]).length ? "_" : this.hints[i] === ' ' ? "/" : this.hints[i]);
		}
		this.say("The category is **" + category + "**");
	}

	async onNextRound(): Promise<void> {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		this.tossupRound++;
		if (this.tossupRound > 1) {
			let index = this.random(this.hints.length);
			while (this.hints[index] !== '_') {
				index = this.random(this.hints.length);
			}
			this.hints[index] = this.letters[index];
			this.revealedLetters++;
		}
		this.hint = this.hints.join(" ");
		this.on(this.hint, () => {
			if (this.ended) return;
			if (!this.canGuess) this.canGuess = true;
			if (this.revealedLetters >= this.letterCount) {
				const text = "All letters have been revealed! " + this.getAnswers('');
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
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
		});
		this.say(this.hint);
	}

	filterGuess(guess: string): boolean {
		if (Tools.toId(guess).length > this.answers[0].length) return true;
		return false;
	}
}

export const game: IGameFile<AmbipomsTossups> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['ambipoms', 'at'],
	category: 'identification',
	class: AmbipomsTossups,
	defaultOptions: ['points'],
	description: "Players guess answers as blanks are filled in one by one (one guess per round)!",
	formerNames: ["Tossups"],
	freejoin: true,
	name,
	mascot: "Ambipom",
	minigameCommand: 'tossup',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer as blanks are filled in (one chance to guess correctly)!",
	variants: [
		{
			name: "Ambipom's Pokemon Tossups",
			variant: "Pokemon",
		},
		{
			name: "Ambipom's Ability Tossups",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Ambipom's Item Tossups",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Ambipom's Move Tossups",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
	],
});
