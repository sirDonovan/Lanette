import type { HexCode } from "../../types/tools";
import type { HueVariation, Lightness } from "./color-picker";
import { PokemonPickerLetter } from "./pokemon-picker-letter";
import type { IHostDislayProps } from "./host-display-base";
import { HostDisplayBase } from "./host-display-base";
import type { PokemonChoices, TrainerChoices } from "../game-host-control-panel";

export class CustomHostDisplay extends HostDisplayBase {
	displayName: string = 'custom-display';

	gifPokemonPickers!: PokemonPickerLetter[];
	iconPokemonPickers!: PokemonPickerLetter[];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IHostDislayProps) {
		super(parentCommandPrefix, componentCommand, props, PokemonPickerLetter);
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
		for (let i = 0; i < pokemon.length; i++) {
			if (this.gifPokemonPickers[i]) this.gifPokemonPickers[i].setRandomizedPokemon(pokemon[i]!.pokemon);
			this.iconPokemonPickers[i].setRandomizedPokemon(pokemon[i]!.pokemon);
		}

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
			html += "GIFs or icons: ";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setGif, "GIFs",
				this.gifOrIcon === 'gif');
			html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setIcon, "Icons",
				this.gifOrIcon === 'icon');

			html += "<br />";
			html += "Pokemon:";

			const currentIndex = this.pokemonPickerIndex + 1;
			if (this.gifOrIcon === 'gif') {
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
