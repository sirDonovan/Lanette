import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";

export interface IPokemonPickerProps {
	currentPokemon: string | undefined;
	gif: boolean;
	maxGifs: number;
	maxIcons: number;
	pickerIndex?: number;
	onChooseLetterView: (pickerIndex: number, letter: string | undefined, dontRender?: boolean) => void;
	onClearPokemon: (pickerIndex: number, dontRender?: boolean) => void;
	onSelectPokemon: (pickerIndex: number, selectedPokemon: string, shiny: boolean, dontRender?: boolean) => void;
	onUpdateView: () => void;
}

const setPokemonCommand = 'setpokemon';
const setShininess = 'setshininess';
const setShiny = "shiny";
const setNotShiny = "notshiny";
const noPokemon = "None";

export abstract class PokemonPickerBase extends ComponentBase {
	static pokemon: string[] = [];
	static PokemonPickerBaseLoaded: boolean = false;

	currentPokemon: string | undefined;
	pickerIndex: number;
	pokemonElements: Dict<IPageElement> = {};
	noPokemonElement: IPageElement = {html: ""};
	shinyPokemon: boolean = false;

	props: IPokemonPickerProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand);

		PokemonPickerBase.loadData();

		this.currentPokemon = props.currentPokemon || undefined;
		this.pickerIndex = props.pickerIndex || 0;

		this.noPokemonElement.html = this.renderNoPokemonElement();

		for (const pokemon of PokemonPickerBase.pokemon) {
			this.pokemonElements[pokemon] = {html: this.renderPokemonElement(pokemon), selected: this.currentPokemon === pokemon};
		}

		this.props = props;
	}

	static loadData(): void {
		if (this.PokemonPickerBaseLoaded) return;

		for (const key of Dex.getData().pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(key);
			if (Dex.hasGifData(pokemon)) this.pokemon.push(pokemon.name);
		}

		this.PokemonPickerBaseLoaded = true;
	}

	renderPokemonElement(name: string): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setPokemonCommand + "," + name, name,
			this.currentPokemon === name);
	}

	renderNoPokemonElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setPokemonCommand + ", " + noPokemon, "None",
			!this.currentPokemon);
	}

	reset(): void {
		this.clearPokemon(true);
	}

	clearPokemon(dontRender?: boolean, replicating?: boolean): void {
		if (this.currentPokemon === undefined) return;

		const previousPokemon = this.currentPokemon;
		this.currentPokemon = undefined;

		this.pokemonElements[previousPokemon].html = this.renderPokemonElement(previousPokemon);
		this.pokemonElements[previousPokemon].selected = false;
		this.noPokemonElement.html = this.renderNoPokemonElement();
		this.noPokemonElement.selected = true;

		if (!replicating) this.props.onClearPokemon(this.pickerIndex, dontRender);
	}

	selectPokemon(pokemon: string, dontRender?: boolean, replicating?: boolean): void {
		if (this.currentPokemon === pokemon) return;

		const previousPokemon = this.currentPokemon;
		this.currentPokemon = pokemon;
		if (previousPokemon) {
			this.pokemonElements[previousPokemon].html = this.renderPokemonElement(previousPokemon);
			this.pokemonElements[previousPokemon].selected = false;
		} else {
			this.noPokemonElement.html = this.renderNoPokemonElement();
			this.noPokemonElement.selected = false;
		}
		this.pokemonElements[this.currentPokemon].html = this.renderPokemonElement(this.currentPokemon);
		this.pokemonElements[this.currentPokemon].selected = true;

		this.onSelectPokemon(dontRender, replicating);
	}

	setShininess(shiny: boolean): void {
		if (this.shinyPokemon === shiny) return;

		this.shinyPokemon = shiny;

		this.onSelectPokemon();
	}

	onSelectPokemon(dontRender?: boolean, replicating?: boolean): void {
		if (!replicating) {
			if (this.currentPokemon) {
				this.props.onSelectPokemon(this.pickerIndex, this.currentPokemon, this.shinyPokemon, dontRender);
			} else if (!dontRender) {
				this.props.onUpdateView();
			}
		}
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === setShininess) {
			const target = targets[0].trim();
			if (target === setShiny) {
				this.setShininess(true);
			} else if (target === setNotShiny) {
				this.setShininess(false);
			} else {
				return "'" + target + "' is not a valid shininess option.";
			}
		} else if (cmd === setPokemonCommand) {
			const pokemon = targets[0].trim();
			const cleared = pokemon === noPokemon;
			if (!cleared && !(pokemon in this.pokemonElements)) {
				return "'" + pokemon + "' is not a valid Pokemon.";
			}

			if (cleared) {
				this.clearPokemon();
			} else {
				this.selectPokemon(pokemon);
			}
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		let html = "";
		if (this.props.gif) {
			html = "Shiny: ";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setShininess + "," + setShiny, "Yes", this.shinyPokemon);
			html += "&nbsp;";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setShininess + "," + setNotShiny, "No", !this.shinyPokemon);
		}

		return html;
	}
}