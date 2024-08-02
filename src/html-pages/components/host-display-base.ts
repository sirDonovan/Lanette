import type { IColorPick } from "./color-picker";
import { ColorPicker } from "./color-picker";
import type { IPokemonPick, IPokemonPickerProps, PokemonChoices, PokemonPickerBase } from "./pokemon-picker-base";
import type { ITrainerPick, TrainerChoices } from "./trainer-picker";
import { TrainerPicker } from "./trainer-picker";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { PokemonPickerManual } from "./pokemon-picker-manual";
import type { PokemonPickerRandom } from "./pokemon-picker-random";
import type { ModelGeneration } from "../../types/dex";
import type { BorderType, HexCode, IHexCodeData } from "../../types/tools";
import type { GifIcon, ICustomBorder, IGameHostDisplay } from "../../types/storage";
import { BorderStyle } from "./border-style";
import type { HtmlPageBase } from "../html-page-base";

export interface IHostDisplayProps extends IComponentProps {
	currentBackground?: HexCode | IHexCodeData;
	currentBackgroundBorder?: ICustomBorder;
	maxGifs: number;
	maxIcons: number;
	maxTrainers: number;
	random?: boolean;
	clearBackgroundColor: (dontRender: boolean | undefined) => void;
	setBackgroundColor: (color: IColorPick, dontRender: boolean | undefined) => void;
	clearPokemon: (index: number, dontRender: boolean | undefined) => void;
	selectPokemon: (index: number, pokemon: IPokemonPick, dontRender: boolean | undefined) => void;
	clearRandomizedPokemon: () => void;
	randomizePokemon: (pokemon: PokemonChoices) => void;
	clearTrainer: (index: number, dontRender: boolean | undefined) => void;
	selectTrainer: (index: number, trainer: ITrainerPick, dontRender: boolean | undefined) => void;
	randomizeTrainers: (trainers: TrainerChoices) => void;
	setGifOrIcon: (gifOrIcon: GifIcon, currentPokemon: PokemonChoices, dontRender: boolean | undefined) => void;
	onClearBorderColor: (dontRender: boolean | undefined) => void;
	onPickBorderColor: (color: IColorPick, dontRender: boolean | undefined) => void;
	onClearBorderRadius: (dontRender: boolean | undefined) => void;
	onPickBorderRadius: (radius: number, dontRender: boolean | undefined) => void;
	onClearBorderSize: (dontRender: boolean | undefined) => void;
	onPickBorderSize: (size: number, dontRender: boolean | undefined) => void;
	onClearBorderType: (dontRender: boolean | undefined) => void;
	onPickBorderType: (type: BorderType, dontRender: boolean | undefined) => void;
	reRender: () => void;
}

const setBackgroundColorCommand = 'setbackgroundcolor';
const setBackgroudBorderStyleCommand = 'setbackgroundborderstyle';
const setPokemonCommand = 'setpokemon';

export abstract class HostDisplayBase extends ComponentBase<IHostDisplayProps> {
	chooseBackgroundColorPickerCommand: string = 'choosebackgroundcolorpicker';
	chooseBackgroundBorderPickerCommand: string = 'choosebackgroundborderpicker';
	choosePokemonPickerCommand: string = 'choosepokemonpicker';
	chooseTrainerPickerCommand: string = 'choosetrainerpicker';
	setPokemonPickerIndexCommand: string = 'setpokemonpickerindex';
	setTrainerPickerIndexCommand: string = 'settrainerpickerindex';
	setTrainerCommand: string = 'settrainer';
	setGifOrIconCommand: string = 'setgiforicon';
	setGenerationCommand: string = 'setgeneration';
	setGif: string = 'gif';
	setIcon: string = 'icon';

	currentModelGeneration: ModelGeneration = Dex.getModelGenerationName(Dex.getGen());
	currentPicker: 'background' | 'background-border' | 'pokemon' | 'trainer' = 'background';
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
	backgroundBorderStyle: BorderStyle;
	gifPokemonPickers: PokemonPickerBase[];
	iconPokemonPickers: PokemonPickerBase[];
	trainerPickers: TrainerPicker[];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps,
		pokemonPickerClass: (typeof PokemonPickerManual | typeof PokemonPickerRandom)) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.backgroundColorPicker = new ColorPicker(htmlPage, this.commandPrefix, setBackgroundColorCommand, {
			name: "Background",
			currentPick: typeof props.currentBackground === 'string' ? props.currentBackground : undefined,
			currentPickObject: props.currentBackground && typeof props.currentBackground !== 'string' ? props.currentBackground : undefined,
			random: props.random,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.backgroundBorderStyle = new BorderStyle(htmlPage, this.commandPrefix, setBackgroudBorderStyleCommand, {
			name: "Background",
			currentBorder: props.currentBackgroundBorder,
			minRadius: 2,
			maxRadius: 100,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => props.onClearBorderColor(dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => props.onPickBorderColor(color, dontRender),
			onClearRadius: (dontRender) => props.onClearBorderRadius(dontRender),
			onPickRadius: (radius, dontRender) => props.onPickBorderRadius(radius, dontRender),
			onClearSize: (dontRender) => props.onClearBorderSize(dontRender),
			onPickSize: (size, dontRender) => props.onPickBorderSize(size, dontRender),
			onClearType: (dontRender) => props.onClearBorderType(dontRender),
			onPickType: (type, dontRender) => props.onPickBorderType(type, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.backgroundBorderStyle.active = false;

		this.components = [this.backgroundColorPicker, this.backgroundBorderStyle];

		this.maxTrainerPickerIndex = props.maxTrainers - 1;
		this.trainerPickers = [];
		for (let i = 0; i < props.maxTrainers; i++) {
			const trainerPicker = new TrainerPicker(htmlPage, this.commandPrefix, this.setTrainerCommand, {
				random: props.random,
				pickerIndex: i,
				onSetTrainerGen: (index, trainerGen, dontRender) => this.setTrainerGen(dontRender),
				onClear: (index, dontRender) => this.clearTrainer(index, dontRender),
				onPick: (index, trainer, dontRender) => this.selectTrainer(index, trainer, dontRender),
				readonly: this.props.readonly,
				reRender: () => this.props.reRender(),
			});
			trainerPicker.active = false;

			this.trainerPickers.push(trainerPicker);
			this.components.push(trainerPicker);
		}

		const pokemonPickerProps: IPokemonPickerProps = {
			gif: false,
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

		this.maxGifPokemonPickerIndex = props.maxGifs - 1;
		this.gifPokemonPickers = [];
		for (let i = 0; i < props.maxGifs; i++) {
			const pokemonPicker = new pokemonPickerClass(htmlPage, this.commandPrefix, setPokemonCommand,
				Object.assign({}, pokemonPickerProps, {
					gif: true,
					pickerIndex: i,
				})
			);
			pokemonPicker.active = false;

			this.gifPokemonPickers.push(pokemonPicker);
			this.components.push(pokemonPicker);
		}

		this.maxIconPokemonPickerIndex = props.maxIcons - 1;
		this.iconPokemonPickers = [];
		for (let i = 0; i < props.maxIcons; i++) {
			const pokemonPicker = new pokemonPickerClass(htmlPage, this.commandPrefix, setPokemonCommand,
				Object.assign({}, pokemonPickerProps, {
					pickerIndex: i,
				})
			);
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

	abstract loadHostDisplayPokemon(pokemon: PokemonChoices): void;
	abstract loadHostDisplayTrainers(trainers: TrainerChoices): void;

	loadHostDisplay(hostDisplay: IGameHostDisplay): void {
		this.gifOrIcon = hostDisplay.gifOrIcon;
		if (hostDisplay.pokemon.length) this.loadHostDisplayPokemon(hostDisplay.pokemon);
		if (hostDisplay.trainers.length) this.loadHostDisplayTrainers(hostDisplay.trainers);
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.toggleBackgroundColorPicker(true);
		this.toggleBackgroundBorderPicker(false);
		this.togglePokemonPicker(false);
		this.toggleTrainerPicker(false);

		this.currentPicker = 'background';

		this.props.reRender();
	}

	toggleBackgroundColorPicker(active: boolean): void {
		this.backgroundColorPicker.active = active;
	}

	chooseBackgroundBorderPicker(): void {
		if (this.currentPicker === 'background-border') return;

		this.toggleBackgroundBorderPicker(true);
		this.toggleBackgroundColorPicker(false);
		this.togglePokemonPicker(false);
		this.toggleTrainerPicker(false);

		this.currentPicker = 'background-border';

		this.props.reRender();
	}

	toggleBackgroundBorderPicker(active: boolean): void {
		this.backgroundBorderStyle.active = active;
	}

	choosePokemonPicker(): void {
		if (this.currentPicker === 'pokemon') return;

		this.toggleBackgroundColorPicker(false);
		this.toggleBackgroundBorderPicker(false);
		this.togglePokemonPicker(true);
		this.toggleTrainerPicker(false);

		this.currentPicker = 'pokemon';

		this.props.reRender();
	}

	togglePokemonPicker(active: boolean): void {
		if (this.gifOrIcon === 'gif') {
			this.gifPokemonPickers[this.pokemonPickerIndex].active = active;
		} else {
			this.iconPokemonPickers[this.pokemonPickerIndex].active = active;
		}
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.toggleBackgroundColorPicker(false);
		this.toggleBackgroundBorderPicker(false);
		this.togglePokemonPicker(false);
		this.toggleTrainerPicker(true);

		this.currentPicker = 'trainer';

		this.props.reRender();
	}

	toggleTrainerPicker(active: boolean): void {
		this.trainerPickers[this.trainerPickerIndex].active = active;
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

	setAllModelGenerations(modelGeneration: ModelGeneration): void {
		if (this.currentModelGeneration === modelGeneration) return;

		const previousGeneration = this.currentModelGeneration;
		this.currentModelGeneration = modelGeneration;

		if (this.onSetAllModelGenerations) this.onSetAllModelGenerations(previousGeneration);

		this.props.reRender();
	}

	pickBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearBackgroundColor(dontRender?: boolean): void {
		this.currentBackgroundColor = undefined;

		this.props.clearBackgroundColor(dontRender);
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		this.currentBackgroundColor = color;

		this.props.setBackgroundColor(color, dontRender);
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

	selectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		this.currentPokemon[index] = pokemon;

		if (this.onSelectPokemon) this.onSelectPokemon(index, pokemon, dontRender);

		this.props.selectPokemon(index, pokemon, dontRender);
	}

	setTrainerGen(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearTrainer(index: number, dontRender?: boolean): void {
		this.currentTrainers[index] = undefined;

		this.props.clearTrainer(index, dontRender);
	}

	selectTrainer(index: number, trainer: ITrainerPick, dontRender?: boolean): void {
		this.currentTrainers[index] = trainer;

		this.props.selectTrainer(index, trainer, dontRender);
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

		this.onSetGifOrIcon(dontRender);
	}

	onSetGifOrIcon(dontRender?: boolean): void {
		this.props.setGifOrIcon(this.gifOrIcon, this.currentPokemon, dontRender);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.chooseBackgroundColorPickerCommand) {
			this.chooseBackgroundColorPicker();
		} else if (cmd === this.chooseBackgroundBorderPickerCommand) {
			this.chooseBackgroundBorderPicker();
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
		} else if (cmd === this.setGenerationCommand) {
			const gen = targets[0].trim() as ModelGeneration | '';
			if (!Dex.getModelGenerations().includes(gen as ModelGeneration)) {
				return "'" + targets[0].trim() + "' is not a valid model generation.";
			}

			this.setAllModelGenerations(gen as ModelGeneration);
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	renderBackgroundPicker(): string {
		return "<b>Background color</b><br />" + this.backgroundColorPicker.render();
	}

	renderBackgroundBorderPicker(): string {
		return "<b>Background border</b><br />" + this.backgroundBorderStyle.render();
	}

	renderAllModelGenerations(): string {
		let html = "Model generations:";
		for (const generation of Dex.getModelGenerations()) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setGenerationCommand + "," + generation,
				generation.toUpperCase(), {selectedAndDisabled: this.currentModelGeneration === generation});
		}

		return html;
	}

	onSetAllModelGenerations?(previousGeneration: ModelGeneration): void;
	onSelectPokemon?(index: number, pokemon: IPokemonPick, dontRender?: boolean): void;
}
