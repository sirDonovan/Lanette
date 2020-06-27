import type { Room } from "../rooms";
import type { IGameFile, IGameFormat } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_NUMBER_OF_NAMES = 2;
const data: {'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]; 'Pokemon': string[]} = {
	'Pokemon Abilities': [],
	'Pokemon Items': [],
	'Pokemon Moves': [],
	'Pokemon': [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class MagnetonsMashups extends Guessing {
	roundTime: number = 30 * 1000;

	static loadData(room: Room | User): void {
		const abilities = Games.getAbilitiesList();
		for (const ability of abilities) {
			data['Pokemon Abilities'].push(ability.name);
		}

		const items = Games.getItemsList();
		for (const item of items) {
			data['Pokemon Items'].push(item.name);
		}

		const moves = Games.getMovesList();
		for (const move of moves) {
			data['Pokemon Moves'].push(move.name);
		}

		const pokedex = Games.getPokemonList();
		for (const pokemon of pokedex) {
			data['Pokemon'].push(pokemon.name);
		}
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		return "The" + (finalAnswer ? " final " : "") + " answer was __" + this.answers[0] + "__.";
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async checkAnswer(guess: string): Promise<string> {
		guess = Tools.toId(guess);
		for (let i = 1; i < this.answers.length; i++) {
			if (Tools.toId(this.answers[i]) === guess) return this.answers[0];
		}
		return "";
	}

	async setAnswers(): Promise<void> {
		let numberOfElements: number;
		if (this.format.inputOptions.names) {
			numberOfElements = this.format.options.names;
		} else {
			numberOfElements = BASE_NUMBER_OF_NAMES;
			if ((this.format as IGameFormat).customizableOptions.names) {
				numberOfElements += this.random((this.format as IGameFormat).customizableOptions.names.max - BASE_NUMBER_OF_NAMES + 1);
			}
		}

		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		const elements = this.sampleMany(data[category], numberOfElements);

		let mashup = "";
		let totalLength = 0;

		const elementIds: string[] = [];
		const currentIndices: number[] = [];
		const finalIndices: number[] = [];
		for (let i = 0; i < numberOfElements; i++) {
			const id = Tools.toId(elements[i]);
			elementIds.push(id);

			const length = id.length;
			totalLength += length;

			currentIndices.push(0);
			finalIndices.push(length - 1);
		}

		const useOrder: number[] = [];
		let lastIndex = -1;
		while (mashup.length < totalLength) {
			let index = this.random(numberOfElements);
			while (currentIndices[index] > finalIndices[index]) {
				index = this.random(numberOfElements);
			}

			if (index === lastIndex) {
				let lastElement = true;
				for (let i = 0; i < numberOfElements; i++) {
					if (i !== index && currentIndices[i] < finalIndices[i]) {
						lastElement = false;
						break;
					}
				}

				if (!lastElement) continue;
			}

			if (!useOrder.includes(index)) useOrder.push(index);

			const characters = this.random(3) + (numberOfElements - 1);
			for (let i = 0; i < characters; i++) {
				mashup += elementIds[index][currentIndices[index]];
				currentIndices[index]++;
				if (currentIndices[index] > finalIndices[index]) break;
			}

			lastIndex = index;
		}

		if (Client.willBeFiltered(mashup, !this.isPm(this.room) ? this.room : undefined)) {
			await this.setAnswers();
			return;
		}

		this.answers = Tools.getPermutations(elements).map(x => x.join(""));
		this.answers.unshift(Tools.joinList(useOrder.map(x => elements[x]), undefined, undefined, "&"));
		this.hint = "<b>" + category + "</b>: <i>" + mashup + "</i>";
		this.additionalHintHeader = "- " + numberOfElements + " names";
	}
}

export const game: IGameFile<MagnetonsMashups> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['magnetons'],
	category: 'identification',
	class: MagnetonsMashups,
	customizableOptions: {
		names: {min: 2, base: BASE_NUMBER_OF_NAMES, max: 4},
	},
	defaultOptions: ['points'],
	description: "Players unscramble the two combined names each round!",
	formerNames: ['Mashups'],
	freejoin: true,
	name: "Magneton's Mashups",
	mascot: "Magneton",
	minigameCommand: 'mashup',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess the two unscrambled names!",
	modes: ["survival", "team"],
	variants: [
		{
			name: "Magneton's Ability Mashups",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Magneton's Item Mashups",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Magneton's Move Mashups",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Magneton's Pokemon Mashups",
			variant: "Pokemon",
		},
	],
});
