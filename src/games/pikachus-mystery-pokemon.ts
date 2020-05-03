import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";
import { User } from "../users";

const name = "Pikachu's Mystery Pokemon";
const data: {abilities: Dict<string[]>; eggGroups: Dict<string>; pokedex: string[]; regions: Dict<string>; types: Dict<string>} = {
	abilities: {},
	eggGroups: {},
	pokedex: [],
	regions: {},
	types: {},
};
let loadedData = false;

const achievements: AchievementsDict = {
	"pokemonprofessor": {name: "Pokemon Professor", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
};

class PikachusMysteryPokemon extends Guessing {
	allAnswersAchievement = achievements.pokemonprofessor;
	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	hintsIndex: number = 0;
	lastSpecies: string = '';
	points = new Map<Player, number>();

	static loadData(room: Room | User): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList(pokemon => !pokemon.forme);
		for (const pokemon of pokemonList) {
			data.pokedex.push(pokemon.id);
			data.eggGroups[pokemon.id] = pokemon.eggGroups.join(", ");
			data.types[pokemon.id] = pokemon.types.join("/");

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
			if (region) data.regions[pokemon.id] = region;

			const abilities: string[] = [];
			for (const i in pokemon.abilities) {
				if (i === 'H') continue;
				// @ts-expect-error
				abilities.push(pokemon.abilities[i]);
			}
			data.abilities[pokemon.id] = abilities;
		}

		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		this.hintsIndex = 0;
		let species = this.sampleOne(data.pokedex);
		while (this.lastSpecies === species) {
			species = this.sampleOne(data.pokedex);
		}
		this.lastSpecies = species;
		const pokemon = Dex.getExistingPokemon(species);
		const hints: string[] = [];
		hints.push("**Type" + (data.types[species].includes('/') ? "s" : "") + "**: " + data.types[species]);
		if (species in data.regions) hints.push("**Region**: " + data.regions[species]);
		hints.push("**Color**: " + pokemon.color);
		hints.push("**Egg group" + (data.eggGroups[species].includes(',') ? "s" : "") + "**: " + data.eggGroups[species]);
		hints.push("**Ability**: " + this.sampleOne(data.abilities[species]));
		this.hints = this.shuffle(hints);
		this.answers = [pokemon.name];
	}

	async onNextRound(): Promise<void> {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
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

export const game: IGameFile<PikachusMysteryPokemon> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ["pikachus", "mysterypokemon", "pmp", "wtp"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	class: PikachusMysteryPokemon,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given hints!",
	formerNames: ["Who's That Pokemon"],
	freejoin: true,
	name,
	mascot: "Pikachu",
});
