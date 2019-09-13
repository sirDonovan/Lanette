import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commands as templateCommands, Guessing } from './templates/guessing';

const name = "Kirlia's Tracing Show";
const data: {abilities: Dict<string>, pokedex: string[]} = {
	abilities: {},
	pokedex: [],
};
let loadedData = false;

class KirliasTracingShow extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Dex.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			const abilities: string[] = [];
			for (const ability in pokedex[i].abilities) {
				// @ts-ignore
				abilities.push(pokedex[i].abilities[ability]);
			}
			data.abilities[pokedex[i].id] = abilities.join(",");
			data.pokedex.push(pokedex[i].id);
		}
		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];
	lastAbilities: string = '';
	lastPokemon: string = '';

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	async setAnswers() {
		let pokemon = this.sampleOne(data.pokedex);
		let abilities = data.abilities[pokemon];
		while (pokemon === this.lastPokemon || abilities === this.lastAbilities) {
			pokemon = this.sampleOne(data.pokedex);
			abilities = data.abilities[pokemon];
		}
		this.lastPokemon = pokemon;
		this.lastAbilities = abilities;
		this.answers = abilities.split(',');
		this.hint = "Kirlia traced **" + Dex.getExistingPokemon(pokemon).species + "**!";
	}
}

const commands = Tools.deepClone(templateCommands);
commands.guess.aliases!.push('trace');

export const game: IGameFile<KirliasTracingShow> = {
	aliases: ['kirlias', 'kts'],
	class: KirliasTracingShow,
	commandDescriptions: [Config.commandCharacter + "trace [ability]"],
	commands,
	description: "Players guess abilities that the chosen Pokemon have!",
	freejoin: true,
	name,
	mascot: "Kirlia",
};
