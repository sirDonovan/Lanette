import { Player } from "../room-activity";
import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Ambipom's Tossups";
const data: {'Pokemon': string[], 'Pokemon Abilities': string[], 'Pokemon Items': string[], 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

class AmbipomsTossups extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Pokemon"] = Dex.getPokemonList().map(x => x.species);
		data["Pokemon Abilities"] = Dex.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Dex.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Dex.getMovesList().map(x => x.name);

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];
	hints: string[] = [];
	lastAnswer: string = '';
	letterCount: number = 0;
	letters: string[] = [];
	revealedLetters: number = 0;
	readonly roundGuesses = new Map<Player, boolean>();

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.answers = [answer];
		this.revealedLetters = 0;
		this.round = 1;
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

	async onNextRound() {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		if (this.round > 1) {
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

	filterGuess(guess: string) {
		if (Tools.toId(guess).length > this.answers[0].length) return true;
		return false;
	}
}

export const game: IGameFile<AmbipomsTossups> = {
	aliases: ['ambipoms', 'at'],
	battleFrontierCategory: 'Identification',
	class: AmbipomsTossups,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Similar to Hangman, the host starts with a series of blank spaces which represent the word. Instead of players guessing letters, the host will start to fill in blank spaces with letters. Players have to be the first to guess the complete words to gain points.",
	formerNames: ["Tossups"],
	freejoin: true,
	name,
	mascot: "Ambipom",
	minigameCommand: 'tossup',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer as blanks are filled in (only one guess allowed) !",
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
};
