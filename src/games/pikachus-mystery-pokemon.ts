import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "pokemonprofessor";

const data: {abilities: Dict<string[]>; eggGroups: Dict<string>; pokedex: string[]; regions: Dict<string>; types: Dict<string>} = {
	abilities: {},
	eggGroups: {},
	pokedex: [],
	regions: {},
	types: {},
};

class PikachusMysteryPokemon extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"pokemonprofessor": {name: "Pokemon Professor", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	};

	allAnswersAchievement = PikachusMysteryPokemon.achievements.pokemonprofessor;
	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	lastSpecies: string = '';
	multiRoundHints = true;
	mysteryRound: number = -1;
	points = new Map<Player, number>();
	roundGuesses: Map<Player, boolean> | undefined = new Map();
	roundTime = 0;
	updateHintTime = 5 * 1000;

	static loadData(): void {
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
			} else if (pokemon.gen === 8) {
				region = 'Galar';
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
	}

	generateAnswer(): void {
		this.mysteryRound = -1;
		let species = this.sampleOne(data.pokedex);
		while (this.lastSpecies === species) {
			species = this.sampleOne(data.pokedex);
		}
		this.lastSpecies = species;
		const pokemon = Dex.getExistingPokemon(species);
		const hints: string[] = [];
		hints.push("<b>Type" + (data.types[species].includes('/') ? "s" : "") + "</b>: " + data.types[species]);
		if (species in data.regions) hints.push("<b>Region</b>: " + data.regions[species]);
		hints.push("<b>Color</b>: " + pokemon.color);
		hints.push("<b>Egg group" + (data.eggGroups[species].includes(',') ? "s" : "") + "</b>: " + data.eggGroups[species]);
		hints.push("<b>Ability</b>: " + this.sampleOne(data.abilities[species]));
		this.hints = this.shuffle(hints);
		this.answers = [pokemon.name];
	}

	updateHint(): void {
		this.mysteryRound++;
		if (this.roundGuesses) this.roundGuesses.clear();
		const pastHints = this.hints.slice(0, this.mysteryRound);
		this.hint = (pastHints.length ? pastHints.join("<br />") + "<br />" : "") + (this.hints[this.mysteryRound] ?
			"<i>" + this.hints[this.mysteryRound] + "</i>" : "");
	}

	onHintHtml(): void {
		if (!this.hints[this.mysteryRound]) {
			const text = "All hints have been revealed! " + this.getAnswers('');
			this.on(text, () => {
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		} else {
			this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}
}

export const game: IGameFile<PikachusMysteryPokemon> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["pikachus", "mysterypokemon", "pmp", "wtp"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	class: PikachusMysteryPokemon,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given hints (one guess per hint)!",
	formerNames: ["Who's That Pokemon"],
	freejoin: true,
	name: "Pikachu's Mystery Pokemon",
	mascot: "Pikachu",
	minigameCommand: "mysterypokemon",
	minigameCommandAliases: ["mpokemon"],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon as hints are revealed!",
	modes: ['group'],
	variants: [
		{
			name: "Pikachu's Mystery Pokemon Unlimited",
			description: "Players guess Pokemon based on the given hints (unlimited guesses)!",
			variantAliases: ["unlimited", "unlimited guess", "unlimited guesses"],
			roundGuesses: undefined,
		},
	],
});
