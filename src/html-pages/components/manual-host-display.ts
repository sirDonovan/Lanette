import type { HexCode } from "../../types/tools";
import type { HueVariation, Lightness } from "./color-picker";
import { PokemonPickerManual } from "./pokemon-picker-manual";
import type { IHostDisplayProps } from "./host-display-base";
import { HostDisplayBase } from "./host-display-base";
import type { PokemonChoices, TrainerChoices } from "../game-host-control-panel";
import type { IPokemonTextInputProps } from "./pokemon-text-input";
import { PokemonTextInput } from "./pokemon-text-input";
import type { IPokemonPick } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import type { ModelGeneration } from "../../types/dex";
import type { HtmlPageBase } from "../html-page-base";

const pokemonInputCommand = 'pokemoninput';

export class ManualHostDisplay extends HostDisplayBase {
	componentId: string = 'manual-host-display';

	allPokemonTextInputGifGens!: KeyedDict<ModelGeneration, PokemonTextInput>;
	allPokemonTextInputIconGens!: KeyedDict<ModelGeneration, PokemonTextInput>;
	declare gifPokemonPickers: PokemonPickerManual[];
	declare iconPokemonPickers: PokemonPickerManual[];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props, PokemonPickerManual);

		const pokemonTextInputProps: IPokemonTextInputProps = {
			gif: false,
			pokemonList: [],
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			placeholder: "Enter all Pokemon",
			clearText: "Clear all",
			submitText: "Update all",
			onClear: () => this.clearPokemonInput(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.submitAllPokemonInput(output),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		};

		const allPokemonTextInputGifGens: Dict<PokemonTextInput> = {};
		const allPokemonTextInputIconGens: Dict<PokemonTextInput> = {};
		for (const generation of Dex.getModelGenerations()) {
			allPokemonTextInputGifGens[generation] = new PokemonTextInput(htmlPage, this.commandPrefix, pokemonInputCommand,
				Object.assign({}, pokemonTextInputProps, {
					gif: true,
					pokemonList: PokemonPickerBase.pokemonGifsGens[generation],
					maxPokemon: props.maxGifs,
				}));
			allPokemonTextInputGifGens[generation].active = false;

			allPokemonTextInputIconGens[generation] = new PokemonTextInput(htmlPage, this.commandPrefix, pokemonInputCommand,
				Object.assign({}, pokemonTextInputProps, {
					maxPokemon: props.maxIcons,
					pokemonList: PokemonPickerBase.pokemonGens[generation],
				}));
			allPokemonTextInputIconGens[generation].active = false;

			this.components.push(allPokemonTextInputGifGens[generation], allPokemonTextInputIconGens[generation]);
		}

		this.allPokemonTextInputGifGens = allPokemonTextInputGifGens as KeyedDict<ModelGeneration, PokemonTextInput>;
		this.allPokemonTextInputIconGens = allPokemonTextInputIconGens as KeyedDict<ModelGeneration, PokemonTextInput>;
	}

	togglePokemonPicker(active: boolean): void {
		if (this.gifOrIcon === 'gif') {
			this.allPokemonTextInputGifGens[this.currentModelGeneration].active = active;
		} else {
			this.allPokemonTextInputIconGens[this.currentModelGeneration].active = active;
		}

		super.togglePokemonPicker(active);
	}

	onSetGifOrIcon(dontRender?: boolean): void {
		const gif = this.gifOrIcon === 'gif';
		this.allPokemonTextInputGifGens[this.currentModelGeneration].active = gif;
		this.allPokemonTextInputIconGens[this.currentModelGeneration].active = !gif;

		super.onSetGifOrIcon(dontRender);
	}

	clearPokemonInput(): void {
		for (const pokemonPicker of this.gifPokemonPickers) {
			pokemonPicker.reset();
		}

		for (const pokemonPicker of this.iconPokemonPickers) {
			pokemonPicker.reset();
		}

		this.currentPokemon = [];

		this.props.reRender();
	}

	submitAllPokemonInput(output: PokemonChoices): void {
		this.props.randomizePokemon(output);
	}

	onSelectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		if (dontRender) return;

		this.updateAllPokemonTextInput();
	}

	updateAllPokemonTextInput(): void {
		const inputs: string[] = [];
		let pokemonPickers: PokemonPickerManual[];
		if (this.gifOrIcon === 'gif') {
			pokemonPickers = this.gifPokemonPickers;
		} else {
			pokemonPickers = this.iconPokemonPickers;
		}

		for (const pokemonPicker of pokemonPickers) {
			const pokemonInput = pokemonPicker.getPokemonInput();
			if (pokemonInput) inputs.push(pokemonInput);
		}

		const allInput = inputs.join(', ');

		this.allPokemonTextInputGifGens[this.currentModelGeneration].onSubmit(inputs.length > 6 ? inputs.slice(0, 6).join(', ') : allInput);
		this.allPokemonTextInputIconGens[this.currentModelGeneration].onSubmit(allInput);
	}

	setRandomizedBackgroundColor(hueVariation: HueVariation, lightness: Lightness, color: HexCode): void {
		this.backgroundColorPicker.setRandomizedColor(hueVariation, lightness, color);
	}

	loadHostDisplayPokemon(pokemon: PokemonChoices): void {
		for (const pokemonPicker of this.gifPokemonPickers) {
			pokemonPicker.reset();
		}

		for (const pokemonPicker of this.iconPokemonPickers) {
			pokemonPicker.reset();
		}

		this.currentPokemon = [];

		const names: string[] = [];
		for (let i = 0; i < pokemon.length; i++) {
			names.push((pokemon[i]!.shiny ? "Shiny " : "") + (pokemon[i]!.generation !== 'xy' ?
				pokemon[i]!.generation.toUpperCase() + " " : "") + pokemon[i]!.pokemon);
			if (this.gifPokemonPickers[i]) this.gifPokemonPickers[i].setPokemonAttributes(pokemon[i]!);
			if (this.iconPokemonPickers[i]) this.iconPokemonPickers[i].setPokemonAttributes(pokemon[i]!);
		}

		const textInput = names.join(", ");
		this.allPokemonTextInputGifGens[this.currentModelGeneration].parentSetInput(textInput);
		this.allPokemonTextInputIconGens[this.currentModelGeneration].parentSetInput(textInput);

		const index = pokemon.length - 1;
		if (this.pokemonPickerIndex > index) {
			if (this.gifOrIcon === 'gif') {
				this.gifPokemonPickers[this.pokemonPickerIndex].active = false;
				this.gifPokemonPickers[index].active = true;
			} else {
				this.iconPokemonPickers[this.pokemonPickerIndex].active = false;
				this.iconPokemonPickers[index].active = true;
			}
			this.pokemonPickerIndex = index;
		}
	}

	loadHostDisplayTrainers(trainers: TrainerChoices): void {
		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.reset();
		}

		this.currentTrainers = [];

		for (let i = 0; i < trainers.length; i++) {
			this.trainerPickers[i].setRandomizedTrainer(trainers[i]!);
		}
	}

	onSetAllModelGenerations(previousGeneration: ModelGeneration): void {
		if (this.gifOrIcon === 'gif') {
			this.allPokemonTextInputGifGens[previousGeneration].active = false;
			this.allPokemonTextInputGifGens[this.currentModelGeneration].active = true;
		} else {
			this.allPokemonTextInputIconGens[previousGeneration].active = false;
			this.allPokemonTextInputIconGens[this.currentModelGeneration].active = true;
		}

		for (const gifPokemonPicker of this.gifPokemonPickers) {
			gifPokemonPicker.tryParentPickGeneration(this.currentModelGeneration);
		}

		this.updateAllPokemonTextInput();
	}

	render(): string {
		let html = "";

		const background = this.currentPicker === 'background';
		const pokemon = this.currentPicker === 'pokemon';
		const trainer = this.currentPicker === 'trainer';
		const border = this.currentPicker === 'background-border';

		html += this.getQuietPmButton(this.commandPrefix + ", " + this.chooseBackgroundColorPickerCommand, "Choose background",
			{selectedAndDisabled: background});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.chooseBackgroundBorderPickerCommand, "Background border",
			{selectedAndDisabled: border});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.choosePokemonPickerCommand, "Choose Pokemon",
			{selectedAndDisabled: pokemon});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.chooseTrainerPickerCommand, "Choose trainer",
			{selectedAndDisabled: trainer});
		html += "<hr />";

		if (background) {
			html += this.renderBackgroundPicker();
		} else if (border) {
			html += this.renderBackgroundBorderPicker();
		} else if (pokemon) {
			const gif = this.gifOrIcon === 'gif';
			html += "GIFs or icons: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setGif, "GIFs",
				{selectedAndDisabled: gif});
			html += this.getQuietPmButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setIcon, "Icons",
				{selectedAndDisabled: !gif});
			html += "<br /><br />";
			if (gif) {
				html += this.renderAllModelGenerations();
				html += "<br /><br />";
				html += "Add <code>shiny</code> and/or a generation like <code>BW</code> before a Pokemon name for more customization!";
				html += "<br /><br />";
			}

			html += "<b>Set all Pokemon</b> (up to " + (gif ? this.props.maxGifs : this.props.maxIcons) + "):";
			html += "<br /><br />";

			if (gif) {
				html += this.allPokemonTextInputGifGens[this.currentModelGeneration].render();
			} else {
				html += this.allPokemonTextInputIconGens[this.currentModelGeneration].render();
			}

			html += "<hr />";
			html += "<b>Set individual Pokemon</b>:";

			const currentIndex = this.pokemonPickerIndex + 1;
			if (gif) {
				for (let i = 1; i <= this.props.maxGifs; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, {selectedAndDisabled: currentIndex === i});
				}

				html += "<br /><br />";
				html += this.gifPokemonPickers[this.pokemonPickerIndex].render();
			} else {
				for (let i = 1; i <= this.props.maxIcons; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, {selectedAndDisabled: currentIndex === i});
				}

				html += "<br /><br />";
				html += this.iconPokemonPickers[this.pokemonPickerIndex].render();
			}
		} else {
			html += "Trainers:";
			const currentIndex = this.trainerPickerIndex + 1;
			for (let i = 1; i <= this.props.maxTrainers; i++) {
				if (i > 1) html += "&nbsp;";
				html += this.getQuietPmButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", " + i, "" + i,
					{selectedAndDisabled: currentIndex === i});
			}

			html += "<br /><br />";
			html += this.trainerPickers[this.trainerPickerIndex].render();
		}

		return html;
	}
}
