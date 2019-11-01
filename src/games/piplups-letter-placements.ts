import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Piplup's Letter Placements";
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

class PiplupsLetterPlacements extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Characters"] = Dex.data.characters.filter(x => x.length > 3);
		data["Pokemon"] = Dex.getPokemonList(x => x.species.length > 3).map(x => x.species);
		data["Pokemon Abilities"] = Dex.getAbilitiesList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Items"] = Dex.getItemsList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Moves"] = Dex.getMovesList(x => x.name.length > 3).map(x => x.name);

		loadedData = true;
	}

	lastAnswer: string = '';

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = Tools.toId(this.sampleOne(data[category]));
		while (answer === this.lastAnswer) {
			answer = Tools.toId(this.sampleOne(data[category]));
		}
		this.lastAnswer = answer;
		const startingPosition = this.random(answer.length - 2);
		const letters = answer.substr(startingPosition, 3);
		if (Client.willBeFiltered(letters, this.isPm(this.room) ? undefined : this.room)) {
			await this.setAnswers();
			return;
		}

		this.answers = [];
		for (let i = 0; i < data[category].length; i++) {
			if (Tools.toId(data[category][i]).includes(letters)) this.answers.push(data[category][i]);
		}

		this.hint = '[**' + category + '**] __' + letters + '__';
	}
}

export const game: IGameFile<PiplupsLetterPlacements> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["piplups", "plp"],
	class: PiplupsLetterPlacements,
	defaultOptions: ['points'],
	description: "Players guess answers that contain the given letters back-to-back!",
	freejoin: true,
	name,
	mascot: "Piplup",
	modes: ['survival'],
	minigameCommand: 'placement',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess an answer that contains the given letters back-to-back!',
});
