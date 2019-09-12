import { Player } from "../room-activity";
import { IGameOptionValues } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from "./templates/guessing";

const name = "Zygarde's Orders";
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

class ZygardesOrders extends Guessing {
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
	customizableOptions: Dict<IGameOptionValues> = {
		points: {min: 3, base: 5, max: 5},
	};
	guessedLetters: string[] = [];
	guessLimit: number = 10;
	hints: string[] = [];
	lastAnswer: string = '';
	letters: string[] = [];
	orderRound: number = 0;
	revealedLetters: number = 0;
	roundGuesses = new Map<Player, boolean>();
	solvedLetters: string[] = [];

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.orderRound = 0;
		this.roundGuesses.clear();
		this.letters = Tools.toId(answer).split("");
		this.allLetters = this.letters.length;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = '';
		}
		const firstLetter = this.random(this.letters.length);
		this.hints[firstLetter] = this.letters[firstLetter];
		this.revealedLetters = 1;
		this.say("The category is **" + category + "**");
	}

	async onNextRound() {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		this.orderRound++;
		if (this.orderRound > 1) {
			let indicies: number[] = [];
			for (let i = 0; i < this.hints.length; i++) {
				if (this.hints[i] === '') indicies.push(i);
			}
			indicies = this.shuffle(indicies);
			let index = -1;
			for (let i = 0; i < indicies.length; i++) {
				index = indicies[i];
				this.hints[index] = this.letters[index];
				if (Client.willBeFiltered(this.hints.join(""), this.isPm(this.room) ? undefined : this.room)) {
					this.hints[index] = '';
					continue;
				}
				break;
			}
			if (index === -1) {
				const text = "All possible letters have been revealed! " + this.getAnswers('');
				this.on(text, () => {
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.say(text);
				return;
			}
			this.revealedLetters++;
		}
		const text = "**" + this.hints.join("") + "**";
		this.on(text, () => {
			if (this.revealedLetters >= this.allLetters) {
				const text = "All letters have been revealed! " + this.getAnswers('');
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
				if (!this.canGuess) this.canGuess = true;
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			}
		});
		this.say(text);
	}
}

export const game: IGameFile<ZygardesOrders> = {
	aliases: ["zygardes", "zo"],
	battleFrontierCategory: 'Identification',
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: ZygardesOrders,
	description: "Players guess answers as letters are revealed one by one (one guess per round)!",
	formerNames: ["Orders"],
	freejoin: true,
	name,
	mascot: "Zygarde",
	minigameCommand: 'order',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess the answer as letters are revealed one by one (one chance to guess correctly)!',
	variants: [
		{
			name: "Zygarde's Ability Orders",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Zygarde's Item Orders",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Zygarde's Move Orders",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Zygarde's Pokemon Orders",
			variant: "Pokemon",
		},
	],
};
