import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commands as templateCommands, Guessing } from './templates/guessing';

const name = "Kirlia's Tracing Show";
const keys: string[] = [];
let loadedData = false;

class KirliasTracingShow extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Dex.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			keys.push(pokedex[i].species);
		}
		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];
	lastAbilities: string = '';
	lastSpecies: string = '';

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	setAnswers() {
		let species = '';
		let abilitiesText = '';
		let abilities: string[] = [];
		while (!abilitiesText || abilitiesText === this.lastAbilities) {
			while (!species || species === this.lastSpecies) {
				species = Tools.sampleOne(keys);
			}

			const pokemon = Dex.getExistingPokemon(species);
			abilities = [];
			for (const i in pokemon.abilities) {
				// @ts-ignore
				abilities.push(pokemon.abilities[i]);
			}
			abilitiesText = abilities.join(",");
		}
		this.lastSpecies = species;
		this.lastAbilities = abilitiesText;
		this.answers = abilities;
		this.hint = "Kirlia traced **" + species + "**!";
	}
}

const commands = Tools.deepClone(templateCommands);
commands.guess.aliases!.push('trace');

export const game: IGameFile<KirliasTracingShow> = {
	aliases: ['kirlias', 'kts'],
	battleFrontierCategory: 'Knowledge',
	class: KirliasTracingShow,
	commandDescriptions: [Config.commandCharacter + "trace [ability]"],
	commands: Object.assign({}, templateCommands),
	description: "Players guess abilities that the chosen Pokemon have!",
	freejoin: true,
	name,
	mascot: "Kirlia",
};
