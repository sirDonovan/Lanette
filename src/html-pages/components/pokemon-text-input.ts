import type { ModelGeneration } from "../../types/dex";
import type { PokemonChoices } from "../game-host-control-panel";
import type { HtmlPageBase } from "../html-page-base";
import type { ITextInputProps } from "./text-input";
import { TextInput } from "./text-input";

const rbOption = "rb";
const gsOption = "gs";
const rsOption = "rs";
const dpOption = "dp";
const bwOption = "bw";
const xyOption = "xy";
const shinyOption = "shiny";

export interface IPokemonTextInputProps extends ITextInputProps<PokemonChoices> {
	gif: boolean;
	pokemonList: string[];
	maxPokemon?: number;
	minPokemon?: number;
	modelGeneration?: ModelGeneration;
}

export class PokemonTextInput extends TextInput<PokemonChoices> {
	componentId: string = 'pokemon-text-input';

	shiny: boolean = false;

	modelGeneration: ModelGeneration;

	declare props: IPokemonTextInputProps;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPokemonTextInputProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.modelGeneration = props.modelGeneration || 'xy';
	}

	setModelGeneration(modelGeneration: ModelGeneration): void {
		this.modelGeneration = modelGeneration;
	}

	setShiny(shiny: boolean): void {
		this.shiny = shiny;
	}

	onSubmit(input: string): void {
		const targets = input.split(',');
		const pokemonChoices: PokemonChoices = [];

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i].trim();
			let id = Tools.toId(target);
			if (!id) continue;

			let modelGeneration: ModelGeneration | undefined;
			let shiny: boolean | undefined;
			let pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				const parts = target.split(" ");
				const first = Tools.toId(parts[0]);
				const second = Tools.toId(parts[1]);
				if (first === shinyOption) {
					shiny = true;
					if (second === rbOption) {
						modelGeneration = 'rb';
					} else if (second === gsOption) {
						modelGeneration = 'gs';
					} else if (second === rsOption) {
						modelGeneration = 'rs';
					} else if (second === dpOption) {
						modelGeneration = 'dp';
					} else if (second === bwOption) {
						modelGeneration = 'bw';
					} else if (second === xyOption) {
						modelGeneration = 'xy';
					}

					if (modelGeneration) {
						id = Tools.toId(parts.slice(2).join(" "));
					} else {
						id = Tools.toId(parts.slice(1).join(" "));
					}
				} else {
					if (first === rbOption) {
						modelGeneration = 'rb';
					} else if (first === gsOption) {
						modelGeneration = 'gs';
					} else if (first === rsOption) {
						modelGeneration = 'rs';
					} else if (first === dpOption) {
						modelGeneration = 'dp';
					} else if (first === bwOption) {
						modelGeneration = 'bw';
					}

					if (modelGeneration) {
						if (second === shinyOption) shiny = true;
						if (shiny) {
							id = Tools.toId(parts.slice(2).join(" "));
						} else {
							id = Tools.toId(parts.slice(1).join(" "));
						}
					}
				}

				pokemon = Dex.getPokemon(id);

				if (!pokemon) {
					this.errors.push(CommandParser.getErrorText(['invalidPokemon', id]));
					continue;
				}
			}

			if (!modelGeneration) modelGeneration = this.modelGeneration;
			const modelGenerationName = modelGeneration !== 'xy' ? modelGeneration.toUpperCase() : "";

			if (this.props.gif && !Dex.hasModelData(pokemon, modelGeneration)) {
				this.errors.push(pokemon.name + " does not have a " + (modelGenerationName ? modelGenerationName + " " : "") + "model.");
				continue;
			}

			if (!this.props.pokemonList.includes(pokemon.name)) {
				this.errors.push(pokemon.name + " cannot be used.");
				continue;
			}

			if (!shiny && this.shiny) shiny = this.shiny;

			targets[i] = (shiny ? "Shiny " : "") + (modelGenerationName ? modelGenerationName + " " : "") + pokemon.name;

			pokemonChoices.push({generation: modelGeneration, pokemon: pokemon.name, shiny});
		}

		const inputAmount = pokemonChoices.length;
		if (!inputAmount || (this.props.minPokemon && inputAmount < this.props.minPokemon)) {
			this.errors.push("You must specify at least " + (this.props.minPokemon || 1) + " valid Pokemon.");
		}

		if (this.props.maxPokemon && inputAmount > this.props.maxPokemon) {
			this.errors.push("You may only specify " + this.props.maxPokemon + " Pokemon.");
		}

		this.currentInput = targets.join(', ');
		this.currentOutput = pokemonChoices;
	}
}