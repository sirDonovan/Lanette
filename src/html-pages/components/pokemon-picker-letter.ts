import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";
import type { IPokemonPickerProps } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";

const pagesLabel = "Pokemon";
const setLetterCommand = 'setletter';
const pokemonListCommand = 'pokemonlist';

export class PokemonPickerLetter extends PokemonPickerBase {
	static letters: string[] = [];
	static pokemonByLetter: Dict<string[]> = {};
	static PokemonPickerLetterLoaded: boolean = false;

	letterView: string | undefined = undefined;
	letterPaginations: Dict<Pagination> = {};
	letterElements: Dict<IPageElement> = {};

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		PokemonPickerLetter.loadData();

		for (const letter of PokemonPickerLetter.letters) {
			this.letterElements[letter] = {html: this.renderLetterElement(letter), selected: false};

			this.letterPaginations[letter] = new Pagination(this.commandPrefix, pokemonListCommand, {
				elements: PokemonPickerLetter.pokemonByLetter[letter].map(x => this.pokemonElements[x]),
				elementsPerRow: 6,
				rowsPerPage: 6,
				pagesLabel,
				onSelectPage: () => this.props.onUpdateView(),
			});
			this.letterPaginations[letter].active = false;

			this.components.push(this.letterPaginations[letter]);
		}
	}

	static loadData(): void {
		if (this.PokemonPickerLetterLoaded) return;

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

		this.PokemonPickerLetterLoaded = true;
	}

	renderLetterElement(letter: string): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setLetterCommand + "," + letter, letter,
			this.letterView === letter);
	}

	reset(): void {
		super.reset();
		this.chooseLetterView(undefined, true);
	}

	chooseLetterView(letter: string | undefined, dontRender?: boolean, replicating?: boolean): void {
		if (this.letterView === letter) return;

		const previousLetter = this.letterView;
		this.letterView = letter;

		if (letter) {
			this.letterElements[letter].html = this.renderLetterElement(letter);
			this.letterElements[letter].selected = true;
			this.letterPaginations[letter].active = true;
		}

		if (previousLetter) {
			this.letterElements[previousLetter].html = this.renderLetterElement(previousLetter);
			this.letterElements[previousLetter].selected = false;
			this.letterPaginations[previousLetter].active = false;
		}

		if (!replicating) this.props.onChooseLetterView(this.pickerIndex, letter, dontRender);
	}

	setRandomizedPokemon(pokemon: string): void {
		const letter = pokemon.charAt(0).toUpperCase();
		this.chooseLetterView(letter, true);
		this.selectPokemon(pokemon, true);
		this.letterPaginations[letter].autoSelectPage();
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === setLetterCommand) {
			const letter = targets[0].trim().charAt(0).toUpperCase();
			if (!(letter in this.letterElements)) {
				return "'" + letter + "' is not valid letter.";
			}

			this.chooseLetterView(letter);
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		let html = super.render();
		if (html) html += "<br /><br />";

		html += this.noPokemonElement.html;
		for (const letter in this.letterElements) {
			html += this.letterElements[letter].html;
		}

		if (this.letterView) {
			html += "<br /><br />";
			html += this.letterPaginations[this.letterView].render();
		}

		return html;
	}
}