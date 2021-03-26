import type { PokemonChoices } from "../game-host-control-panel";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";
import type { IPokemonPick, IPokemonPickerProps } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import { PokemonTextInput } from "./pokemon-text-input";

const chooseInputView = 'chooseinput';
const chooseLetterView = 'chooseletter';
const pokemonInputCommand = 'pokemoninput';
const pagesLabel = "Pokemon";
const setLetterCommand = 'setletter';
const pokemonListCommand = 'pokemonlist';

export class PokemonPickerManual extends PokemonPickerBase {
	static letters: string[] = [];
	static pokemonByLetter: Dict<string[]> = {};
	static PokemonPickerManualLoaded: boolean = false;

	currentView: 'input' | 'letter' = 'input';
	componentId: string = 'pokemon-picker-letter';
	letterView: string | undefined = undefined;
	letterPaginations: Dict<Pagination> = {};
	letterElements: Dict<IPageElement> = {};
	pokemonTextInput: PokemonTextInput;
	replicationTargets: PokemonPickerManual[] = [];

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		PokemonPickerManual.loadData();

		this.pokemonTextInput = new PokemonTextInput(this.commandPrefix, pokemonInputCommand, {
			gif: props.gif,
			maxPokemon: 1,
			minPokemon: 1,
			placeholder: "Enter Pokemon #" + (this.pickerIndex + 1),
			submitText: "Update",
			onClear: () => this.clearPokemonInput(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.submitPokemonInput(output),
			reRender: () => this.props.reRender(),
		});
		this.components.push(this.pokemonTextInput);

		for (const letter of PokemonPickerManual.letters) {
			this.letterElements[letter] = {html: this.renderLetterElement(letter), selected: false};

			this.letterPaginations[letter] = new Pagination(this.commandPrefix, pokemonListCommand, {
				elements: PokemonPickerManual.pokemonByLetter[letter].map(x => this.choiceElements[x]),
				elementsPerRow: 6,
				rowsPerPage: 6,
				pagesLabel,
				onSelectPage: () => this.props.reRender(),
				reRender: () => this.props.reRender(),
			});
			this.letterPaginations[letter].active = false;

			this.components.push(this.letterPaginations[letter]);
		}
	}

	static loadData(): void {
		if (this.PokemonPickerManualLoaded) return;

		const letters = Tools.letters.toUpperCase().split("");

		for (const name of PokemonPickerBase.pokemon) {
			const letter = name.charAt(0).toUpperCase();
			if (!letters.includes(letter)) continue;

			if (!(letter in this.pokemonByLetter)) this.pokemonByLetter[letter] = [];
			this.pokemonByLetter[letter].push(name);
		}

		for (const letter in this.pokemonByLetter) {
			this.pokemonByLetter[letter].sort();
		}

		this.letters = letters.filter(x => x in this.pokemonByLetter);

		this.PokemonPickerManualLoaded = true;
	}

	chooseInputView(): void {
		if (this.currentView === 'input') return;

		this.currentView = 'input';
		if (this.letterView) this.letterPaginations[this.letterView].active = false;

		this.props.reRender();
	}

	chooseLetterView(): void {
		if (this.currentView === 'letter') return;

		this.currentView = 'letter';

		this.props.reRender();
	}

	clearPokemonInput(): void {
		this.reset();

		this.props.reRender();
	}

	submitPokemonInput(output: PokemonChoices): void {
		this.reset();
		this.setRandomizedPokemon(output[0]!);

		this.props.reRender();
	}

	renderLetterElement(letter: string): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setLetterCommand + "," + letter, letter,
			this.letterView === letter);
	}

	onClear(dontRender?: boolean): void {
		this.pokemonTextInput.parentClearInput();

		const previousLetter = this.letterView;
		this.letterView = undefined;

		if (previousLetter) {
			this.letterElements[previousLetter].html = this.renderLetterElement(previousLetter);
			this.letterElements[previousLetter].selected = false;
			this.letterPaginations[previousLetter].active = false;
		}

		super.onClear(dontRender);
	}

	pickLetter(letter: string, dontRender?: boolean, replicatedFrom?: PokemonPickerManual): void {
		if (this.letterView === letter) return;

		const previousLetter = this.letterView;
		this.letterView = letter;

		this.letterElements[letter].html = this.renderLetterElement(letter);
		this.letterElements[letter].selected = true;
		this.letterPaginations[letter].active = true;

		if (previousLetter) {
			this.letterElements[previousLetter].html = this.renderLetterElement(previousLetter);
			this.letterElements[previousLetter].selected = false;
			this.letterPaginations[previousLetter].active = false;
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

	setRandomizedPokemon(pokemon: IPokemonPick): void {
		this.pokemonTextInput.parentSetInput((pokemon.shiny ? "shiny " : "") + pokemon.pokemon);

		const letter = pokemon.pokemon.charAt(0).toUpperCase();
		this.parentPickLetter(letter);
		this.parentPickShininess(pokemon.shiny ? true : false);
		this.parentPick(pokemon.pokemon);

		this.letterPaginations[letter].autoSelectPage();
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
			if (!(letter in this.letterElements)) {
				return "'" + letter + "' is not valid letter.";
			}

			this.pickLetter(letter);
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		let html = this.renderShininessOptions();
		if (html) html += "<br /><br />";

		const inputView = this.currentView === 'input';

		html += "<b>Input type</b>:";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseInputView, "Manual", inputView);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseLetterView, "By letter", !inputView);
		html += "<br />";

		if (inputView) {
			html += "<br />";
			html += this.pokemonTextInput.render();
		} else {
			html += this.noPickElement.html;

			for (const letter in this.letterElements) {
				html += this.letterElements[letter].html;
			}

			if (this.letterView) {
				html += "<br /><br />";
				html += this.letterPaginations[this.letterView].render();
			}
		}

		return html;
	}
}