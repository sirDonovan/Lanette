import type { PokemonChoices } from "../game-host-control-panel";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

const shinyOption = "shiny";

export interface IPokemonTextInputProps extends ITextInputProps<PokemonChoices> {
	maxPokemon?: number;
	minPokemon?: number;
}

export class PokemonTextInput extends TextInput<PokemonChoices> {
	componentId: string = 'pokemon-text-input';

	props!: IPokemonTextInputProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonTextInputProps) {
		super(parentCommandPrefix, componentCommand, props);
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const pokemonChoices: PokemonChoices = [];

		for (const target of targets) {
			let id = Tools.toId(target);
			if (!id) continue;

			let shiny = false;
			let pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				if (id.startsWith(shinyOption)) {
					shiny = true;
					id = id.substr(shinyOption.length);
				} else if (id.endsWith(shinyOption)) {
					shiny = true;
					id = id.substr(0, id.length - shinyOption.length);
				}

				if (shiny) pokemon = Dex.getPokemon(id);

				if (!pokemon) {
					this.errors.push(CommandParser.getErrorText(['invalidPokemon', id]));
					continue;
				}
			}

			pokemonChoices.push({pokemon: pokemon.name, shiny});
		}

		const inputAmount = pokemonChoices.length;
		if (!inputAmount || (this.props.minPokemon && inputAmount < this.props.minPokemon)) {
			this.errors.push("You must specify at least " + (this.props.minPokemon || 1) + " Pokemon.");
		}

		if (this.props.maxPokemon && inputAmount > this.props.maxPokemon) {
			this.errors.push("You may only specify " + this.props.maxPokemon + " Pokemon.");
		}

		this.currentOutput = pokemonChoices;
	}
}