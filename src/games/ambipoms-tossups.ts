import { Player } from "../room-activity";
import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";
import { commandDescriptions, commands as templateCommands, Guessing, GuessingAbstract } from './templates/guessing';

const data: Dict<string[]> = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
const categories = Object.keys(data);
const questions: Dict<string[]> = {};
let loadedData = false;

class AmbipomsTossups extends Guessing implements GuessingAbstract {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading game-specific data...");

		data["Pokemon"] = Dex.getPokemonList().map(x => x.species);
		data["Pokemon Abilities"] = Dex.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Dex.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Dex.getMovesList().map(x => x.name);

		for (let i = 0; i < categories.length; i++) {
			questions[categories[i]] = Object.keys(data[categories[i]]);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOptions[] = ['points'];
	hints: string[] = [];
	lastAnswer: string = '';
	letterCount: number = 0;
	letters: string[] = [];
	pokedex: IPokemon[] = Dex.getPokemonList();
	revealedLetters: number = 0;
	readonly roundGuesses = new Map<Player, boolean>();

	onSignups() {
		if (this.isMiniGame) {
			this.nextRound();
		} else {
			if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	setAnswers() {
		const category = this.roundCategory || this.variant || Tools.sampleOne(categories);
		let answer = Tools.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = Tools.sampleOne(data[category]);
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

	onNextRound() {
		if (!this.answers.length) {
			this.canGuess = false;
			this.setAnswers();
		}
		if (this.round > 1) {
			let index = Tools.random(this.hints.length);
			while (this.hints[index] !== '_') {
				index = Tools.random(this.hints.length);
			}
			this.hints[index] = this.letters[index];
			this.revealedLetters++;
		}
		const text = this.hints.join(" ");
		this.on(text, () => {
			if (!this.canGuess) this.canGuess = true;
			if (this.revealedLetters >= this.letterCount) {
				const text = "All letters have been revealed! " + this.getAnswers();
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
		this.say(text);
	}

	filterGuess(guess: string) {
		if (guess.length > this.answers[0].length) return true;
		return false;
	}
}

export const game: IGameFile<AmbipomsTossups> = {
	aliases: ['ambipoms'],
	battleFrontierCategory: 'Identification',
	class: AmbipomsTossups,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Similar to Hangman, the host starts with a series of blank spaces which represent the word. Instead of players guessing letters, the host will start to fill in blank spaces with letters. Players have to be the first to guess the complete words to gain points.",
	formerNames: ["Tossups"],
	freejoin: true,
	name: "Ambipom's Tossups",
	mascot: "Ambipom",
	minigameCommand: 'tossup',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer as blanks are filled in (only one guess allowed) !",
};
