import { ICommandDefinition } from "../command-parser";
import { DefaultGameOption } from "../room-game";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";
import { commands as templateCommands, Guessing } from './templates/guessing';

class AbrasAbilitySwitch extends Guessing {
	defaultOptions: DefaultGameOption[] = ['points'];
	lastAbility: string = '';
	lastPokemon: string = '';
	pokedex: IPokemon[] = Dex.getPokemonList();

	setAnswers() {
		let pokemon = this.sampleOne(this.pokedex);
		while (pokemon.species === this.lastPokemon) {
			pokemon = this.sampleOne(this.pokedex);
		}
		this.lastPokemon = pokemon.species;

		let abilities: string[] = [];
		for (const i in pokemon.abilities) {
			// @ts-ignore
			abilities.push(pokemon.abilities[i]);
		}
		abilities = this.shuffle(abilities);

		let ability = abilities[0];
		abilities.shift();
		while (ability === this.lastAbility) {
			if (!abilities.length) {
				this.setAnswers();
				return;
			}
			ability = abilities[0];
			abilities.shift();
		}
		this.lastAbility = ability;

		const answers: string[] = [];
		for (let i = 0; i < this.pokedex.length; i++) {
			const pokemon = this.pokedex[i];
			for (const i in pokemon.abilities) {
				// @ts-ignore
				if (pokemon.abilities[i] === ability) {
					answers.push(pokemon.species);
					break;
				}
			}
		}
		this.answers = answers;
		this.hint = "Abra wants the ability **" + ability + "**!";
	}
}

const commands = Tools.deepClone(templateCommands);
commands.guess.aliases!.push('switch');

export const game: IGameFile<AbrasAbilitySwitch> = {
	aliases: ['aas', 'abras'],
	battleFrontierCategory: 'Knowledge',
	class: AbrasAbilitySwitch,
	commandDescriptions: [Config.commandCharacter + "switch [Pokemon]"],
	commands,
	description: "Players switch to Pokemon that have the chosen abilities for Abra to Role Play!",
	freejoin: true,
	name: "Abra's Ability Switch",
	mascot: "Abra",
	modes: ["survival"],
};
