import type { ModelGeneration } from "../../types/dex";
import type { HtmlPageBase } from "../html-page-base";
import type { IPokemonPick, IPokemonPickerProps } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import { TypePicker } from "./type-picker";

const setTypeCommand = 'settype';

export class PokemonPickerRandom extends PokemonPickerBase {
	static pokemonByType: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static pokemonByTypeGifs: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static pokemonByTypeWithFormes: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static pokemonByTypeWithFormesGifs: KeyedDict<ModelGeneration, Dict<string[]>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	static types: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static typesGifs: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static typesWithFormes: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static typesWithFormesGifs: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static PokemonPickerRandomLoaded: boolean = false;

	componentId: string = 'pokemon-picker-random';
	currentType: string | undefined = undefined;
	replicationTargets: PokemonPickerRandom[] = [];

	typePicker: TypePicker;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		PokemonPickerRandom.loadData();

		this.typePicker = new TypePicker(htmlPage, this.commandPrefix, setTypeCommand, {
			noPickName: "Random",
			onClear: (index, dontRender) => this.clearType(dontRender),
			onPick: (index, type, dontRender) => this.pickType(type, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.components.push(this.typePicker);
	}

	static loadData(): void {
		if (this.PokemonPickerRandomLoaded) return;

		const generations = Object.keys(PokemonPickerBase.pokemonGens) as ModelGeneration[];
		for (const generation of generations) {
			for (const name of PokemonPickerBase.pokemonGens[generation]) {
				const pokemon = Dex.getExistingPokemon(name);
				if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'Custom') continue;

				for (const type of pokemon.types) {
					if (!(type in this.pokemonByTypeWithFormes[generation])) {
						this.pokemonByTypeWithFormes[generation][type] = [];
						this.typesWithFormes[generation].push(type);
					}
					this.pokemonByTypeWithFormes[generation][type].push(name);

					if (!pokemon.forme) {
						if (!(type in this.pokemonByType[generation])) {
							this.pokemonByType[generation][type] = [];
							this.types[generation].push(type);
						}
						this.pokemonByType[generation][type].push(name);
					}
				}
			}
		}


		const gifsGenerations = Object.keys(PokemonPickerBase.pokemonGifsGens) as ModelGeneration[];
		for (const generation of gifsGenerations) {
			for (const name of PokemonPickerBase.pokemonGifsGens[generation]) {
				const pokemon = Dex.getExistingPokemon(name);
				if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'Custom') continue;

				for (const type of pokemon.types) {
					if (!(type in this.pokemonByTypeWithFormesGifs[generation])) {
						this.pokemonByTypeWithFormesGifs[generation][type] = [];
						this.typesWithFormesGifs[generation].push(type);
					}
					this.pokemonByTypeWithFormesGifs[generation][type].push(name);

					if (!pokemon.forme) {
						if (!(type in this.pokemonByTypeGifs[generation])) {
							this.pokemonByTypeGifs[generation][type] = [];
							this.typesGifs[generation].push(type);
						}
						this.pokemonByTypeGifs[generation][type].push(name);
					}
				}
			}
		}

		this.PokemonPickerRandomLoaded = true;
	}

	clearType(dontRender?: boolean, replicatedFrom?: TypePicker): void {
		if (this.currentType === undefined) return;

		this.currentType = undefined;

		if (!replicatedFrom) this.props.onClearType(this.pickerIndex, dontRender);

		this.replicateClearType(replicatedFrom);
	}

	clearTypeParent(): void {
		this.typePicker.clear(true);
		this.clearType(true);
	}

	replicateClearType(replicatedFrom: TypePicker | undefined): void {
		for (const target of this.replicationTargets) {
			if (!replicatedFrom || target.typePicker !== replicatedFrom) target.typePicker.clear(true, this.typePicker);
		}
	}

	pickType(pick: string, dontRender?: boolean, replicatedFrom?: TypePicker ): void {
		if (this.currentType === pick) return;

		this.currentType = pick;

		if (!replicatedFrom) this.props.onPickType(this.pickerIndex, pick, dontRender);

		this.replicatePickType(pick, replicatedFrom);
	}

	pickTypeParent(type: string): void {
		this.typePicker.pick(type, true);
		this.pickType(type, true);
	}

	replicatePickType(pick: string, replicatedFrom: TypePicker | undefined): void {
		for (const target of this.replicationTargets) {
			if (!replicatedFrom || target.typePicker !== replicatedFrom) target.typePicker.pick(pick, true, this.typePicker);
		}
	}

	pickRandom(dontRender?: boolean, withFormes?: boolean, parentPokemon?: string[]): boolean {
		let types: string[];
		let pokemon: Dict<string[]>;
		if (this.props.gif) {
			if (withFormes) {
				types = PokemonPickerRandom.typesWithFormesGifs[this.generation];
				pokemon = PokemonPickerRandom.pokemonByTypeWithFormesGifs[this.generation];
			} else {
				types = PokemonPickerRandom.typesGifs[this.generation];
				pokemon = PokemonPickerRandom.pokemonByTypeGifs[this.generation];
			}
		} else {
			if (withFormes) {
				types = PokemonPickerRandom.typesWithFormes[this.generation];
				pokemon = PokemonPickerRandom.pokemonByTypeWithFormes[this.generation];
			} else {
				types = PokemonPickerRandom.types[this.generation];
				pokemon = PokemonPickerRandom.pokemonByType[this.generation];
			}
		}

		const type = this.currentType || Tools.sampleOne(types);
		if (!(type in pokemon) || !pokemon[type].length) return false;

		const list = Tools.shuffle(pokemon[type]);

		let pick = list.shift()!;
		while (pick === this.currentPicks[0] || (parentPokemon && parentPokemon.includes(pick))) {
			if (!list.length) return false;
			pick = list.shift()!;
		}

		this.pick(pick, dontRender);
		return true;
	}

	setPokemonAttributes(pick: IPokemonPick, textInput?: boolean): void {
		this.parentPickGeneration(pick.generation);

		if (!this.isValidChoice(pick.pokemon)) return;

		this.parentPickShininess(pick.shiny ? true : false);

		if (!textInput) {
			this.currentPicks = [];
			this.parentPick(pick.pokemon);
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

		html += this.typePicker.render();

		return html;
	}
}