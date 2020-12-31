import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_NUMBER_OF_NAMES = 2;
const data: {'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]; 'Pokemon': string[]} = {
	'Pokemon Abilities': [],
	'Pokemon Items': [],
	'Pokemon Moves': [],
	'Pokemon': [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class MagnetonsMashups extends QuestionAndAnswer {
	roundTime: number = 30 * 1000;

	static loadData(): void {
		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		return "The" + (finalAnswer ? " final " : "") + " answer was __" + this.answers[0] + "__.";
	}

	checkAnswer(guess: string): string {
		guess = Tools.toId(guess);
		for (let i = 1; i < this.answers.length; i++) {
			if (Tools.toId(this.answers[i]) === guess) return this.answers[0];
		}
		return "";
	}

	generateAnswer(): void {
		let numberOfElements: number;
		if (this.format.inputOptions.names) {
			numberOfElements = this.format.options.names;
		} else {
			numberOfElements = BASE_NUMBER_OF_NAMES;
			if ('names' in this.format.customizableOptions) {
				numberOfElements += this.random(this.format.customizableOptions.names.max - BASE_NUMBER_OF_NAMES + 1);
			}
		}

		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
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

		if (Client.checkFilters(mashup, !this.isPm(this.room) ? this.room : undefined)) {
			this.generateAnswer();
			return;
		}

		this.answers = [Tools.joinList(useOrder.map(x => elements[x]), undefined, undefined, "&")].concat(
			Tools.getPermutations(elements).map(x => x.join("")));
		this.hint = "<b>" + category + "</b>: <i>" + mashup + "</i>";
		this.additionalHintHeader = "- " + numberOfElements + " names";
	}
}

export const game: IGameFile<MagnetonsMashups> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['magnetons'],
	category: 'identification',
	class: MagnetonsMashups,
	customizableOptions: {
		names: {min: 2, base: BASE_NUMBER_OF_NAMES, max: 4},
	},
	defaultOptions: ['points'],
	description: "Players unscramble the combined names each round!",
	formerNames: ['Mashups'],
	freejoin: true,
	name: "Magneton's Mashups",
	mascot: "Magneton",
	minigameCommand: 'mashup',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the unscrambled names!",
	modes: ["survival", "team"],
	modeProperties: {
		'survival': {
			roundTime: 15 * 1000,
		},
	},
	variants: [
		{
			name: "Magneton's Ability Mashups",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Magneton's Item Mashups",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Magneton's Move Mashups",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Magneton's Pokemon Mashups",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
