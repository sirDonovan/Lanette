import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Ekans' Edges";
const data: {'Characters': Dict<string[]>, 'Pokemon': Dict<string[]>, 'Pokemon Abilities': Dict<string[]>, 'Pokemon Items': Dict<string[]>, 'Pokemon Moves': Dict<string[]>} = {
	"Characters": {},
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<typeof data, string[]> = {
	"Characters": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
let loadedData = false;

class EkansEdges extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		for (let i = 0; i < Dex.data.characters.length; i++) {
			const edge = Dex.data.characters[i].charAt(0) + " - " + Dex.data.characters[i].substr(-1);
			if (!data["Characters"][edge]) data["Characters"][edge] = [];
			data["Characters"][edge].push(Dex.data.characters[i]);
		}

		const pokemon = Games.getPokemonList();
		for (let i = 0; i < pokemon.length; i++) {
			const edge = pokemon[i].species.charAt(0) + " - " + pokemon[i].species.substr(-1);
			if (!data["Pokemon"][edge]) data["Pokemon"][edge] = [];
			data["Pokemon"][edge].push(pokemon[i].species);
		}

		const abilities = Games.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			const edge = abilities[i].name.charAt(0) + " - " + abilities[i].name.substr(-1);
			if (!data["Pokemon Abilities"][edge]) data["Pokemon Abilities"][edge] = [];
			data["Pokemon Abilities"][edge].push(abilities[i].name);
		}

		const items = Games.getItemsList();
		for (let i = 0; i < items.length; i++) {
			const edge = items[i].name.charAt(0) + " - " + items[i].name.substr(-1);
			if (!data["Pokemon Items"][edge]) data["Pokemon Items"][edge] = [];
			data["Pokemon Items"][edge].push(items[i].name);
		}

		const moves = Games.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			const edge = moves[i].name.charAt(0) + " - " + moves[i].name.substr(-1);
			if (!data["Pokemon Moves"][edge]) data["Pokemon Moves"][edge] = [];
			data["Pokemon Moves"][edge].push(moves[i].name);
		}

		const keys = Object.keys(data) as DataKey[];
		for (let i = 0; i < keys.length; i++) {
			dataKeys[keys[i]] = Object.keys(data[keys[i]]);
		}

		loadedData = true;
	}

	lastEdge: string = '';

	onSignups() {
		if (this.isMiniGame) {
			this.nextRound();
		} else {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let edge = this.sampleOne(dataKeys[category]);
		while (edge === this.lastEdge) {
			edge = this.sampleOne(dataKeys[category]);
		}
		this.answers = data[category][edge];
		this.hint = "[**" + category + "**] " + edge;
	}
}

export const game: IGameFile<EkansEdges> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['ekans', 'ee'],
	class: EkansEdges,
	defaultOptions: ['points'],
	description: "Players guess answers that have the given starting and ending letters!",
	formerNames: ["Edges"],
	freejoin: true,
	name,
	mascot: "Ekans",
	minigameCommand: 'edge',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer with the given starting and ending letters!",
	modes: ["survival"],
	variants: [
		{
			name: "Ekans' Ability Edges",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Ekans' Item Edges",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
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
