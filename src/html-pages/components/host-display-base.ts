import type { IColorPick } from "./color-picker";
import { ColorPicker } from "./color-picker";
import type { IPokemonPick, IPokemonPickerProps, PokemonPickerBase } from "./pokemon-picker-base";
import type { ITrainerPick } from "./trainer-picker";
import { TrainerPicker } from "./trainer-picker";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { GifIcon, PokemonChoices, TrainerChoices } from "../game-host-control-panel";
import type { PokemonPickerLetter } from "./pokemon-picker-letter";
import type { PokemonPickerRandom } from "./pokemon-picker-random";

export interface IHostDisplayProps extends IComponentProps {
	maxGifs: number;
	maxIcons: number;
	maxTrainers: number;
	random?: boolean;
	clearBackgroundColor: () => void;
	setBackgroundColor: (color: IColorPick) => void;
	clearPokemon: (index: number, dontRender?: boolean) => void;
	selectPokemon: (index: number, pokemon: IPokemonPick) => void;
	randomizePokemon: (pokemon: PokemonChoices) => void;
	clearTrainer: (index: number) => void;
	selectTrainer: (index: number, trainer: ITrainerPick) => void;
	randomizeTrainers: (trainers: TrainerChoices) => void;
	setGifOrIcon: (gifOrIcon: GifIcon, currentPokemon: PokemonChoices) => void;
}

const setBackgroundColorCommand = 'setbackgroundcolor';
const setPokemonCommand = 'setpokemon';

export abstract class HostDisplayBase extends ComponentBase<IHostDisplayProps> {
	chooseBackgroundColorPickerCommand: string = 'choosebackgroundcolorpicker';
	choosePokemonPickerCommand: string = 'choosepokemonpicker';
	chooseTrainerPickerCommand: string = 'choosetrainerpicker';
	setPokemonPickerIndexCommand: string = 'setpokemonpickerindex';
	setTrainerPickerIndexCommand: string = 'settrainerpickerindex';
	setTrainerCommand: string = 'settrainer';
	setGifOrIconCommand: string = 'setgiforicon';
	setGif: string = 'gif';
	setIcon: string = 'icon';

	currentPicker: 'background' | 'pokemon' | 'trainer' = 'background';
	gifOrIcon: GifIcon = 'gif';
	pokemonPickerIndex: number = 0;
	trainerPickerIndex: number = 0;
	currentBackgroundColor: IColorPick | undefined = undefined;
	currentPokemon: PokemonChoices = [];
	currentTrainers: TrainerChoices = [];

	maxGifPokemonPickerIndex: number;
	maxIconPokemonPickerIndex: number;
	maxTrainerPickerIndex: number;
	backgroundColorPicker: ColorPicker;
	gifPokemonPickers: PokemonPickerBase[];
	iconPokemonPickers: PokemonPickerBase[];
	trainerPickers: TrainerPicker[];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps,
		pokemonPickerClass: (typeof PokemonPickerLetter | typeof PokemonPickerRandom)) {
		super(parentCommandPrefix, componentCommand, props);

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			random: props.random,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => props.reRender(),
		});

		this.components = [this.backgroundColorPicker];

		this.maxTrainerPickerIndex = props.maxTrainers - 1;
		this.trainerPickers = [];
		for (let i = 0; i < props.maxTrainers; i++) {
			const trainerPicker = new TrainerPicker(this.commandPrefix, this.setTrainerCommand, {
				random: props.random,
				pickerIndex: i,
				onSetTrainerGen: () => props.reRender(),
				onClear: (index, dontRender) => this.clearTrainer(index, dontRender),
				onPick: (index, trainer, dontRender) => this.selectTrainer(index, trainer, dontRender),
				reRender: () => props.reRender(),
			});
			trainerPicker.active = false;

			this.trainerPickers.push(trainerPicker);
			this.components.push(trainerPicker);
		}

		const pokemonPickerProps: IPokemonPickerProps = {
			gif: false,
			maxGifs: props.maxGifs,
			maxIcons: props.maxIcons,
			onPickLetter: (index, letter, dontRender) => this.pickPokemonLetter(index, letter, dontRender),
			onPickShininess: (index, shininess, dontRender) => this.pickPokemonShininess(index, shininess, dontRender),
			onClearType: (index, dontRender) => this.clearPokemonType(index, dontRender),
			onPickType: (index, type, dontRender) => this.pickPokemonType(index, type, dontRender),
			onClear: (index, dontRender) => this.clearPokemon(index, dontRender),
			onPick: (index, pokemon, dontRender) =>
				this.selectPokemon(index, pokemon, dontRender),
			reRender: () => props.reRender(),
		};

		this.maxGifPokemonPickerIndex = props.maxGifs - 1;
		this.gifPokemonPickers = [];
		for (let i = 0; i < props.maxGifs; i++) {
			const pokemonPicker = new pokemonPickerClass(this.commandPrefix, setPokemonCommand, Object.assign({}, pokemonPickerProps, {
				gif: true,
				pickerIndex: i,
			}));
			pokemonPicker.active = false;

			this.gifPokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}

		this.maxIconPokemonPickerIndex = props.maxIcons - 1;
		this.iconPokemonPickers = [];
		for (let i = 0; i < props.maxIcons; i++) {
			const pokemonPicker = new pokemonPickerClass(this.commandPrefix, setPokemonCommand, Object.assign({}, pokemonPickerProps, {
				pickerIndex: i,
			}));
			pokemonPicker.active = false;

			this.iconPokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}

		for (let i = 0; i < props.maxGifs; i++) {
			if (!this.iconPokemonPickers[i]) break;
			this.gifPokemonPickers[i].addReplicationTarget(this.iconPokemonPickers[i]);
		}

		for (let i = 0; i < props.maxIcons; i++) {
			if (!this.gifPokemonPickers[i]) break;
			this.iconPokemonPickers[i].addReplicationTarget(this.gifPokemonPickers[i]);
		}
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

		this.props.reRender();
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

		this.props.reRender();
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

		this.props.reRender();
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

		this.props.reRender();
		return true;
	}

	setTrainerPickerIndex(index: number): boolean {
		if (this.trainerPickerIndex === index) return true;

		if (index > this.maxTrainerPickerIndex) return false;

		const previousPickerIndex = this.trainerPickerIndex === -1 ? undefined : this.trainerPickerIndex;
		this.trainerPickerIndex = index;

		if (previousPickerIndex !== undefined) this.trainerPickers[previousPickerIndex].active = false;
		if (this.trainerPickerIndex !== -1) this.trainerPickers[this.trainerPickerIndex].active = true;

		this.props.reRender();
		return true;
	}

	pickBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearBackgroundColor(dontRender?: boolean): void {
		this.currentBackgroundColor = undefined;

		if (!dontRender) this.props.clearBackgroundColor();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		this.currentBackgroundColor = color;

		if (!dontRender) this.props.setBackgroundColor(color);
	}

	pickPokemonLetter(index: number, letter: string, dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickPokemonShininess(index: number, shininess: boolean, dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearPokemonType(index: number, dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickPokemonType(index: number, type: string, dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearPokemon(index: number, dontRender?: boolean): void {
		this.currentPokemon[index] = undefined;

		if (!dontRender) this.props.clearPokemon(index);
	}

	selectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		this.currentPokemon[index] = pokemon;

		if (!dontRender) this.props.selectPokemon(index, pokemon);
	}

	clearTrainer(index: number, dontRender?: boolean): void {
		this.currentTrainers[index] = undefined;

		if (!dontRender) this.props.clearTrainer(index);
	}

	selectTrainer(index: number, trainer: ITrainerPick, dontRender?: boolean): void {
		this.currentTrainers[index] = trainer;

		if (!dontRender) this.props.selectTrainer(index, trainer);
	}

	setGifOrIcon(gifOrIcon: GifIcon, dontRender?: boolean): void {
		if (this.gifOrIcon === gifOrIcon) return;

		if (this.gifOrIcon === 'gif') {
			for (const pokemonPicker of this.gifPokemonPickers) {
				pokemonPicker.active = false;
			}

			for (let i = this.props.maxIcons; i < this.props.maxGifs; i++) {
				this.gifPokemonPickers[i].reset();
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
