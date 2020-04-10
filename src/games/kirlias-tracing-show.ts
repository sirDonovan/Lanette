import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Kirlia's Tracing Show";
const data: {abilities: Dict<string>; pokedex: string[]} = {
	abilities: {},
	pokedex: [],
};
let loadedData = false;

class KirliasTracingShow extends Guessing {
	lastAbilities: string = '';
	lastPokemon: string = '';

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const abilities: string[] = [];
			for (const ability in pokemon.abilities) {
				// @ts-ignore
				abilities.push(pokemon.abilities[ability]);
			}
			data.abilities[pokemon.id] = abilities.join(",");
			data.pokedex.push(pokemon.id);
		}
		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		let pokemon = this.sampleOne(data.pokedex);
		let abilities = data.abilities[pokemon];
		while (pokemon === this.lastPokemon || abilities === this.lastAbilities) {
			pokemon = this.sampleOne(data.pokedex);
			abilities = data.abilities[pokemon];
		}
		this.lastPokemon = pokemon;
		this.lastAbilities = abilities;
		this.answers = abilities.split(',');
		this.hint = "<b>Kirlia traced</b>: <i>" + Dex.getExistingPokemon(pokemon).name + "</i>";
	}
}

const commands = Tools.deepClone(guessingGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('trace');

export const game: IGameFile<KirliasTracingShow> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['kirlias', 'kts'],
	category: 'knowledge',
	class: KirliasTracingShow,
	commandDescriptions: [Config.commandCharacter + "trace [ability]"],
	commands,
	defaultOptions: ['points'],
	description: "Players guess abilities that the chosen Pokemon have!",
	freejoin: true,
	name,
	mascot: "Kirlia",
	modes: ['survival', 'team'],
});
