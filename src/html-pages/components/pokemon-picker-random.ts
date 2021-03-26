import type { IPokemonPickerProps } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import { TypePicker } from "./type-picker";

const setTypeCommand = 'settype';

export class PokemonPickerRandom extends PokemonPickerBase {
	static pokemonByType: Dict<string[]> = {};
	static pokemonByTypeGifs: Dict<string[]> = {};
	static pokemonByTypeWithFormes: Dict<string[]> = {};
	static pokemonByTypeWithFormesGifs: Dict<string[]> = {};
	static types: string[] = [];
	static typesGifs: string[] = [];
	static typesWithFormes: string[] = [];
	static typesWithFormesGifs: string[] = [];
	static PokemonPickerRandomLoaded: boolean = false;

	componentId: string = 'pokemon-picker-random';
	currentType: string | undefined = undefined;
	replicationTargets: PokemonPickerRandom[] = [];

	typePicker: TypePicker;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		PokemonPickerRandom.loadData();

		this.typePicker = new TypePicker(this.commandPrefix, setTypeCommand, {
			noPickName: "Random",
			onClear: (index, dontRender) => this.clearType(dontRender),
			onPick: (index, type, dontRender) => this.pickType(type, dontRender),
			reRender: () => this.props.reRender(),
		});

		this.components = [this.typePicker];
	}

	static loadData(): void {
		if (this.PokemonPickerRandomLoaded) return;

		for (const name of PokemonPickerBase.pokemon) {
			const pokemon = Dex.getExistingPokemon(name);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'Custom') continue;

			for (const type of pokemon.types) {
				if (!(type in this.pokemonByTypeWithFormes)) {
					this.pokemonByTypeWithFormes[type] = [];
					this.typesWithFormes.push(type);
				}
				this.pokemonByTypeWithFormes[type].push(name);

				if (!pokemon.forme) {
					if (!(type in this.pokemonByType)) {
						this.pokemonByType[type] = [];
						this.types.push(type);
					}
					this.pokemonByType[type].push(name);
				}
			}
		}


		for (const name of PokemonPickerBase.pokemonGifs) {
			const pokemon = Dex.getExistingPokemon(name);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'Custom') continue;

			for (const type of pokemon.types) {
				if (!(type in this.pokemonByTypeWithFormesGifs)) {
					this.pokemonByTypeWithFormesGifs[type] = [];
					this.typesWithFormesGifs.push(type);
				}
				this.pokemonByTypeWithFormesGifs[type].push(name);

				if (!pokemon.forme) {
					if (!(type in this.pokemonByTypeGifs)) {
						this.pokemonByTypeGifs[type] = [];
						this.typesGifs.push(type);
					}
					this.pokemonByTypeGifs[type].push(name);
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
				types = PokemonPickerRandom.typesWithFormesGifs;
				pokemon = PokemonPickerRandom.pokemonByTypeWithFormesGifs;
			} else {
				types = PokemonPickerRandom.typesGifs;
				pokemon = PokemonPickerRandom.pokemonByTypeGifs;
			}
		} else {
			if (withFormes) {
				types = PokemonPickerRandom.typesWithFormes;
				pokemon = PokemonPickerRandom.pokemonByTypeWithFormes;
			} else {
				types = PokemonPickerRandom.types;
				pokemon = PokemonPickerRandom.pokemonByType;
			}
		}

		const type = this.currentType || Tools.sampleOne(types);
		const list = Tools.shuffle(pokemon[type]);

		let pick = list.shift()!;
		while (pick === this.currentPick || (parentPokemon && parentPokemon.includes(pick))) {
			if (!list.length) return false;
			pick = list.shift()!;
		}

		this.pick(pick, dontRender);
		return true;
	}

	render(): string {
		let html = this.renderShininessOptions();
		if (html) html += "<br /><br />";

		html += this.typePicker.render();

		return html;
	}
}