import type { HexCode } from "../../types/tools";
import type { HueVariation, Lightness } from "./color-picker";
import { PokemonPickerManual } from "./pokemon-picker-manual";
import type { IHostDisplayProps } from "./host-display-base";
import { HostDisplayBase } from "./host-display-base";
import type { PokemonChoices, TrainerChoices } from "../game-host-control-panel";
import type { IPokemonTextInputProps } from "./pokemon-text-input";
import { PokemonTextInput } from "./pokemon-text-input";

const pokemonInputCommand = 'pokemoninput';

export class ManualHostDisplay extends HostDisplayBase {
	componentId: string = 'manual-host-display';
	submitPokemonErrors: string[] = [];

	gifPokemonTextInput: PokemonTextInput;
	iconPokemonTextInput: PokemonTextInput;

	gifPokemonPickers!: PokemonPickerManual[];
	iconPokemonPickers!: PokemonPickerManual[];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps) {
		super(parentCommandPrefix, componentCommand, props, PokemonPickerManual);

		const pokemonTextInputProps: IPokemonTextInputProps = {
			minPokemon: 1,
			placeholder: "Enter all Pokemon",
			clearText: "Clear all",
			submitText: "Update all",
			onClear: () => this.clearPokemonInput(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.submitPokemonInput(output),
			reRender: () => this.props.reRender(),
		};

		this.gifPokemonTextInput = new PokemonTextInput(this.commandPrefix, pokemonInputCommand,
			Object.assign({}, pokemonTextInputProps, {maxPokemon: props.maxGifs}));
		this.gifPokemonTextInput.active = false;

		this.iconPokemonTextInput = new PokemonTextInput(this.commandPrefix, pokemonInputCommand,
			Object.assign({}, pokemonTextInputProps, {maxPokemon: props.maxIcons}));
		this.iconPokemonTextInput.active = false;

		this.components.push(this.gifPokemonTextInput, this.iconPokemonTextInput);
	}

	togglePokemonPicker(active: boolean): void {
		if (this.gifOrIcon === 'gif') {
			this.gifPokemonTextInput.active = active;
		} else {
			this.iconPokemonTextInput.active = active;
		}

		super.togglePokemonPicker(active);
	}

	onSetGifOrIcon(dontRender?: boolean): void {
		const gif = this.gifOrIcon === 'gif';
		this.gifPokemonTextInput.active = gif;
		this.iconPokemonTextInput.active = !gif;

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

	submitPokemonInput(output: PokemonChoices): void {
		this.props.randomizePokemon(output);
	}

	setRandomizedBackgroundColor(hueVariation: HueVariation, lightness: Lightness, color: HexCode): void {
		this.backgroundColorPicker.setRandomizedColor(hueVariation, lightness, color);
	}

	setRandomizedPokemon(pokemon: PokemonChoices): void {
		for (const pokemonPicker of this.gifPokemonPickers) {
			pokemonPicker.reset();
		}

		for (const pokemonPicker of this.iconPokemonPickers) {
			pokemonPicker.reset();
		}

		this.currentPokemon = [];

		const names: string[] = [];
		for (let i = 0; i < pokemon.length; i++) {
			names.push((pokemon[i]!.shiny ? "shiny " : "") + pokemon[i]!.pokemon);
			if (this.gifPokemonPickers[i]) this.gifPokemonPickers[i].setRandomizedPokemon(pokemon[i]!);
			if (this.iconPokemonPickers[i]) this.iconPokemonPickers[i].setRandomizedPokemon(pokemon[i]!);
		}

		const textInput = names.join(", ");
		this.gifPokemonTextInput.parentSetInput(textInput);
		this.iconPokemonTextInput.parentSetInput(textInput);

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

	setRandomizedTrainers(trainers: TrainerChoices): void {
		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.reset();
		}

		this.currentTrainers = [];

		for (let i = 0; i < trainers.length; i++) {
			this.trainerPickers[i].setRandomizedTrainer(trainers[i]!);
		}
	}

	render(): string {
		let html = "";

		html += Client.getPmSelfButton(this.commandPrefix + ", " + this.chooseBackgroundColorPickerCommand, "Choose background",
			this.currentPicker === 'background');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.choosePokemonPickerCommand, "Choose Pokemon",
			this.currentPicker === 'pokemon');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.chooseTrainerPickerCommand, "Choose trainer",
			this.currentPicker === 'trainer');
		html += "<br /><br />";

		if (this.currentPicker === 'background') {
			html += this.renderBackgroundPicker();
		} else if (this.currentPicker === 'pokemon') {
			const gif = this.gifOrIcon === 'gif';
			html += "GIFs or icons: ";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setGif, "GIFs", gif);
			html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setIcon, "Icons", !gif);

			html += "<br /><br /><b>All Pokemon</b> (up to " + (gif ? this.props.maxGifs : this.props.maxIcons) + "):<br />";

			if (gif) {
				html += "Include <code>shiny</code> before or after a Pokemon's name for its shiny GIF!<br />";
			}

			html += "<br />";

			if (gif) {
				html += this.gifPokemonTextInput.render();
			} else {
				html += this.iconPokemonTextInput.render();
			}

			html += "<hr />";
			html += "<b>Individual Pokemon</b>:";

			const currentIndex = this.pokemonPickerIndex + 1;
			if (gif) {
				for (let i = 1; i <= this.props.maxGifs; i++) {
					if (i > 1) html += "&nbsp;";
					html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i, "" + i,
						currentIndex === i);
				}

				html += "<br /><br />";
				html += this.gifPokemonPickers[this.pokemonPickerIndex].render();
			} else {
				for (let i = 1; i <= this.props.maxIcons; i++) {
					if (i > 1) html += "&nbsp;";
					html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i, "" + i,
						currentIndex === i);
				}

				html += "<br /><br />";
				html += this.iconPokemonPickers[this.pokemonPickerIndex].render();
			}
		} else {
			html += "Trainers:";
			const currentIndex = this.trainerPickerIndex + 1;
			for (let i = 1; i <= this.props.maxTrainers; i++) {
				if (i > 1) html += "&nbsp;";
				html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", " + i, "" + i,
					currentIndex === i);
			}

			html += "<br /><br />";
			html += this.trainerPickers[this.trainerPickerIndex].render();
		}

		return html;
	}
}
