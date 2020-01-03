import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_POINTS = 30;
const BASE_TEAM_POINTS = 60;

const name = "Lugia's Obstructive Letters";
const data: {'Pokemon': Dict<string>, 'Pokemon Abilities': Dict<string>, 'Pokemon Items': Dict<string>, 'Pokemon Moves': Dict<string>} = {
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<typeof data, string[]> = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
const letters = "abcdefghijklmnopqrstuvwxyz".split("");
let loadedData = false;

class LugiasObstructiveLetters extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemon = Games.getPokemonList();
		for (let i = 0; i < pokemon.length; i++) {
			data["Pokemon"][pokemon[i].id] = pokemon[i].species;
		}

		const abilities = Games.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			data["Pokemon Abilities"][abilities[i].id] = abilities[i].name;
		}

		const items = Games.getItemsList();
		for (let i = 0; i < items.length; i++) {
			data["Pokemon Items"][items[i].id] = items[i].name;
		}

		const moves = Games.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			data["Pokemon Moves"][moves[i].id] = moves[i].name;
		}

		for (let i = 0; i < categories.length; i++) {
			dataKeys[categories[i]] = Object.keys(data[categories[i]]);
		}

		loadedData = true;
	}

	loserPointsToBits: number = 2;
	roundTime: number = 30 * 1000;
	winnerPointsToBits: number = 10;

	async setAnswers() {
		let answers: string[] = [];
		let category: DataKey;
		let unavailableLetters: string[] = [];
		while (!answers.length || answers.length > 20) {
			category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
			const id = this.sampleOne(dataKeys[category]);
			const availableLetters: string[] = [];
			for (let i = 0; i < letters.length; i++) {
				if (id.indexOf(letters[i]) === -1) availableLetters.push(letters[i]);
			}
			unavailableLetters = this.sampleMany(availableLetters, Math.floor(availableLetters.length / 2)).sort();
			answers = [];
			for (let i = 0; i < dataKeys[category].length; i++) {
				const answer = dataKeys[category][i];
				if (answer.length <= 5) continue;
				let hasUnavailableLetter = false;
				for (let i = 0; i < unavailableLetters.length; i++) {
					if (answer.indexOf(unavailableLetters[i]) !== -1) {
						hasUnavailableLetter = true;
						break;
					}
				}
				if (hasUnavailableLetter) continue;
				answers.push(data[category][answer]);
			}
		}
		this.answers = answers;
		this.hint = "<b>" + category! + "</b>: <i>" + unavailableLetters.map(letter => letter.toUpperCase()).join(", ") + "</i>";
	}

	getPointsForAnswer(answer: string): number {
		return Tools.toId(answer).length;
	}
}

export const game: IGameFile<LugiasObstructiveLetters> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['lugias', 'lol'],
	class: LugiasObstructiveLetters,
	customizableOptions: {
		points: {min: BASE_POINTS, base: BASE_POINTS, max: BASE_POINTS},
		teamPoints: {min: BASE_TEAM_POINTS, base: BASE_TEAM_POINTS, max: BASE_TEAM_POINTS},
	},
	description: "Players guess answers that are missing the given letters! Answers must be at least 6 letters long.",
	freejoin: true,
	name,
	mascot: "Lugia",
	modes: ['survival', 'team'],
});
