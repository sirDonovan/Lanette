import type { HexCode } from "../../types/tools";
import type { HueVariation, Lightness } from "./color-picker";
import { ColorPicker } from "./color-picker";
import type { PokemonPickerBase } from "./pokemon-picker-base";
import { TrainerPicker } from "./trainer-picker";
import { ComponentBase } from "./component-base";
import type { GifIcon, IPokemonChoice, ITrainerChoice, PokemonChoices, TrainerChoices } from "../game-host-control-panel";
import type { PokemonPickerLetter } from "./pokemon-picker-letter";
import type { PokemonPickerRandom } from "./pokemon-picker-random";

export interface IHostDislayProps {
	maxGifs: number;
	maxIcons: number;
	maxTrainers: number;
	random?: boolean;
	clearBackgroundColor: () => void;
	setBackgroundColor: (color: HexCode) => void;
	randomizeBackgroundColor: (hueVariation: HueVariation, lightness: Lightness, color: HexCode) => void;
	clearPokemon: (index: number, dontRender?: boolean) => void;
	selectPokemon: (index: number, pokemon: IPokemonChoice) => void;
	randomizePokemon: (pokemon: PokemonChoices) => void;
	clearTrainer: (index: number) => void;
	selectTrainer: (index: number, trainer: ITrainerChoice) => void;
	randomizeTrainers: (trainers: TrainerChoices) => void;
	setGifOrIcon: (gifOrIcon: GifIcon, currentPokemon: PokemonChoices) => void;
	onUpdateView: () => void;
}

const setBackgroundColorCommand = 'setbackgroundcolor';
const setPokemonCommand = 'setpokemon';

export abstract class HostDisplayBase extends ComponentBase {
	displayName: string = '';

	chooseBackgroundColorPickerCommand: string = 'choosebackgroundcolorpicker';
	choosePokemonPickerCommand: string = 'choosepokemonpicker';
	chooseTrainerPickerCommand: string = 'choosetrainerpicker';
	setPokemonPickerIndexCommand: string = 'setpokemonpickerindex';
	setTrainerPickerIndexCommand: string = 'settrainerpickerindex';
	setTrainerCommand: string = 'settrainer';
	setGifOrIconCommand: string = 'setgiforicon';
	setGif = 'gif';
	setIcon = 'icon';

	currentPicker: 'background' | 'pokemon' | 'trainer' = 'background';
	gifOrIcon: GifIcon = 'gif';
	pokemonPickerIndex: number = 0;
	trainerPickerIndex: number = 0;
	currentBackgroundColor: HexCode | undefined = undefined;
	currentPokemon: PokemonChoices = [];
	currentTrainers: TrainerChoices = [];

	maxGifPokemonPickerIndex: number;
	maxIconPokemonPickerIndex: number;
	maxTrainerPickerIndex: number;
	backgroundColorPicker: ColorPicker;
	gifPokemonPickers: PokemonPickerBase[];
	iconPokemonPickers: PokemonPickerBase[];
	trainerPickers: TrainerPicker[];
	props: IHostDislayProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IHostDislayProps,
		pokemonPickerClass: (typeof PokemonPickerLetter | typeof PokemonPickerRandom)) {
		super(parentCommandPrefix, componentCommand);

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			currentColor: undefined,
			random: props.random,
			onClearColor: () => this.clearBackgroundColor(),
			onSelectColor: color => this.setBackgroundColor(color),
			onUpdateView: () => props.onUpdateView(),
		});

		this.components = [this.backgroundColorPicker];

		this.maxTrainerPickerIndex = props.maxTrainers - 1;
		this.trainerPickers = [];
		for (let i = 0; i < props.maxTrainers; i++) {
			const trainerPicker = new TrainerPicker(this.commandPrefix, this.setTrainerCommand, {
				currentTrainer: undefined,
				random: props.random,
				pickerIndex: i,
				onSetTrainerGen: () => props.onUpdateView(),
				onClearTrainer: (index, dontRender) => this.clearTrainer(index, dontRender),
				onSelectTrainer: (index, trainer, dontRender) => this.selectTrainer(index, trainer, dontRender),
				onUpdateView: () => props.onUpdateView(),
			});
			trainerPicker.active = false;

			this.trainerPickers.push(trainerPicker);
			this.components.push(trainerPicker);
		}

		this.maxGifPokemonPickerIndex = props.maxGifs - 1;
		this.gifPokemonPickers = [];
		for (let i = 0; i < props.maxGifs; i++) {
			const pokemonPicker = new pokemonPickerClass(this.commandPrefix, setPokemonCommand, {
				currentPokemon: undefined,
				gif: true,
				maxGifs: props.maxGifs,
				maxIcons: props.maxIcons,
				pickerIndex: i,
				onChooseLetterView: (index, letter, dontRender) => this.chooseLetterView(index, letter, dontRender),
				onClearPokemon: (index, dontRender) => this.clearPokemon(index, dontRender),
				onSelectPokemon: (index, pokemon, shiny, dontRender) =>
					this.selectPokemon(index, pokemon, shiny, dontRender),
				onUpdateView: () => props.onUpdateView(),
			});
			pokemonPicker.active = false;

			this.gifPokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}

		this.maxIconPokemonPickerIndex = props.maxIcons - 1;
		this.iconPokemonPickers = [];
		for (let i = 0; i < props.maxIcons; i++) {
			const pokemonPicker = new pokemonPickerClass(this.commandPrefix, setPokemonCommand, {
				currentPokemon: undefined,
				gif: false,
				maxGifs: props.maxGifs,
				maxIcons: props.maxIcons,
				pickerIndex: i,
				onChooseLetterView: (index, letter, dontRender) => this.chooseLetterView(index, letter, dontRender),
				onClearPokemon: (index, dontRender) => this.clearPokemon(index, dontRender),
				onSelectPokemon: (index, pokemon, shiny, dontRender) =>
					this.selectPokemon(index, pokemon, shiny, dontRender),
				onUpdateView: () => props.onUpdateView(),
			});
			pokemonPicker.active = false;

			this.iconPokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}

		this.props = props;
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.backgroundColorPicker.active = true;
		if (this.gifOrIcon === 'gif') {
			this.gifPokemonPickers[this.pokemonPickerIndex].active = false;
		} else {
			this.iconPokemonPickers[this.pokemonPickerIndex].active = false;
		}
		this.trainerPickers[this.trainerPickerIndex].active = false;
		this.currentPicker = 'background';

		this.props.onUpdateView();
	}

	choosePokemonPicker(): void {
		if (this.currentPicker === 'pokemon') return;

		if (this.gifOrIcon === 'gif') {
			this.gifPokemonPickers[this.pokemonPickerIndex].active = true;
		} else {
			this.iconPokemonPickers[this.pokemonPickerIndex].active = true;
		}
		this.backgroundColorPicker.active = false;
		this.trainerPickers[this.trainerPickerIndex].active = false;
		this.currentPicker = 'pokemon';

		this.props.onUpdateView();
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.trainerPickers[this.trainerPickerIndex].active = true;
		this.backgroundColorPicker.active = false;
		if (this.gifOrIcon === 'gif') {
			this.gifPokemonPickers[this.pokemonPickerIndex].active = false;
		} else {
			this.iconPokemonPickers[this.pokemonPickerIndex].active = false;
		}
		this.currentPicker = 'trainer';

		this.props.onUpdateView();
	}

	setPokemonPickerIndex(index: number): boolean {
		if (this.pokemonPickerIndex === index) return true;

		const gif = this.gifOrIcon === 'gif';
		if (gif) {
			if (index > this.maxGifPokemonPickerIndex) return false;
		} else {
			if (index > this.maxIconPokemonPickerIndex) return false;
		}

		const previousPickerIndex = this.pokemonPickerIndex;
		this.pokemonPickerIndex = index;

		if (gif) {
			this.gifPokemonPickers[previousPickerIndex].active = false;
			this.gifPokemonPickers[this.pokemonPickerIndex].active = true;
		} else {
			this.iconPokemonPickers[previousPickerIndex].active = false;
			this.iconPokemonPickers[this.pokemonPickerIndex].active = true;
		}

		this.props.onUpdateView();
		return true;
	}

	setTrainerPickerIndex(index: number): boolean {
		if (this.trainerPickerIndex === index) return true;

		if (index > this.maxTrainerPickerIndex) return false;

		const previousPickerIndex = this.trainerPickerIndex === -1 ? undefined : this.trainerPickerIndex;
		this.trainerPickerIndex = index;

		if (previousPickerIndex !== undefined) this.trainerPickers[previousPickerIndex].active = false;
		if (this.trainerPickerIndex !== -1) this.trainerPickers[this.trainerPickerIndex].active = true;

		this.props.onUpdateView();
		return true;
	}

	clearBackgroundColor(): void {
		this.currentBackgroundColor = undefined;

		this.props.clearBackgroundColor();
	}

	setBackgroundColor(color: HexCode): void {
		this.currentBackgroundColor = color;

		this.props.setBackgroundColor(color);
	}

	chooseLetterView(index: number, letter: string | undefined, dontRender?: boolean, replicating?: boolean): void {
		if (!replicating) {
			if (this.gifOrIcon === 'gif') {
				(this.iconPokemonPickers[index] as PokemonPickerLetter).chooseLetterView(letter, true, true);
			} else {
				if (this.gifPokemonPickers[index]) {
					(this.gifPokemonPickers[index] as PokemonPickerLetter).chooseLetterView(letter, true, true);
				}
			}
		}

		if (!dontRender) this.props.onUpdateView();
	}

	clearPokemon(index: number, dontRender?: boolean, replicating?: boolean): void {
		this.currentPokemon[index] = undefined;

		if (!replicating) {
			if (this.gifOrIcon === 'gif') {
				(this.iconPokemonPickers[index] as PokemonPickerLetter).clearPokemon(true, true);
			} else {
				if (this.gifPokemonPickers[index]) {
					(this.gifPokemonPickers[index] as PokemonPickerLetter).clearPokemon(true, true);
				}
			}
		}

		if (!dontRender) this.props.clearPokemon(index);
	}

	selectPokemon(index: number, pokemon: string, shiny: boolean, dontRender?: boolean, replicating?: boolean): void {
		this.currentPokemon[index] = {pokemon, shiny};

		if (!replicating) {
			if (this.gifOrIcon === 'gif') {
				(this.iconPokemonPickers[index] as PokemonPickerLetter).selectPokemon(pokemon, true, true);
			} else {
				if (this.gifPokemonPickers[index]) {
					(this.gifPokemonPickers[index] as PokemonPickerLetter).selectPokemon(pokemon, true, true);
				}
			}
		}

		if (!dontRender) this.props.selectPokemon(index, {pokemon, shiny});
	}

	clearTrainer(index: number, dontRender?: boolean): void {
		this.currentTrainers[index] = undefined;

		if (!dontRender) this.props.clearTrainer(index);
	}

	selectTrainer(index: number, trainer: ITrainerChoice, dontRender?: boolean): void {
		this.currentTrainers[index] = trainer;

		if (!dontRender) this.props.selectTrainer(index, trainer);
	}

	setGifOrIcon(gifOrIcon: GifIcon, dontRender?: boolean): void {
		if (this.gifOrIcon === gifOrIcon) return;

		if (this.gifOrIcon === 'gif') {
			for (const pokemonPicker of this.gifPokemonPickers) {
				pokemonPicker.active = false;
			}
		} else {
			for (const pokemonPicker of this.iconPokemonPickers) {
				pokemonPicker.active = false;
			}

			for (let i = this.props.maxGifs; i < this.props.maxIcons; i++) {
				this.iconPokemonPickers[i].reset();
			}
		}

		this.gifOrIcon = gifOrIcon;

		if (gifOrIcon === 'gif') {
			if (this.pokemonPickerIndex > this.maxGifPokemonPickerIndex) this.pokemonPickerIndex = this.maxGifPokemonPickerIndex;
			if (this.pokemonPickerIndex > -1) this.gifPokemonPickers[this.pokemonPickerIndex].active = true;
		} else {
			if (this.pokemonPickerIndex > this.maxIconPokemonPickerIndex) this.pokemonPickerIndex = this.maxIconPokemonPickerIndex;
			if (this.pokemonPickerIndex > -1) this.iconPokemonPickers[this.pokemonPickerIndex].active = true;
		}

		if (!dontRender) this.props.setGifOrIcon(gifOrIcon, this.currentPokemon);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.chooseBackgroundColorPickerCommand) {
			this.chooseBackgroundColorPicker();
		} else if (cmd === this.choosePokemonPickerCommand) {
			this.choosePokemonPicker();
		} else if (cmd === this.chooseTrainerPickerCommand) {
			this.chooseTrainerPicker();
		} else if (cmd === this.setPokemonPickerIndexCommand) {
			const index = parseInt(targets[0].trim());
			if (isNaN(index) || index < 1) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}

			if (!this.setPokemonPickerIndex(index - 1)) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}
		} else if (cmd === this.setTrainerPickerIndexCommand) {
			const index = parseInt(targets[0].trim());
			if (isNaN(index) || index < 1) {
				return "'" + targets[0].trim() + "' is not a valid trainer slot.";
			}

			if (!this.setTrainerPickerIndex(index - 1)) {
				return "'" + targets[0].trim() + "' is not a valid trainer slot.";
			}
		} else if (cmd === this.setGifOrIconCommand) {
			const option = targets[0].trim() as GifIcon | "";
			if (option !== this.setGif && option !== this.setIcon) return "'" + option + "' is not a valid GIF or icon option.";

			if (option === this.setGif) {
				this.setGifOrIcon('gif');
			} else {
				this.setGifOrIcon('icon');
			}
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	renderBackgroundPicker(): string {
		return "<b>Background color</b><br />" + this.backgroundColorPicker.render();
	}
}
