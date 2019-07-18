import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Metangs's Anagrams";
const data: Dict<string[]> = {
	"Characters": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
const categories = Object.keys(data);
let loadedData = false;

class MetangsAnagrams extends Guessing {
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

	defaultOptions: DefaultGameOptions[] = ['points'];
	lastAnswer: string = '';

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
		const id = Tools.toId(answer);
		const letters = id.split("");
		let hint = Tools.shuffle(letters);
		while (hint.join("") === id) {
			hint = Tools.shuffle(letters);
		}
		this.hint = '[**' + category + '**] __' + hint.join(", ") + '__.';
	}
}

export const game: IGameFile<MetangsAnagrams> = {
	aliases: ['metangs', 'anags'],
	battleFrontierCategory: 'Identification',
	class: MetangsAnagrams,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players unscramble letters to reveal the answers!",
	formerNames: ["Anagrams"],
	freejoin: true,
	name,
	mascot: "Metang",
	minigameCommand: 'anagram',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess the answer after unscrambling the letters!",
	modes: ["survival"],
	variants: [
		{
			name: "Metangs's Ability Anagrams",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Metangs's Item Anagrams",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Metangs's Move Anagrams",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Metangs's Pokemon Anagrams",
			variant: "Pokemon",
		},
	],
};
