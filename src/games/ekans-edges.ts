import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

interface IEkansEdgesData {
	'Characters': Dict<string[]>;
	'Locations': Dict<string[]>;
	'Pokemon': Dict<string[]>;
	'Pokemon Abilities': Dict<string[]>;
	'Pokemon Items': Dict<string[]>;
	'Pokemon Moves': Dict<string[]>;
}

const name = "Ekans' Edges";
const data: IEkansEdgesData = {
	"Characters": {},
	"Locations": {},
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof IEkansEdgesData;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<IEkansEdgesData, string[]> = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
let loadedData = false;

class EkansEdges extends Guessing {
	lastEdge: string = '';

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		for (const character of Dex.data.characters) {
			const edge = character.charAt(0) + " - " + character.substr(-1);
			if (!data["Characters"][edge]) data["Characters"][edge] = [];
			data["Characters"][edge].push(character);
		}

		for (const location of Dex.data.locations) {
			const edge = location.charAt(0) + " - " + location.substr(-1);
			if (!data["Locations"][edge]) data["Locations"][edge] = [];
			data["Locations"][edge].push(location);
		}

		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const edge = pokemon.name.charAt(0) + " - " + pokemon.name.substr(-1);
			if (!data["Pokemon"][edge]) data["Pokemon"][edge] = [];
			data["Pokemon"][edge].push(pokemon.name);
		}

		const abilities = Games.getAbilitiesList();
		for (const ability of abilities) {
			const edge = ability.name.charAt(0) + " - " + ability.name.substr(-1);
			if (!data["Pokemon Abilities"][edge]) data["Pokemon Abilities"][edge] = [];
			data["Pokemon Abilities"][edge].push(ability.name);
		}

		const items = Games.getItemsList();
		for (const item of items) {
			const edge = item.name.charAt(0) + " - " + item.name.substr(-1);
			if (!data["Pokemon Items"][edge]) data["Pokemon Items"][edge] = [];
			data["Pokemon Items"][edge].push(item.name);
		}

		const moves = Games.getMovesList();
		for (const move of moves) {
			const edge = move.name.charAt(0) + " - " + move.name.substr(-1);
			if (!data["Pokemon Moves"][edge]) data["Pokemon Moves"][edge] = [];
			data["Pokemon Moves"][edge].push(move.name);
		}

		const keys = Object.keys(data) as DataKey[];
		for (const key of keys) {
			dataKeys[key] = Object.keys(data[key]);
		}

		loadedData = true;
	}

	onSignups(): void {
		if (!this.isMiniGame) {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let edge = this.sampleOne(dataKeys[category]);
		while (edge === this.lastEdge) {
			edge = this.sampleOne(dataKeys[category]);
		}
		this.answers = data[category][edge];
		this.hint = "<b>" + category + "</b>: <i>" + edge + "</i>";
	}
}

export const game: IGameFile<EkansEdges> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['ekans', 'ee'],
	category: 'identification',
	class: EkansEdges,
	defaultOptions: ['points'],
	description: "Players guess answers that have the given starting and ending letters!",
	formerNames: ["Edges"],
	freejoin: true,
	name,
	mascot: "Ekans",
	minigameCommand: 'edge',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer with the given starting and ending letters!",
	modes: ["survival", "team"],
	variants: [
		{
			name: "Ekans' Ability Edges",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Ekans' Character Edges",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Ekans' Item Edges",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Ekans' Location Edges",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Ekans' Move Edges",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Ekans' Pokemon Edges",
			variant: "Pokemon",
		},
	],
});
