import type { IPokemonPickerProps } from "./pokemon-picker-base";
import { PokemonPickerBase } from "./pokemon-picker-base";
import { TypePicker } from "./type-picker";

const setTypeCommand = 'settype';

export class PokemonPickerRandom extends PokemonPickerBase {
	static pokemonByType: Dict<string[]> = {};
	static pokemonByTypeWithFormes: Dict<string[]> = {};
	static types: string[] = [];
	static typesWithFormes: string[] = [];
	static PokemonPickerRandomLoaded: boolean = false;

	currentType: string | undefined = undefined;
	typePicker: TypePicker;

	constructor(parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		PokemonPickerRandom.loadData();

		this.typePicker = new TypePicker(this.commandPrefix, setTypeCommand, {
			currentType: undefined,
			noTypeName: "Random",
			onClearType: () => this.clearType(),
			onSelectType: (index, type) => this.setType(type),
			onUpdateView: () => this.props.onUpdateView(),
		});

		this.components = [this.typePicker];
	}

	static loadData(): void {
		if (this.PokemonPickerRandomLoaded) return;

		const typesWithFormes: string[] = [];
		const types: string[] = [];

		for (const name of PokemonPickerBase.pokemon) {
			const pokemon = Dex.getExistingPokemon(name);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'Custom') continue;

			for (const type of pokemon.types) {
				if (!(type in this.pokemonByTypeWithFormes)) {
					this.pokemonByTypeWithFormes[type] = [];
					typesWithFormes.push(type);
				}
				this.pokemonByTypeWithFormes[type].push(name);

				if (!pokemon.forme) {
					if (!(type in this.pokemonByType)) {
						this.pokemonByType[type] = [];
						types.push(type);
					}
					this.pokemonByType[type].push(name);
				}
			}
		}

		this.types = types;
		this.typesWithFormes = typesWithFormes;

		this.PokemonPickerRandomLoaded = true;
	}

	clearType(dontRender?: boolean): void {
		if (this.currentType === undefined) return;

		this.currentType = undefined;

		if (!dontRender) this.props.onUpdateView();
	}

	clearTypeParent(): void {
		this.typePicker.clearType(true);
		this.clearType(true);
	}

	setType(type: string, dontRender?: boolean): void {
		if (this.currentType === type) return;

		this.currentType = type;

		if (!dontRender) this.props.onUpdateView();
	}

	setTypeParent(type: string): void {
		this.typePicker.selectType(type, true);
		this.setType(type, true);
	}

	selectRandomPokemon(withFormes: boolean, parentPokemon?: string[]): boolean {
		const type = this.currentType || Tools.sampleOne(withFormes ? PokemonPickerRandom.typesWithFormes : PokemonPickerRandom.types);
		const list = Tools.shuffle(withFormes ? PokemonPickerRandom.pokemonByTypeWithFormes[type] :
			PokemonPickerRandom.pokemonByType[type]);

		let pokemon = list.shift()!;
		while (pokemon === this.currentPokemon || (parentPokemon && parentPokemon.includes(pokemon))) {
			if (!list.length) return false;
			pokemon = list.shift()!;
		}

		this.selectPokemon(pokemon, true);
		return true;
	}

	render(): string {
		let html = super.render();
		if (html) html += "<br /><br />";

		html += this.typePicker.render();

		return html;
	}
}