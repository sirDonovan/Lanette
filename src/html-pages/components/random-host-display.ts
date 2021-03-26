import { PokemonPickerRandom } from "./pokemon-picker-random";
import type { IHostDisplayProps } from "./host-display-base";
import { HostDisplayBase } from "./host-display-base";
import { TypePicker } from "./type-picker";
import type { TrainerGen } from "./trainer-picker";

const clearPokemon = 'clearpokemon';
const randomizePokemon = 'randomizepokemon';
const randomizeTrainers = 'randomizetrainers';
const setTrainerGenCommand = 'settrainergen';
const setFormes = 'setformes';
const withFormes = 'yes';
const withoutFormes = 'no';
const setTypeCommand = 'settype';
const randomTrainerGen = 'random';

const newerTrainerGen = 'newer';
const genOneTrainersGen = 'gen1';
const genTwoTrainersGen = 'gen2';
const genThreeTrainersGen = 'gen3';
const genFourTrainersGen = 'gen4';
const trainerGens: string[] = [newerTrainerGen, genOneTrainersGen, genTwoTrainersGen, genThreeTrainersGen, genFourTrainersGen];

export class RandomHostDisplay extends HostDisplayBase {
	componentId: string = 'random-display';
	currentType: string | undefined = undefined;
	currentTrainerGen: TrainerGen | undefined = undefined;
	formes: boolean = false;
	pokemonPickerIndex: number = -1;
	trainerPickerIndex: number = -1;

	allTypePicker: TypePicker;

	gifPokemonPickers!: PokemonPickerRandom[];
	iconPokemonPickers!: PokemonPickerRandom[];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IHostDisplayProps) {
		super(parentCommandPrefix, componentCommand, props, PokemonPickerRandom);

		this.allTypePicker = new TypePicker(this.commandPrefix, setTypeCommand, {
			noPickName: "Random",
			onClear: (index, dontRender) => this.clearAllPokemonTypes(dontRender),
			onPick: (index, type, dontRender) => this.setAllPokemonTypes(type, dontRender),
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

	toggleTrainerPicker(active: boolean): void {
		if (this.trainerPickerIndex !== -1) this.trainerPickers[this.trainerPickerIndex].active = active;
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

	clearAllTrainerGens(): void {
		if (this.currentTrainerGen === undefined) return;

		this.currentTrainerGen = undefined;

		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.parentClearTrainerGen();
		}

		this.props.reRender();
	}

	setAllTrainerGens(trainerGen: TrainerGen): void {
		if (this.currentTrainerGen === trainerGen) return;

		this.currentTrainerGen = trainerGen;

		for (const trainerPicker of this.trainerPickers) {
			trainerPicker.parentPickTrainerGen(trainerGen);
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
			if (!this.trainerPickers[i].pickRandom(true, this.currentTrainerGen === undefined ?
				Tools.sampleOne(trainerGens) as TrainerGen : this.currentTrainerGen, this.currentTrainers.map(x => x ? x.trainer : ""))) {
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
			const gen = targets[0].trim();
			const random = gen === randomTrainerGen;

			if (!random && !trainerGens.includes(gen)) return "'" + gen + "' is not a valid trainer type.";

			if (random) {
				this.clearAllTrainerGens();
			} else {
				this.setAllTrainerGens(gen as TrainerGen);
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

		html += Client.getPmSelfButton(this.commandPrefix + ", " + this.chooseBackgroundColorPickerCommand, "Background",
			this.currentPicker === 'background');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.choosePokemonPickerCommand, "Pokemon",
			this.currentPicker === 'pokemon');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.chooseTrainerPickerCommand, "Trainer",
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
			html += "Include formes: ";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setFormes + "," + withFormes, "Yes", this.formes);
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setFormes + "," + withoutFormes, "No", !this.formes);

			html += "<br /><br />";
			const allPokemon = this.pokemonPickerIndex === -1;
			const currentIndex = this.pokemonPickerIndex + 1;
			if (this.gifOrIcon === 'gif') {
				html += Client.getPmSelfButton(this.commandPrefix + ", " + clearPokemon, "None");

				for (let i = 1; i <= this.props.maxGifs; i++) {
					html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + randomizePokemon + ", " + i, "Random " + i);
				}

				html += "<br /><br />";
				html += "Pokemon: ";
				html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", 0", "All",
					allPokemon);

				for (let i = 1; i <= this.props.maxGifs; i++) {
					html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, currentIndex === i);
				}

				html += "<br /><br />";

				if (allPokemon) {
					html += this.allTypePicker.render();
				} else {
					html += this.gifPokemonPickers[this.pokemonPickerIndex].render();
				}
			} else {
				for (let i = 1; i <= this.props.maxIcons; i++) {
					if (i > 1) html += "&nbsp;";
					html += Client.getPmSelfButton(this.commandPrefix + ", " + randomizePokemon + ", " + i, "Random " + i);
				}

				html += "<br /><br />";
				html += "Pokemon:";
				html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", 0", "All",
					allPokemon);

				for (let i = 1; i <= this.props.maxIcons; i++) {
					html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.setPokemonPickerIndexCommand + ", " + i,
						"" + i, currentIndex === i);
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
				html += Client.getPmSelfButton(this.commandPrefix + ", " + randomizeTrainers + ", " + i, "Random " + i);
			}

			html += "<br /><br />";
			html += "Trainers:";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", 0", "All",
				allTrainers);

			for (let i = 1; i <= this.props.maxTrainers; i++) {
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.setTrainerPickerIndexCommand + ", " + i,
					"" + i, currentIndex === i);
			}

			html += "<br /><br />";
			if (allTrainers) {
				const newerTrainers = this.currentTrainerGen === 'newer';
				const genOneTrainers = this.currentTrainerGen === 'gen1';
				const genTwoTrainers = this.currentTrainerGen === 'gen2';
				const genThreeTrainers = this.currentTrainerGen === 'gen3';
				const genFourTrainers = this.currentTrainerGen === 'gen4';

				html += Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + randomTrainerGen,
					"Random", this.currentTrainerGen === undefined);
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + newerTrainerGen,
					"Newer gens", newerTrainers);
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genOneTrainersGen,
					"Gen 1", genOneTrainers);
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genTwoTrainersGen,
					"Gen 2", genTwoTrainers);
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genThreeTrainersGen,
					"Gen 3", genThreeTrainers);
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerGenCommand + ", " + genFourTrainersGen,
					"Gen 4", genFourTrainers);
			} else {
				html += this.trainerPickers[this.trainerPickerIndex].render();
			}
		}

		return html;
	}
}
