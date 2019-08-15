import { Player } from "../room-activity";
import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commands, Guessing } from "./templates/guessing";

const name = "Pikachu's Mystery Pokemon";
const pokedex: string[] = [];
let loadedData = false;

class PikachusMysteryPokemon extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList(pokemon => !!pokemon.forme);
		for (let i = 0; i < pokemonList.length; i++) {
			pokedex.push(pokemonList[i].species);
		}

		loadedData = true;
	}

	answers: string[] = [];
	canGuess: boolean = false;
	defaultOptions: DefaultGameOption[] = ['points'];
	hints: string[] = [];
	hintsIndex: number = 0;
	lastSpecies: string = '';
	points = new Map<Player, number>();

	onSignups() {
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	setAnswers() {
		this.hintsIndex = 0;
		let species = this.sampleOne(pokedex);
		while (this.lastSpecies === species) {
			species = this.sampleOne(pokedex);
		}
		this.lastSpecies = species;
		const pokemon = Dex.getExistingPokemon(species);
		const hints: string[] = [];
		hints.push("**Type" + (pokemon.types.length > 1 ? "s" : "") + "**: " + pokemon.types.join("/"));
		let region;
		if (pokemon.gen === 1) {
			region = 'Kanto';
		} else if (pokemon.gen === 2) {
			region = 'Johto';
		} else if (pokemon.gen === 3) {
			region = 'Hoenn';
		} else if (pokemon.gen === 4) {
			region = 'Sinnoh';
		} else if (pokemon.gen === 5) {
			region = 'Unova';
		} else if (pokemon.gen === 6) {
			region = 'Kalos';
		} else if (pokemon.gen === 7) {
			region = 'Alola';
		}
		if (region) hints.push("**Region**: " + region);
		hints.push("**Color**: " + pokemon.color);
		hints.push("**Egg group" + (pokemon.eggGroups.length > 1 ? "s" : "") + "**: " + pokemon.eggGroups.join(", "));
		const abilities: string[] = [];
		for (const i in pokemon.abilities) {
			if (i === 'H') continue;
			// @ts-ignore
			abilities.push(pokemon.abilities[i]);
		}
		hints.push("**Ability**: " + this.sampleOne(abilities));
		this.hints = this.shuffle(hints);
		this.answers = [pokemon.species];
	}

	onNextRound() {
		if (!this.answers.length) {
			this.canGuess = false;
			this.setAnswers();
		}
		if (!this.hints[this.hintsIndex]) {
			const text = "All hints have been revealed! " + this.getAnswers('');
			this.answers = [];
			this.on(text, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		}
		const text = "``[hint " + (this.hintsIndex + 1) + "]`` " + this.hints[this.hintsIndex];
		this.hintsIndex++;
		this.on(text, () => {
			if (!this.answers.length) return;
			if (!this.canGuess) this.canGuess = true;
			this.timeout = setTimeout(() => this.nextRound(), 10000);
		});
		this.say(text);
	}
}

export const game: IGameFile<PikachusMysteryPokemon> = {
	aliases: ["pikachus", "mysterypokemon", "pmp", "wtp"],
	battleFrontierCategory: 'Puzzle',
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	commands,
	class: PikachusMysteryPokemon,
	description: "Players guess Pokemon based on the given hints!",
	formerNames: ["Who's That Pokemon"],
	freejoin: true,
	name,
	mascot: "Pikachu",
};
