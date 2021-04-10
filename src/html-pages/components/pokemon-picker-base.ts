import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface IPokemonPick {
	pokemon: string;
	shiny?: boolean;
}

export interface IPokemonPickerProps extends IPickerProps<IPokemonPick> {
	gif: boolean;
	maxGifs: number;
	maxIcons: number;
	onPickLetter: (pickerIndex: number, letter: string, dontRender: boolean | undefined) => void;
	onPickShininess: (pickerIndex: number, shininess: boolean, dontRender: boolean | undefined) => void;
	onClearType: (pickerIndex: number, dontRender: boolean | undefined) => void;
	onPickType: (pickerIndex: number, type: string, dontRender: boolean | undefined) => void;
}

const setShininess = 'setshininess';
const setShiny = "shiny";
const setNotShiny = "notshiny";

export abstract class PokemonPickerBase extends PickerBase<IPokemonPick, IPokemonPickerProps> {
	static pokemon: string[] = [];
	static pokemonGifs: string[] = [];
	static PokemonPickerBaseLoaded: boolean = false;

	replicationTargets: PokemonPickerBase[] = [];
	shininess: boolean = false;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		PokemonPickerBase.loadData();

		for (const pokemon of PokemonPickerBase.pokemon) {
			this.choices[pokemon] = {pokemon};
		}

		this.renderChoices();
	}

	static loadData(): void {
		if (this.PokemonPickerBaseLoaded) return;

		for (const key of Dex.getData().pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(key);
			if (this.pokemon.includes(pokemon.name) || (pokemon.forme && pokemon.baseSpecies === 'Unown')) continue;

			this.pokemon.push(pokemon.name);
			if (Dex.hasModelData(pokemon)) this.pokemonGifs.push(pokemon.name);

			if (pokemon.name === 'Unown') continue;

			if (pokemon.cosmeticFormes) {
				for (const name of pokemon.cosmeticFormes) {
					const forme = Dex.getExistingPokemon(name);
					this.pokemon.push(forme.name);
					if (Dex.hasModelData(forme)) this.pokemonGifs.push(forme.name);
				}
			}

			if (pokemon.otherFormes) {
				for (const name of pokemon.otherFormes) {
					const forme = Dex.getExistingPokemon(name);
					this.pokemon.push(forme.name);
					if (Dex.hasModelData(forme)) this.pokemonGifs.push(forme.name);
				}
			}
		}

		this.PokemonPickerBaseLoaded = true;
	}

	getChoiceButtonHtml(choice: IPokemonPick): string {
		return choice.pokemon;
	}

	reset(): void {
		this.clear(true);
		this.pickShininess(false, true);
	}

	onPick(pick: string, dontRender?: boolean): void {
		this.props.onPick(this.pickerIndex, {pokemon: pick, shiny: this.shininess}, dontRender);
	}

	pickShininess(shininess: boolean, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (this.shininess === shininess) return;

		this.shininess = shininess;

		if (!replicatedFrom) this.props.onPickShininess(this.pickerIndex, shininess, dontRender);

		this.replicatePickShininess(shininess, replicatedFrom);
	}

	parentPickShininess(shiny: boolean): void {
		this.pickShininess(shiny, true);
	}

	replicatePickShininess(shininess: boolean, replicatedFrom: PokemonPickerBase | undefined): void {
		for (const target of this.replicationTargets) {
			if (!replicatedFrom || target !== replicatedFrom) target.pickShininess(shininess, true, this);
		}
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === setShininess) {
			const target = targets[0].trim();
			if (target === setShiny) {
				this.pickShininess(true);
			} else if (target === setNotShiny) {
				this.pickShininess(false);
			} else {
				return "'" + target + "' is not a valid shininess option.";
			}
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	renderShininessOptions(): string {
		let html = "";
		if (this.props.gif) {
			html = "Shiny: ";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setShininess + "," + setShiny, "Yes", this.shininess);
			html += "&nbsp;";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + setShininess + "," + setNotShiny, "No", !this.shininess);
		}

		return html;
	}
}