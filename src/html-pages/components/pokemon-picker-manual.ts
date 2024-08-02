import type { ModelGeneration } from "../../types/dex";
import type { HtmlPageBase } from "../html-page-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";
import type { IPokemonPick, IPokemonPickerProps, PokemonChoices } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import { PokemonTextInput } from "./pokemon-text-input";

const chooseInputView = 'chooseinput';
const chooseLetterView = 'chooseletter';
const pokemonInputCommand = 'pokemoninput';
const pagesLabel = "Pokemon";
const setLetterCommand = 'setletter';
const pokemonListCommand = 'pokemonlist';

export class PokemonPickerManual extends PokemonPickerBase {
	static letters: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static lettersGifs: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static pokemonByLetter: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static pokemonByLetterGifs: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static PokemonPickerManualLoaded: boolean = false;

	currentView: 'input' | 'letter' = 'input';
	componentId: string = 'pokemon-picker-letter';
	letterViews: KeyedDict<ModelGeneration, string | undefined> = {
		'rb': undefined,
		'gs': undefined,
		'rs': undefined,
		'dp': undefined,
		'bw': undefined,
		'xy': undefined,
	};
	letterPaginations: KeyedDict<ModelGeneration, Dict<Pagination>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	letterElements: KeyedDict<ModelGeneration, Dict<IPageElement>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	pokemonTextInputs: KeyedDict<ModelGeneration, PokemonTextInput>;
	replicationTargets: PokemonPickerManual[] = [];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		PokemonPickerManual.loadData();

		const pokemonTextInputs: Dict<PokemonTextInput> = {};
		const lists = props.gif ? PokemonPickerBase.pokemonGifsGens : PokemonPickerBase.pokemonGens;
		for (const generation of Dex.getModelGenerations()) {
			pokemonTextInputs[generation] = new PokemonTextInput(htmlPage, this.commandPrefix, pokemonInputCommand, {
				gif: props.gif,
				pokemonList: lists[generation],
				maxPokemon: 1,
				minPokemon: 1,
				name: "Gen " + generation + " Pokemon",
				placeholder: "Enter Pokemon #" + (this.pickerIndex + 1),
				submitText: "Update",
				onClear: () => this.clearPokemonInput(),
				onSubmit: (output) => this.submitPokemonInput(output),
				readonly: this.props.readonly,
				reRender: () => this.props.reRender(),
			});
			pokemonTextInputs[generation].active = this.generation === generation;

			this.components.push(pokemonTextInputs[generation]);

			let letters: string[];
			let pokemonByLetter: Dict<string[]>;
			if (props.gif) {
				letters = PokemonPickerManual.lettersGifs[generation];
				pokemonByLetter = PokemonPickerManual.pokemonByLetterGifs[generation];
			} else {
				letters = PokemonPickerManual.letters[generation];
				pokemonByLetter = PokemonPickerManual.pokemonByLetter[generation];
			}

			for (const letter of letters) {
				this.letterElements[generation][letter] = {html: this.renderLetterElement(letter), selected: false};

				this.letterPaginations[generation][letter] = new Pagination(htmlPage, this.commandPrefix, pokemonListCommand, {
					elements: pokemonByLetter[letter].map(x => this.choiceElements[x]),
					elementsPerRow: 6,
					rowsPerPage: 6,
					pagesLabel,
					onSelectPage: () => this.props.reRender(),
					readonly: this.props.readonly,
					reRender: () => this.props.reRender(),
				});
				this.letterPaginations[generation][letter].active = false;

				this.components.push(this.letterPaginations[generation][letter]);
			}
		}

		this.pokemonTextInputs = pokemonTextInputs as KeyedDict<ModelGeneration, PokemonTextInput>;
	}

	static loadData(): void {
		if (this.PokemonPickerManualLoaded) return;

		const letters = Tools.letters.toUpperCase().split("");

		const generations = Object.keys(PokemonPickerBase.pokemonGens) as ModelGeneration[];
		for (const generation of generations) {
			for (const name of PokemonPickerBase.pokemonGens[generation]) {
				const letter = name.charAt(0).toUpperCase();
				if (!letters.includes(letter)) continue;

				if (!(letter in this.pokemonByLetter[generation])) this.pokemonByLetter[generation][letter] = [];
				this.pokemonByLetter[generation][letter].push(name);
			}

			for (const letter in this.pokemonByLetter[generation]) {
				this.pokemonByLetter[generation][letter].sort();
			}

			this.letters[generation] = letters.filter(x => x in this.pokemonByLetter[generation]);
		}

		const gifsGenerations = Object.keys(PokemonPickerBase.pokemonGifsGens) as ModelGeneration[];
		for (const generation of gifsGenerations) {
			for (const name of PokemonPickerBase.pokemonGifsGens[generation]) {
				const letter = name.charAt(0).toUpperCase();
				if (!letters.includes(letter)) continue;

				if (!(letter in this.pokemonByLetterGifs[generation])) this.pokemonByLetterGifs[generation][letter] = [];
				this.pokemonByLetterGifs[generation][letter].push(name);
			}

			for (const letter in this.pokemonByLetterGifs[generation]) {
				this.pokemonByLetterGifs[generation][letter].sort();
			}

			this.lettersGifs[generation] = letters.filter(x => x in this.pokemonByLetterGifs[generation]);
		}

		this.PokemonPickerManualLoaded = true;
	}

	chooseInputView(): void {
		if (this.currentView === 'input') return;

		this.currentView = 'input';
		if (this.letterViews[this.generation]) this.letterPaginations[this.generation][this.letterViews[this.generation]!].active = false;

		this.props.reRender();
	}

	chooseLetterView(): void {
		if (this.currentView === 'letter') return;

		this.currentView = 'letter';

		this.props.reRender();
	}

	getPokemonInput(): string | undefined {
		if (this.currentView === 'letter') return;

		return this.pokemonTextInputs[this.generation].currentInput;
	}

	clearPokemonInput(): void {
		this.reset();

		this.props.reRender();
	}

	submitPokemonInput(output: PokemonChoices): void {
		this.setPokemonAttributes(output[0]!, true);

		this.pick(output[0]!.pokemon);
	}

	renderLetterElement(letter: string): string {
		return this.getQuietPmButton(this.commandPrefix + ", " + setLetterCommand + "," + letter, letter,
			{selectedAndDisabled: this.letterViews[this.generation] === letter});
	}

	onClear(dontRender?: boolean, replicatedFrom?: PokemonPickerManual): void {
		this.pokemonTextInputs[this.generation].parentClearInput();

		const previousLetter = this.letterViews[this.generation];
		this.letterViews[this.generation] = undefined;

		if (previousLetter) {
			this.letterElements[this.generation][previousLetter].html = this.renderLetterElement(previousLetter);
			this.letterElements[this.generation][previousLetter].selected = false;
			this.letterPaginations[this.generation][previousLetter].active = false;
		}

		super.onClear(dontRender, replicatedFrom);
	}

	onPick(pick: string, dontRender?: boolean, replicatedFrom?: PokemonPickerManual): void {
		this.autoSetPokemonTextInput();

		super.onPick(pick, dontRender, replicatedFrom);
	}

	pickLetter(letter: string, dontRender?: boolean, replicatedFrom?: PokemonPickerManual): void {
		if (this.letterViews[this.generation] === letter) return;

		const previousLetter = this.letterViews[this.generation];
		this.letterViews[this.generation] = letter;

		this.letterElements[this.generation][letter].html = this.renderLetterElement(letter);
		this.letterElements[this.generation][letter].selected = true;
		this.letterPaginations[this.generation][letter].active = true;

		if (previousLetter) {
			this.letterElements[this.generation][previousLetter].html = this.renderLetterElement(previousLetter);
			this.letterElements[this.generation][previousLetter].selected = false;
			this.letterPaginations[this.generation][previousLetter].active = false;
		}

		if (!replicatedFrom) this.props.onPickLetter(this.pickerIndex, letter, dontRender);

		this.replicatePickLetter(letter, replicatedFrom);
	}

	parentPickLetter(letter: string): void {
		this.pickLetter(letter, true);
	}

	replicatePickLetter(letter: string, replicatedFrom: PokemonPickerManual | undefined): void {
		for (const target of this.replicationTargets) {
			if (!replicatedFrom || target !== replicatedFrom) target.pickLetter(letter, true, this);
		}
	}

	onPickShininess(shininess: boolean, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		this.autoSetPokemonTextInput();

		super.onPickShininess(shininess, dontRender, replicatedFrom);
	}

	onPickGeneration(previousGeneration: ModelGeneration, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		this.pokemonTextInputs[previousGeneration].active = false;
		this.pokemonTextInputs[this.generation].active = true;

		if (this.letterViews[previousGeneration]) {
			const previousLetter = this.letterViews[previousGeneration];
			this.letterPaginations[previousGeneration][previousLetter].active = false;

			if (previousLetter in this.letterPaginations[this.generation]) {
				this.parentPickLetter(previousLetter);
				if (this.currentPicks.length) this.letterPaginations[this.generation][previousLetter].autoSelectPage();
			} else {
				this.choices = this.choicesByGeneration[previousGeneration];
				this.parentClear();
				this.choices = this.choicesByGeneration[this.generation];

				this.parentPickLetter(Object.keys(this.letterPaginations[this.generation])[0]);
			}
		}

		this.autoSetPokemonTextInput();

		super.onPickGeneration(previousGeneration, dontRender, replicatedFrom);
	}

	autoSetPokemonTextInput(): void {
		if (!this.currentPicks.length) return;

		this.pokemonTextInputs[this.generation].setModelGeneration(this.generation);
		this.pokemonTextInputs[this.generation].setShiny(this.shininess);
		this.pokemonTextInputs[this.generation].onSubmit(this.currentPicks[0]);
	}

	setPokemonAttributes(pick: IPokemonPick, textInput?: boolean): void {
		this.parentPickGeneration(pick.generation);

		if (!this.isValidChoice(pick.pokemon)) return;

		this.parentPickShininess(pick.shiny ? true : false);

		const letter = pick.pokemon.charAt(0).toUpperCase();
		this.parentPickLetter(letter);
		if (!textInput) {
			this.currentPicks = [];
			this.parentPick(pick.pokemon);
			this.autoSetPokemonTextInput();
		}

		this.letterPaginations[this.generation][letter].autoSelectPage();
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === chooseInputView) {
			this.chooseInputView();
		} else if (cmd === chooseLetterView) {
			this.chooseLetterView();
		} else if (cmd === setLetterCommand) {
			const letter = targets[0].trim().charAt(0).toUpperCase();
			if (!(letter in this.letterElements[this.generation])) {
				return "'" + letter + "' is not valid letter.";
			}

			this.pickLetter(letter);
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		let html = this.renderModelGenerationOptions();
		const shininessOptions = this.renderShininessOptions();
		if (shininessOptions) {
			if (html) html += "<br /><br />";
			html += shininessOptions;
		}
		if (html) html += "<br /><br />";

		const inputView = this.currentView === 'input';

		html += "<b>Input type</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseInputView, "Manual",
			{selectedAndDisabled: inputView});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseLetterView, "By letter",
			{selectedAndDisabled: !inputView});
		html += "<br />";

		if (inputView) {
			html += "<br />";
			html += this.pokemonTextInputs[this.generation].render();
		} else {
			html += this.noPickElement.html;

			for (const letter in this.letterElements[this.generation]) {
				html += this.letterElements[this.generation][letter].html;
			}

			if (this.letterViews[this.generation]) {
				html += "<br /><br />";
				html += this.letterPaginations[this.generation][this.letterViews[this.generation]!].render();
			}
		}

		return html;
	}
}