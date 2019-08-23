import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Magneton's Mashups";
const data: {'Pokemon': string[]} = {
	'Pokemon': [],
};
let loadedData = false;

class MagnetonsMashups extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Dex.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			data['Pokemon'].push(pokedex[i].species);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];

	async checkAnswer(guess: string): Promise<string> {
		guess = Tools.toId(guess);
		const pokemon = this.answers[0].split(" & ");
		let match = '';
		if (guess === Tools.toId(pokemon[0] + pokemon[1])) {
			match = pokemon[0] + ' & ' + pokemon[1];
		} else if (guess === Tools.toId(pokemon[1] + pokemon[0])) {
			match = pokemon[1] + ' & ' + pokemon[0];
		}
		return Promise.resolve(match);
	}

	setAnswers() {
		const pokemon = this.sampleMany(data['Pokemon'], 2);
		let indexA = 0;
		let indexB = 0;
		let mashup = "";
		const lenA = pokemon[0].length;
		const lenB = pokemon[1].length;
		let countA = 0;
		let countB = 0;
		let chance = 2;
		if (lenB > lenA) chance = 3;
		while (indexA < lenA && indexB < lenB) {
			if ((!this.random(chance) && countA < 3) || countB >= 3) {
				mashup += pokemon[0][indexA];
				indexA++;
				countA++;
				if (countB) countB = 0;
			} else {
				mashup += pokemon[1][indexB];
				indexB++;
				countB++;
				if (countA) countA = 0;
			}
		}
		while (indexA < lenA) {
			mashup += pokemon[0][indexA];
			indexA++;
		}
		while (indexB < lenB) {
			mashup += pokemon[1][indexB];
			indexB++;
		}
		mashup = Tools.toId(mashup);
		if (Client.willBeFiltered(mashup, !this.isPm(this.room) ? this.room : undefined)) {
			this.setAnswers();
			return;
		}
		this.answers = [pokemon[0] + ' & ' + pokemon[1]];
		this.hint = "**" + mashup + "**";
	}
}

export const game: IGameFile<MagnetonsMashups> = {
	aliases: ['magnetons'],
	battleFrontierCategory: 'Identification',
	class: MagnetonsMashups,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players unscramble the combined names of two Pokemon each round!",
	formerNames: ['Mashups'],
	freejoin: true,
	name,
	mascot: "Magneton",
	minigameCommand: 'mashup',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess the two unscrambled Pokemon names!",
	modes: ["survival"],
};
