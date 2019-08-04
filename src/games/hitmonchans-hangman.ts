import { Player } from "../room-activity";
import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from "./templates/guessing";

const name = "Hitmonchan's Hangman";
const data: Dict<string[]> = {
	"Characters": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
const categories = Object.keys(data);
let loadedData = false;

class HitmonchansHangman extends Guessing {
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

	allLetters: number = 0;
	currentCategory: string = '';
	defaultOptions: DefaultGameOption[] = ['points'];
	guessedLetters: string[] = [];
	guessLimit: number = 10;
	hints: string[] = [];
	lastAnswer: string = '';
	letters: string[] = [];
	roundGuesses = new Map<Player, boolean>();
	set: number = 0;
	solvedLetters: string[] = [];

	onSignups() {
		if (this.isMiniGame) {
			this.nextRound();
		} else {
			if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	setAnswers() {
		const category = this.roundCategory || this.variant || Tools.sampleOne(categories);
		this.currentCategory = category;
		let answer = Tools.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = Tools.sampleOne(data[category]);
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

	onNextRound() {
		if (this.timeout) this.timeout = null;
		if (!this.answers.length) {
			this.setAnswers();
			this.canGuess = false;
		}
		this.roundGuesses.clear();
		let ended = false;
		if (this.guessedLetters.length >= this.guessLimit) {
			this.say("All guesses have been used! The answer was __" + this.answers[0] + "__");
			ended = true;
		} else if (this.solvedLetters.length >= this.allLetters) {
			this.say("All letters have been revealed! The answer was __" + this.answers[0] + "__");
			ended = true;
		}
		if (ended) {
			if (this.isMiniGame) {
				this.end();
			} else {
				this.answers = [];
				this.set++;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return;
		}
		for (let i = 0; i < this.letters.length; i++) {
			if (this.solvedLetters.indexOf(Tools.toId(this.letters[i])) > -1) this.hints[i] = this.letters[i];
		}
		const text = this.hints.join(" ") + " | **" + this.currentCategory + "** | " + this.guessedLetters.join(", ");
		this.on(text, () => {
			if (!this.canGuess) this.canGuess = true;
		});
		this.say(text);
	}

	filterGuess(guess: string) {
		guess = Tools.toId(guess);
		if (this.guessedLetters.indexOf(guess) > -1 || this.solvedLetters.indexOf(guess) > -1 || guess.length > Tools.toId(this.answers[0]).length) return true;
		return false;
	}

	onGuess(guess: string) {
		guess = Tools.toId(guess);
		if (!this.timeout) {
			this.timeout = setTimeout(() => this.nextRound(), 4000);
		}
		for (let i = 0; i < this.letters.length; i++) {
			if (Tools.toId(this.letters[i]) === guess) {
				if (this.solvedLetters.indexOf(guess) === -1) this.solvedLetters.push(guess);
				return;
			}
		}
		this.guessedLetters.push(guess);
	}
}

export const game: IGameFile<HitmonchansHangman> = {
	aliases: ["hitmonchans", "hh"],
	battleFrontierCategory: 'Identification',
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: HitmonchansHangman,
	description: "Players guess letters to fill in the blanks and reveal the answers!",
	formerNames: ["Hangman"],
	freejoin: true,
	name,
	mascot: "Hitmonchan",
	minigameCommand: 'hangman',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess one letter per round or the answer!',
	variants: [
		{
			name: "Hitmonchan's Ability Hangman",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Hitmonchan's Item Hangman",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Hitmonchan's Move Hangman",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Hitmonchan's Pokemon Hangman",
			variant: "Pokemon",
		},
	],
};
