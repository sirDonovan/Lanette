import { Player } from "../room-activity";
import { IGameOptionValues } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from "./templates/guessing";

const name = "Hypno's Hunches";
const data: {'Characters': string[], 'Pokemon': string[], 'Pokemon Abilities': string[], 'Pokemon Items': string[], 'Pokemon Moves': string[]} = {
	"Characters": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

class HypnosHunches extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		data["Characters"] = Dex.data.characters.slice();
		data["Pokemon"] = Dex.getPokemonList().map(x => x.species);
		data["Pokemon Abilities"] = Dex.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Dex.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Dex.getMovesList().map(x => x.name);

		loadedData = true;
	}

	currentCategory: string = '';
	customizableOptions: Dict<IGameOptionValues> = {
		points: {min: 3, base: 5, max: 5},
	};
	guessLimit: number = 10;
	guessedLetters: string[] = [];
	hints: string[] = [];
	solvedLetters: string[] = [];
	uniqueLetters: number = 0;
	lastAnswer: string = '';
	letters: string[] = [];
	roundGuesses = new Map<Player, boolean>();

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
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
		for (let i = 0; i < id.length; i++) {
			if (!uniqueLetters.includes(id[i])) uniqueLetters.push(id[i]);
		}
		this.uniqueLetters = uniqueLetters.length;
		this.hints = new Array(letters.length).fill('');
	}

	async onNextRound() {
		if (this.timeout) this.timeout = null;
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		this.roundGuesses.clear();
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
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return;
		}
		for (let i = 0; i < this.letters.length; i++) {
			const id = Tools.toId(this.letters[i]);
			if (this.solvedLetters.includes(id)) this.hints[i] = id;
		}
		const text = "**[" + this.currentCategory + "]** " + this.hints.join("") + " | " + this.guessedLetters.join(", ");
		this.on(text, () => {
			if (!this.canGuess) this.canGuess = true;
		});
		this.say(text);
	}

	filterGuess(guess: string) {
		guess = Tools.toId(guess);
		if (this.guessedLetters.includes(guess) || this.solvedLetters.includes(guess) || guess.length > Tools.toId(this.answers[0]).length) return true;
		return false;
	}

	onGuess(guess: string) {
		guess = Tools.toId(guess);
		if (!this.timeout) {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
		for (let i = 0; i < this.letters.length; i++) {
			if (Tools.toId(this.letters[i]) === guess) {
				if (!this.solvedLetters.includes(guess)) this.solvedLetters.push(guess);
				return;
			}
		}
		this.guessedLetters.push(guess);
	}
}

export const game: IGameFile<HypnosHunches> = {
	aliases: ["hypnos"],
	battleFrontierCategory: 'Identification',
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: HypnosHunches,
	description: "Players guess letters to reveal the answers without being shown any blanks!",
	formerNames: ["Hunches"],
	freejoin: true,
	name,
	mascot: "Hypno",
	minigameCommand: 'hunch',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess one letter per round or the answer (no blanks shown)!',
	variants: [
		{
			name: "Hypno's Ability Hunches",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Hypno's Item Hunches",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Hypno's Move Hunches",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Hypno's Pokemon Hunches",
			variant: "Pokemon",
		},
	],
};
