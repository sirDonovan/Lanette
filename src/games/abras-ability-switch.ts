import { ICommandDefinition } from "../command-parser";
import { DefaultGameOptions } from "../room-game";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";
import { commands as templateCommands, Guessing } from './templates/guessing';

class AbrasAbilitySwitch extends Guessing {
	defaultOptions: DefaultGameOptions[] = ['points'];
	lastAbility: string = '';
	lastPokemon: string = '';
	pokedex: IPokemon[] = Dex.getPokemonList();

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	setAnswers() {
		let pokemon = Tools.sampleOne(this.pokedex);
		while (pokemon.species === this.lastPokemon) {
			pokemon = Tools.sampleOne(this.pokedex);
		}
		this.lastPokemon = pokemon.species;

		let abilities: string[] = [];
		for (const i in pokemon.abilities) {
			// @ts-ignore
			abilities.push(pokemon.abilities[i]);
		}
		abilities = Tools.shuffle(abilities);

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

const commands: Dict<ICommandDefinition<AbrasAbilitySwitch>> = {
	switch: {
		command: templateCommands.guess.command,
	},
};

export const game: IGameFile<AbrasAbilitySwitch> = {
	aliases: ['aas', 'abras'],
	battleFrontierCategory: 'Knowledge',
	class: AbrasAbilitySwitch,
	commandDescriptions: [Config.commandCharacter + "switch [Pokemon]"],
	commands: Object.assign({}, templateCommands, commands),
	description: "Players switch to Pokemon that have the chosen abilities for Abra to Role Play!",
	freejoin: true,
	name: "Abra's Ability Switch",
	mascot: "Abra",
	modes: ["survival"],
};
