import { PokemonPickerManual } from "./pokemon-picker-manual";
import type { IPokemonTextInputProps } from "./pokemon-text-input";
import { PokemonTextInput } from "./pokemon-text-input";
import type { IPokemonPick, IPokemonPickerProps, PokemonChoices } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import type { ModelGeneration } from "../../types/dex";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { HtmlPageBase } from "../html-page-base";

export interface IPokemonModelPickerProps extends IComponentProps {
	maxPokemon: number;
	clearAllPokemon: () => void;
	submitAllPokemon: (pokemon: PokemonChoices) => void;
	clearPokemon: (index: number, dontRender: boolean | undefined) => void;
	selectPokemon: (index: number, pokemon: IPokemonPick, dontRender: boolean | undefined) => void;
	reRender: () => void;
}

const setGenerationCommand = 'setgeneration';
const setPokemonPickerIndexCommand = 'setpokemonpickerindex';
const setPokemonCommand = 'setpokemon';
const pokemonInputCommand = 'pokemoninput';

const modelGenerations = Dex.getModelGenerations();

export class PokemonModelPicker extends ComponentBase<IPokemonModelPickerProps> {
	componentId: string = 'multi-pokemon-pokemon';

	pokemonPickerIndex: number = 0;
	currentPokemon: PokemonChoices = [];
	currentModelGeneration: ModelGeneration = Dex.getModelGenerationName(Dex.getGen());
	pokemonPickers: PokemonPickerManual[] = [];

	maxPickerIndex: number;

	allPokemonTextInputGens!: KeyedDict<ModelGeneration, PokemonTextInput>;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPokemonModelPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		const pokemonTextInputProps: IPokemonTextInputProps = {
			gif: true,
			pokemonList: [],
			inputWidth: Tools.minRoomWidth,
			maxPokemon: props.maxPokemon,
			minPokemon: 1,
			name: "Pokemon",
			placeholder: "Enter all Pokemon",
			clearText: "Clear all",
			submitText: "Update all",
			onClear: () => this.clearAllPokemonInput(),
			onSubmit: (output) => this.submitAllPokemonInput(output),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		};

		const allPokemonTextInputGens: Dict<PokemonTextInput> = {};
		for (const generation of Dex.getModelGenerations()) {
			allPokemonTextInputGens[generation] = new PokemonTextInput(htmlPage, this.commandPrefix, pokemonInputCommand,
				Object.assign({}, pokemonTextInputProps, {
					modelGeneration: generation,
					pokemonList: PokemonPickerBase.pokemonGifsGens[generation],
				}
			));

			allPokemonTextInputGens[generation].active = generation === this.currentModelGeneration;

			this.components.push(allPokemonTextInputGens[generation]);
		}

		this.allPokemonTextInputGens = allPokemonTextInputGens as KeyedDict<ModelGeneration, PokemonTextInput>;

		const pokemonPickerProps: IPokemonPickerProps = {
			gif: true,
			onPickLetter: (index, letter, dontRender) => this.pickPokemonLetter(dontRender),
			onPickGeneration: (index, generation, dontRender) => this.pickPokemonGeneration(index, generation, dontRender),
			onPickShininess: (index, shininess, dontRender) => this.pickPokemonShininess(index, shininess, dontRender),
			onClearType: (index, dontRender) => this.clearPokemonType(dontRender),
			onPickType: (index, type, dontRender) => this.pickPokemonType(dontRender),
			onClear: (index, dontRender) => this.clearPokemon(index, dontRender),
			onPick: (index, pokemon, dontRender) =>
				this.selectPokemon(index, pokemon, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		};

		this.maxPickerIndex = props.maxPokemon - 1;
		for (let i = 0; i < props.maxPokemon; i++) {
			const pokemonPicker = new PokemonPickerManual(htmlPage, this.commandPrefix, setPokemonCommand,
				Object.assign({}, pokemonPickerProps, {
					gif: true,
					pickerIndex: i,
				})
			);
			pokemonPicker.active = i === 0;

			this.pokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}
	}

	clearAllPokemonInput(): void {
		for (const pokemonPicker of this.pokemonPickers) {
			pokemonPicker.reset();
		}

		this.currentPokemon = [];

		this.props.clearAllPokemon();
	}

	parentSubmitAllPokemonInput(pokemon: PokemonChoices): void {
		this.submitAllPokemonInput(pokemon, true);

		this.updateAllPokemonTextInput();
	}

	submitAllPokemonInput(pokemon: PokemonChoices, dontRender?: boolean): void {
		for (const pokemonPicker of this.pokemonPickers) {
			pokemonPicker.reset();
		}

		this.currentPokemon = [];

		for (let i = 0; i < pokemon.length; i++) {
			this.pokemonPickers[i].setPokemonAttributes(pokemon[i]!);
		}

		const lastIndex = pokemon.length - 1;
		if (this.pokemonPickerIndex > lastIndex) {
			this.pokemonPickers[this.pokemonPickerIndex].active = false;
			this.pokemonPickers[lastIndex].active = true;
			this.pokemonPickerIndex = lastIndex;
		}

		if (!dontRender) this.props.submitAllPokemon(pokemon);
	}

	pickPokemonLetter(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickPokemonGeneration(index: number, generation: ModelGeneration, dontRender?: boolean): void {
		if (this.currentPokemon[index]) {
			this.selectPokemon(index, Object.assign(this.currentPokemon[index], {generation}), dontRender);
		} else {
			if (!dontRender) this.props.reRender();
		}
	}

	pickPokemonShininess(index: number, shininess: boolean, dontRender?: boolean): void {
		if (this.currentPokemon[index]) {
			this.selectPokemon(index, Object.assign(this.currentPokemon[index], {shiny: shininess}), dontRender);
		} else {
			if (!dontRender) this.props.reRender();
		}
	}

	selectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		this.currentPokemon[index] = pokemon;

		if (!dontRender) this.updateAllPokemonTextInput();

		this.props.selectPokemon(index, pokemon, dontRender);
	}

	clearPokemonType(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickPokemonType(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearPokemon(index: number, dontRender?: boolean): void {
		this.currentPokemon[index] = undefined;

		this.props.clearPokemon(index, dontRender);
	}

	onSelectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		if (dontRender) return;

		this.updateAllPokemonTextInput();
	}

	updateAllPokemonTextInput(): void {
		const inputs: string[] = [];

		for (const pokemonPicker of this.pokemonPickers) {
			const pokemonInput = pokemonPicker.getPokemonInput();
			if (pokemonInput) inputs.push(pokemonInput);
		}

		this.allPokemonTextInputGens[this.currentModelGeneration].onSubmit(inputs.join(', '));
	}

	setPokemonPickerIndex(index: number): boolean {
		if (this.pokemonPickerIndex === index) return true;

		if (index > this.maxPickerIndex) return false;

		const previousPickerIndex = this.pokemonPickerIndex;
		this.pokemonPickerIndex = index;

		this.pokemonPickers[previousPickerIndex].active = false;
		this.pokemonPickers[this.pokemonPickerIndex].active = true;

		this.props.reRender();
		return true;
	}

	setAllModelGenerations(modelGeneration: ModelGeneration): void {
		if (this.currentModelGeneration === modelGeneration) return;

		const previousGeneration = this.currentModelGeneration;
		this.currentModelGeneration = modelGeneration;

		this.allPokemonTextInputGens[previousGeneration].active = false;
		this.allPokemonTextInputGens[this.currentModelGeneration].active = true;

		for (const pokemonPicker of this.pokemonPickers) {
			pokemonPicker.tryParentPickGeneration(this.currentModelGeneration);
		}

		this.updateAllPokemonTextInput();

		this.props.reRender();
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === setPokemonPickerIndexCommand) {
			const index = parseInt(targets[0].trim());
			if (isNaN(index) || index < 1) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}

			if (!this.setPokemonPickerIndex(index - 1)) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}
		} else if (cmd === setGenerationCommand) {
			const gen = targets[0].trim() as ModelGeneration | '';
			if (!modelGenerations.includes(gen as ModelGeneration)) {
				return "'" + targets[0].trim() + "' is not a valid model generation.";
			}

			this.setAllModelGenerations(gen as ModelGeneration);
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		let html = "Model generations:";
		for (const generation of Dex.getModelGenerations()) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setGenerationCommand + "," + generation,
				generation.toUpperCase(), {selectedAndDisabled: this.currentModelGeneration === generation});
		}

		html += "<br /><br />";
		html += "Add <code>shiny</code> and/or a generation like <code>BW</code> before a Pokemon name for more customization!";
		html += "<br /><br />";

		html += "<b>Set all Pokemon</b> (up to " + this.props.maxPokemon + "):";
		html += "<br /><br />";

		html += this.allPokemonTextInputGens[this.currentModelGeneration].render();

		html += "<hr />";
		html += "<b>Set individual Pokemon</b>:";

		const currentIndex = this.pokemonPickerIndex + 1;
		for (let i = 1; i <= this.props.maxPokemon; i++) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setPokemonPickerIndexCommand + ", " + i,
				"" + i, {selectedAndDisabled: currentIndex === i});
		}

		html += "<br /><br />";
		html += this.pokemonPickers[this.pokemonPickerIndex].render();

		return html;
	}
}
