import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Kyurem's Splits";
const data: Dict<string[]> = {
	"Characters": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
const categories: string[] = Object.keys(data);
let loadedData = false;

class KyuremsSplits extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		for (let i = 0; i < Dex.data.characters.length; i++) {
			data["Characters"].push(Dex.data.characters[i]);
		}

		const pokemon = Dex.getPokemonList();
		for (let i = 0; i < pokemon.length; i++) {
			data["Pokemon"].push(pokemon[i].species);
		}

		const abilities = Dex.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			data["Pokemon Abilities"].push(abilities[i].name);
		}

		const items = Dex.getItemsList();
		for (let i = 0; i < items.length; i++) {
			data["Pokemon Items"].push(items[i].name);
		}

		const moves = Dex.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			data["Pokemon Moves"].push(moves[i].name);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];

	onSignups() {
		if (this.isMiniGame) {
			this.nextRound();
		} else {
			if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	isValid(answer: string, hint: string): boolean {
		while (hint.length > 0) {
			const index = answer.indexOf(hint[0]);
			if (index === -1) return false;
			answer = answer.substr(index + 1);
			hint = hint.substr(1);
		}
		return true;
	}

	setAnswers() {
		const category = this.roundCategory || this.variant || this.sampleOne(categories);
		let hint = '';
		while (!this.answers.length || this.answers.length > 15 || Client.willBeFiltered(hint)) {
			const answer = Tools.toId(this.sampleOne(data[category]));
			const validIndices: number[] = [];
			for (let i = 1; i < answer.length; i++) {
				validIndices.push(i);
			}
			const numberOfLetters = Math.min(5, Math.max(2, Math.floor(validIndices.length * (Math.random() * 0.4 + 0.3))));
			const chosenIndices = this.sampleMany(validIndices, numberOfLetters);
			hint = '';
			for (let i = 0; i < chosenIndices.length; i++) {
				hint += answer[chosenIndices[i]];
			}
			this.answers = [];
			for (let i = 0; i < data[category].length; i++) {
				if (this.isValid(Tools.toId(data[category][i]), hint)) {
					this.answers.push(data[category][i]);
				}
			}
		}
		this.hint = "[**" + category + "**]: " + hint.toUpperCase();
	}
}

export const game: IGameFile<KyuremsSplits> = {
	aliases: ['kyurems'],
	battleFrontierCategory: 'Identification',
	class: KyuremsSplits,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players guess answers that have all of the given letters in order!",
	formerNames: ["Splits"],
	freejoin: true,
	name,
	mascot: "Kyurem",
	minigameCommand: 'split',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer with all of the given letters in that order!",
	modes: ["survival"],
	variants: [
		{
			name: "Kyurem's Ability Splits",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Kyurem's Item Splits",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Kyurem's Move Splits",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Kyurem's Pokemon Splits",
			variant: "Pokemon",
		},
	],
};
