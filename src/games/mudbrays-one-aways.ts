import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

interface IMudbraysOneAwaysData {
	'Characters': Dict<string[]>;
	'Locations': Dict<string[]>;
	'Pokemon': Dict<string[]>;
	'Pokemon Abilities': Dict<string[]>;
	'Pokemon Items': Dict<string[]>;
	'Pokemon Moves': Dict<string[]>;
}

const data: IMudbraysOneAwaysData = {
	"Characters": {},
	"Locations": {},
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof IMudbraysOneAwaysData;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<DataKey, string[]> = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};

const upperCaseLetters: string[] = Tools.letters.toUpperCase().split("");
const lowerCaseLetters: string[] = Tools.letters.split("");

function getNextAndPreviousLetters(letter: string): [string, string] | null {
	let index = upperCaseLetters.indexOf(letter);
	if (index !== -1) {
		if (index === 0) return ["B", "Z"];
		if (index === 25) return ["A", "Y"];
		return [upperCaseLetters[index + 1], upperCaseLetters[index - 1]];
	} else {
		index = lowerCaseLetters.indexOf(letter);
		if (index === -1) return null;

		if (index === 0) return ["b", "z"];
		if (index === 25) return ["a", "y"];
		return [lowerCaseLetters[index + 1], lowerCaseLetters[index - 1]];
	}
}

function getOneAways(word: string): string[] | null {
	if (word.length < 3 || Tools.containsInteger(word)) return null;

	const letters = word.split("");
	const oneAways: [string[], string[]] = [letters.slice(), letters.slice()];
	for (let i = 0; i < letters.length; i++) {
		if (!letters[i]) continue;
		const letter = letters[i];

		const nextAndPreviousLetters = getNextAndPreviousLetters(letter);
		if (!nextAndPreviousLetters) continue;

		oneAways[0][i] = nextAndPreviousLetters[0];
		oneAways[1][i] = nextAndPreviousLetters[1];
	}

	return [oneAways[0].join(""), oneAways[1].join("")];
}

class MudbraysOneAways extends QuestionAndAnswer {
	lastOneAway: string = '';
	roundTime: number = 30 * 1000;

	static loadData(): void {
		const characters = Dex.getCharacters();
		for (const character of characters) {
			const oneAways = getOneAways(character);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Characters"])) data["Characters"][oneAway] = [];
				data["Characters"][oneAway].push(character);
			}
		}

		const locations = Dex.getLocations();
		for (const location of locations) {
			const oneAways = getOneAways(location);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Locations"])) data["Locations"][oneAway] = [];
				data["Locations"][oneAway].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const oneAways = getOneAways(pokemon.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Pokemon"])) data["Pokemon"][oneAway] = [];
				data["Pokemon"][oneAway].push(pokemon.name);
			}
		}

		for (const ability of Games.getAbilitiesList()) {
			const oneAways = getOneAways(ability.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Pokemon Abilities"])) data["Pokemon Abilities"][oneAway] = [];
				data["Pokemon Abilities"][oneAway].push(ability.name);
			}
		}

		for (const item of Games.getItemsList()) {
			const oneAways = getOneAways(item.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Pokemon Items"])) data["Pokemon Items"][oneAway] = [];
				data["Pokemon Items"][oneAway].push(item.name);
			}
		}

		for (const move of Games.getMovesList()) {
			const oneAways = getOneAways(move.name);
			if (!oneAways) continue;
			for (const oneAway of oneAways) {
				if (!(oneAway in data["Pokemon Moves"])) data["Pokemon Moves"][oneAway] = [];
				data["Pokemon Moves"][oneAway].push(move.name);
			}
		}

		const keys = Object.keys(data) as DataKey[];
		for (const key of keys) {
			dataKeys[key] = Object.keys(data[key]);
		}
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		let oneAway = this.sampleOne(dataKeys[category]);
		while (oneAway === this.lastOneAway || Client.checkFilters(oneAway, this.isPm(this.room) ? undefined : this.room)) {
			oneAway = this.sampleOne(dataKeys[category]);
		}
		this.lastOneAway = oneAway;
		this.answers = data[category][oneAway];
		this.hint = "<b>" + category + "</b>: <i>" + oneAway + "</i>";
	}
}

export const game: IGameFile<MudbraysOneAways> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['mudbrays', 'oneaways', 'moa'],
	category: 'identification',
	class: MudbraysOneAways,
	defaultOptions: ['points'],
	description: "Players change each letter in the word to either the next or previous letter of the alphabet to find the answer " +
		"(e.g. Nvecsbz = Mudbray)!",
	freejoin: true,
	name: "Mudbray's One Aways",
	mascot: "Mudbray",
	minigameCommand: 'oneaway',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the answer after changing each letter in the word " +
		"to either the next or previous letter of the alphabet (e.g. Nvecsbz = Mudbray)!",
	modes: ["survival", "team", "timeattack"],
	variants: [
		{
			name: "Mudbray's Ability One Aways",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Mudbray's Character One Aways",
			roundCategory: "Characters",
			variantAliases: ['character', 'characters'],
		},
		{
			name: "Mudbray's Item One Aways",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Mudbray's Location One Aways",
			roundCategory: "Locations",
			variantAliases: ['location', 'locations'],
		},
		{
			name: "Mudbray's Move One Aways",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Mudbray's Pokemon One Aways",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});
