import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Magneton's Mashups";
const data: {'Pokemon Abilities': string[], 'Pokemon Items': string[], 'Pokemon Moves': string[], 'Pokemon': string[]} = {
	'Pokemon Abilities': [],
	'Pokemon Items': [],
	'Pokemon Moves': [],
	'Pokemon': [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

class MagnetonsMashups extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const abilities = Games.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			data['Pokemon Abilities'].push(abilities[i].name);
		}

		const items = Games.getItemsList();
		for (let i = 0; i < items.length; i++) {
			data['Pokemon Items'].push(items[i].name);
		}

		const moves = Games.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			data['Pokemon Moves'].push(moves[i].name);
		}

		const pokedex = Games.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			data['Pokemon'].push(pokedex[i].species);
		}

		loadedData = true;
	}

	async checkAnswer(guess: string): Promise<string> {
		guess = Tools.toId(guess);
		const answer = this.answers[0].split(" & ");
		let match = '';
		if (guess === Tools.toId(answer[0] + answer[1])) {
			match = answer[0] + ' & ' + answer[1];
		} else if (guess === Tools.toId(answer[1] + answer[0])) {
			match = answer[1] + ' & ' + answer[0];
		}
		return match;
	}

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		const answer = this.sampleMany(data[category], 2);
		let indexA = 0;
		let indexB = 0;
		let mashup = "";
		const lenA = answer[0].length;
		const lenB = answer[1].length;
		let countA = 0;
		let countB = 0;
		let chance = 2;
		if (lenB > lenA) chance = 3;
		while (indexA < lenA && indexB < lenB) {
			if ((!this.random(chance) && countA < 3) || countB >= 3) {
				mashup += answer[0][indexA];
				indexA++;
				countA++;
				if (countB) countB = 0;
			} else {
				mashup += answer[1][indexB];
				indexB++;
				countB++;
				if (countA) countA = 0;
			}
		}
		while (indexA < lenA) {
			mashup += answer[0][indexA];
			indexA++;
		}
		while (indexB < lenB) {
			mashup += answer[1][indexB];
			indexB++;
		}

		mashup = Tools.toId(mashup);
		if (Client.willBeFiltered(mashup, !this.isPm(this.room) ? this.room : undefined)) {
			await this.setAnswers();
			return;
		}
		this.answers = [answer[0] + ' & ' + answer[1]];
		this.hint = "<b>" + category + "</b>: <i>" + mashup + "</i>";
	}
}

export const game: IGameFile<MagnetonsMashups> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['magnetons'],
	class: MagnetonsMashups,
	defaultOptions: ['points'],
	description: "Players unscramble the two combined names each round!",
	formerNames: ['Mashups'],
	freejoin: true,
	name,
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
