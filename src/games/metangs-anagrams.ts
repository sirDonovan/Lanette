import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Metang's Anagrams";
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

class MetangsAnagrams extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Characters"] = Dex.data.characters.slice();
		data["Pokemon"] = Games.getPokemonList().map(x => x.species);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);

		loadedData = true;
	}

	lastAnswer: string = '';

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.answers = [answer];
		const id = Tools.toId(answer);
		const letters = id.split("");
		let hint = this.shuffle(letters);
		while (hint.join("") === id) {
			hint = this.shuffle(letters);
		}
		this.hint = '[**' + category + '**] __' + hint.join(", ") + '__.';
	}
}

export const game: IGameFile<MetangsAnagrams> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['metangs', 'anags', 'ma'],
	class: MetangsAnagrams,
	defaultOptions: ['points'],
	description: "Players unscramble letters to reveal the answers!",
	formerNames: ["Anagrams"],
	freejoin: true,
	name,
	mascot: "Metang",
	minigameCommand: 'anagram',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess the answer after unscrambling the letters!",
	modes: ["survival", "team"],
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
});
