import { PokemonPickerRandom } from "./pokemon-picker-random";
import type { IHostDisplayProps } from "./host-display-base";
import { HostDisplayBase } from "./host-display-base";
import { TypePicker } from "./type-picker";
import type { TrainerGeneration } from "./trainer-picker";
import {
	defaultTrainers, genEightTrainers, genFiveTrainers, genFourTrainers, genNineTrainers, genOneTrainers, genSevenTrainers, genSixTrainers,
	genThreeTrainers, genTwoTrainers, trainerGens
} from "./trainer-picker";
import type { PokemonChoices, TrainerChoices } from "../game-host-control-panel";
import { PokemonPickerBase } from "./pokemon-picker-base";
import type { HtmlPageBase } from "../html-page-base";

const clearPokemon = 'clearpokemon';
const randomizePokemon = 'randomizepokemon';
const randomizeTrainers = 'randomizetrainers';
const setTrainerGenCommand = 'settrainergen';
const setFormes = 'setformes';
const withFormes = 'yes';
const withoutFormes = 'no';
const setTypeCommand = 'settype';
const randomTrainerGen = 'random';

export class RandomHostDisplay extends HostDisplayBase {
	componentId: string = 'random-display';
	currentType: string | undefined = undefined;
	currentTrainerGeneration: TrainerGeneration | undefined = undefined;
	formes: boolean = false;
	pokemonPickerIndex: number = -1;
	trainerPickerIndex: number = -1;

	allTypePicker: TypePicker;

	declare gifPokemonPickers: PokemonPickerRandom[];
	declare iconPokemonPickers: PokemonPickerRandom[];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props, PokemonPickerRandom);

		this.allTypePicker = new TypePicker(htmlPage, this.commandPrefix, setTypeCommand, {
			noPickName: "Random",
			onClear: (index, dontRender) => this.clearAllPokemonTypes(dontRender),
			onPick: (index, type, dontRender) => this.setAllPokemonTypes(type, dontRender),
			readonly: this.props.readonly,
			reRender: () => props.reRender(),
		});
		this.allTypePicker.active = false;

		this.components.push(this.allTypePicker);
	}

	togglePokemonPicker(active: boolean): void {
		if (this.pokemonPickerIndex === -1) {
			this.allTypePicker.active = active;
		} else {
			if (this.gifOrIcon === 'gif') {
				this.gifPokemonPickers[this.pokemonPickerIndex].active = active;
			} else {
				this.iconPokemonPickers[this.pokemonPickerIndex].active = active;
			}
		}
	}

	onSetGifOrIcon(dontRender?: boolean): void {
		if (this.gifOrIcon === 'icon') {
			for (let i = 0; i < this.gifPokemonPickers.length; i++) {
				if (!this.iconPokemonPickers[i]) break;
				this.iconPokemonPickers[i].pickGeneration(PokemonPickerBase.defaultModelGeneration, true, this.gifPokemonPickers[i]);
			}
		}

		super.onSetGifOrIcon(dontRender);
	}

	toggleTrainerPicker(active: boolean): void {
		if (this.trainerPickerIndex !== -1) this.trainerPickers[this.trainerPickerIndex].active = active;
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

	clearAllPokemonTypes(dontRender?: boolean): void {
		if (this.currentType === undefined) return;

		this.currentType = undefined;

		for (const pokemonPicker of this.gifPokemonPickers) {
			pokemonPicker.clearTypeParent();
		}

		for (const pokemonPicker of this.iconPokemonPickers) {
			pokemonPicker.clearTypeParent();
		}

		if (!dontRender) this.props.reRender();
	}

	setAllPokemonTypes(type: string, dontRender?: boolean): void {
		if (this.currentType === type) return;

		this.currentType = type;

		for (const pokemonPicker of this.gifPokemonPickers) {
			pokemonPicker.pickTypeParent(type);
		}

		for (const pokemonPicker of this.iconPokemonPickers) {
			pokemonPicker.pickTypeParent(type);
		}

		if (!dontRender) this.props.reRender();
	}

	setPokemonPickerIndex(index: number): boolean {
		if (this.pokemonPickerIndex === index) return true;

		const gif = this.gifOrIcon === 'gif';
		if (gif) {
			if (index > this.maxGifPokemonPickerIndex) return false;
		} else {
			if (index > this.maxIconPokemonPickerIndex) return false;
		}

		const previousPickerIndex = this.pokemonPickerIndex === -1 ? undefined : this.pokemonPickerIndex;
		this.pokemonPickerIndex = index;

		const pokemonPickers = gif ? this.gifPokemonPickers : this.iconPokemonPickers;
		if (previousPickerIndex !== undefined) {
			pokemonPickers[previousPickerIndex].active = false;
		} else {
			this.allTypePicker.active = false;
		}

		if (this.pokemonPickerIndex === -1) {
			this.allTypePicker.active = true;
		} else {
			pokemonPickers[this.pokemonPickerIndex].active = true;
		}

		this.props.reRender();
		return true;
	}

	clearRandomizedPokemon(): void {
		if (!this.currentPokemon.length) return;

		const pokemonPickers = this.gifOrIcon === 'gif' ? this.gifPokemonPickers : this.iconPokemonPickers;
		for (const pokemonPicker of pokemonPickers) {
			pokemonPicker.reset();
			pokemonPicker.active = false;
		}

		this.currentPokemon = [];

		this.props.clearRandomizedPokemon();
	}

	randomizePokemon(amount: number): boolean {
		const gif = this.gifOrIcon === 'gif';
		if (gif) {
			if (amount > this.props.maxGifs) return false;
		} else {
			if (amount > this.props.maxIcons) return false;
		}

		const lastIndex = amount - 1;
		if (this.pokemonPickerIndex > lastIndex) this.pokemonPickerIndex = lastIndex;

		const pokemonPickers = gif ? this.gifPokemonPickers : this.iconPokemonPickers;
		for (const pokemonPicker of pokemonPickers) {
			pokemonPicker.active = false;
		}

		for (let i = amount; i < pokemonPickers.length; i++) {
			if (!pokemonPickers[i]) break;
			pokemonPickers[i].reset();
		}

		if (this.pokemonPickerIndex !== -1) pokemonPickers[this.pokemonPickerIndex].active = true;

		this.currentPokemon = [];
		for (let i = 0; i < amount; i++) {
			if (!pokemonPickers[i].pickRandom(true, this.formes, this.currentPokemon.map(x => x ? x.pokemon : ""))) break;
		}

		this.props.randomizePokemon(this.currentPokemon);
		return true;
	}

	withFormes(): void {
		if (this.formes) return;

		this.formes = true;

		this.props.reRender();
	}

	withoutFormes(): void {
		if (!this.formes) return;

		this.formes = false;

		this.props.reRender();
	}

	onSetAllModelGenerations(): void {
		for (const gifPokemonPicker of this.gifPokemonPickers) {
			gifPokemonPicker.parentPickGeneration(this.currentModelGeneration);
		}
	}

	clearAllTrainerGenerations(): void {
		if (this.currentTrainerGeneration === undefined) return;

		this.currentTrainerGeneration = undefined;

		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.parentClearTrainerGen();
		}

		this.props.reRender();
	}

	setAllTrainerGenerations(trainerGeneration: TrainerGeneration): void {
		if (this.currentTrainerGeneration === trainerGeneration) return;

		this.currentTrainerGeneration = trainerGeneration;

		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.parentPickTrainerGen(trainerGeneration);
		}

		this.props.reRender();
	}

	randomizeTrainers(amount: number): boolean {
		if (amount > this.props.maxTrainers) return false;

		const lastIndex = amount - 1;
		if (this.trainerPickerIndex > lastIndex) this.trainerPickerIndex = lastIndex;

		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.reset();
			trainerPicker.active = false;
		}

		if (this.trainerPickerIndex !== -1) this.trainerPickers[this.trainerPickerIndex].active = true;

		this.currentTrainers = [];
		for (let i = 0; i < amount; i++) {
			if (!this.trainerPickers[i].pickRandom(true, this.currentTrainerGeneration === undefined ?
				Tools.sampleOne(trainerGens) : this.currentTrainerGeneration, this.currentTrainers.map(x => x ? x.trainer : ""))) {
				break;
			}
		}

		this.props.randomizeTrainers(this.currentTrainers);
		return true;
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.setPokemonPickerIndexCommand) {
			const index = parseInt(targets[0].trim());
			if (isNaN(index) || index < 0) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}

			if (!this.setPokemonPickerIndex(index - 1)) {
				return "'" + targets[0].trim() + "' is not a valid Pokemon slot.";
			}
		} else if (cmd === this.setTrainerPickerIndexCommand) {
			const index = parseInt(targets[0].trim());
			if (isNaN(index) || index < 0) {
				return "'" + targets[0].trim() + "' is not a valid trainer slot.";
			}

			if (!this.setTrainerPickerIndex(index - 1)) {
				return "'" + targets[0].trim() + "' is not a valid trainer slot.";
			}
		} else if (cmd === clearPokemon) {
			this.clearRandomizedPokemon();
		} else if (cmd === randomizePokemon) {
			const amount = parseInt(targets[0].trim());
			if (isNaN(amount) || amount < 1) {
				return "'" + targets[0].trim() + "' is not a valid number of Pokemon.";
			}

			if (!this.randomizePokemon(amount)) {
				return "'" + targets[0].trim() + "' is not a valid number of Pokemon.";
			}
		} else if (cmd === setTrainerGenCommand) {
			const gen = targets[0].trim() as TrainerGeneration | 'random';
			const random = gen === randomTrainerGen;

			if (!random && !trainerGens.includes(gen)) return "'" + gen + "' is not a valid trainer type.";

			if (random) {
				this.clearAllTrainerGenerations();
			} else {
				this.setAllTrainerGenerations(gen);
			}
		} else if (cmd === randomizeTrainers) {
			const amount = parseInt(targets[0].trim());
			if (isNaN(amount) || amount < 1) {
				return "'" + targets[0].trim() + "' is not a valid number of trainers.";
			}

			if (!this.randomizeTrainers(amount)) {
				return "'" + targets[0].trim() + "' is not a valid number of trainers.";
			}
		} else if (cmd === setFormes) {
			const option = targets[0].trim();
			if (option !== withFormes && option !== withoutFormes) return "'" + option + "' is not a valid forme option.";

			if (option === withFormes) {
				this.withFormes();
			} else {
				this.withoutFormes();
			}
		} else {
			return super.tryCommand(originalTargets);
		}
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
		html += "<br /><br />";

		if (background) {
			html += this.renderBackgroundPicker();
		} else if (border) {
			html += this.renderBackgroundBorderPicker();
		} else if (pokemon) {
			html += "GIFs or icons: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setGif, "GIFs",
				{selectedAndDisabled: this.gifOrIcon === 'gif'});
			html += this.getQuietPmButton(this.commandPrefix + ", " + this.setGifOrIconCommand + "," + this.setIcon, "Icons",
				{selectedAndDisabled: this.gifOrIcon === 'icon'});

			html += "<br />";
			html += "Include formes: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + setFormes + "," + withFormes, "Yes",
				{selectedAndDisabled: this.formes});
			html += this.getQuietPmButton(this.commandPrefix + ", " + setFormes + "," + withoutFormes, "No",
				{selectedAndDisabled: !this.formes});

			html += "<br /><br />";
			const allPokemon = this.pokemonPickerIndex === -1;
			const currentIndex = this.pokemonPickerIndex + 1;
			if (this.gifOrIcon === 'gif') {
				html += this.getQuietPmButton(this.commandPrefix + ", " + clearPokemon, "None");

				for (let i = 1; i <= this.props.maxGifs; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + randomizePokemon + ", " + i, "Random " + i);
				}

				html += "<br /><br />";
				html += "Pokemon: ";
				html += this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", 0", "All",
					{selectedAndDisabled: allPokemon});

				for (let i = 1; i <= this.props.maxGifs; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, {selectedAndDisabled: currentIndex === i});
				}

				html += "<br /><br />";

				if (allPokemon) {
					html += this.renderAllModelGenerations();
					html += "<br /><br />";
					html += this.allTypePicker.render();
				} else {
					html += this.gifPokemonPickers[this.pokemonPickerIndex].render();
				}
			} else {
				for (let i = 1; i <= this.props.maxIcons; i++) {
					if (i > 1) html += "&nbsp;";
					html += this.getQuietPmButton(this.commandPrefix + ", " + randomizePokemon + ", " + i, "Random " + i);
				}

				html += "<br /><br />";
				html += "Pokemon:";
				html += this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", 0", "All",
					{selectedAndDisabled: allPokemon});

				for (let i = 1; i <= this.props.maxIcons; i++) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, {selectedAndDisabled: currentIndex === i});
				}

				html += "<br /><br />";
				if (allPokemon) {
					html += this.allTypePicker.render();
				} else {
					html += this.iconPokemonPickers[this.pokemonPickerIndex].render();
				}
			}
		} else {
			const allTrainers = this.trainerPickerIndex === -1;
			const currentIndex = this.trainerPickerIndex + 1;

			for (let i = 1; i <= this.props.maxTrainers; i++) {
				if (i > 1) html += "&nbsp;";
				html += this.getQuietPmButton(this.commandPrefix + ", " + randomizeTrainers + ", " + i, "Random " + i);
			}

			html += "<br /><br />";
			html += "Trainers:";
			html += this.getQuietPmButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", 0", "All",
				{selectedAndDisabled: allTrainers});

			for (let i = 1; i <= this.props.maxTrainers; i++) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", " + i,
					"" + i, {selectedAndDisabled: currentIndex === i});
			}

			html += "<br /><br />";
			if (allTrainers) {
				const currentDefaultTrainers = this.currentTrainerGeneration === defaultTrainers;
				const currentGenOneTrainers = this.currentTrainerGeneration === genOneTrainers;
				const currentGenTwoTrainers = this.currentTrainerGeneration === genTwoTrainers;
				const currentGenThreeTrainers = this.currentTrainerGeneration === genThreeTrainers;
				const currentGenFourTrainers = this.currentTrainerGeneration === genFourTrainers;
				const currentGenFiveTrainers = this.currentTrainerGeneration === genFiveTrainers;
				const currentGenSixTrainers = this.currentTrainerGeneration === genSixTrainers;
				const currentGenSevenTrainers = this.currentTrainerGeneration === genSevenTrainers;
				const currentGenEightTrainers = this.currentTrainerGeneration === genEightTrainers;
				const currentGenNineTrainers = this.currentTrainerGeneration === genNineTrainers;

				html += this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + randomTrainerGen,
					"Random", {selectedAndDisabled: this.currentTrainerGeneration === undefined});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + defaultTrainers,
					"Default", {selectedAndDisabled: currentDefaultTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genOneTrainers,
					"Gen 1", {selectedAndDisabled: currentGenOneTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genTwoTrainers,
					"Gen 2", {selectedAndDisabled: currentGenTwoTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genThreeTrainers,
					"Gen 3", {selectedAndDisabled: currentGenThreeTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genFourTrainers,
					"Gen 4", {selectedAndDisabled: currentGenFourTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genFiveTrainers,
					"Gen 5", {selectedAndDisabled: currentGenFiveTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genSixTrainers,
					"Gen 6", {selectedAndDisabled: currentGenSixTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genSevenTrainers,
					"Gen 7", {selectedAndDisabled: currentGenSevenTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genEightTrainers,
					"Gen 8", {selectedAndDisabled: currentGenEightTrainers});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genNineTrainers,
					"Gen 9", {selectedAndDisabled: currentGenNineTrainers});
			} else {
				html += this.trainerPickers[this.trainerPickerIndex].render();
			}
		}

		return html;
	}
}
