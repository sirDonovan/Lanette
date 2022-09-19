import type { ModelGeneration } from "../../types/dex";
import type { HtmlPageBase } from "../html-page-base";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface IPokemonPick {
	generation: ModelGeneration;
	pokemon: string;
	shiny?: boolean;
}

export interface IPokemonPickerProps extends IPickerProps<IPokemonPick> {
	gif: boolean;
	onPickLetter: (pickerIndex: number, letter: string, dontRender: boolean | undefined) => void;
	onPickGeneration: (pickerIndex: number, generation: ModelGeneration, dontRender: boolean | undefined) => void;
	onPickShininess: (pickerIndex: number, shininess: boolean, dontRender: boolean | undefined) => void;
	onClearType: (pickerIndex: number, dontRender: boolean | undefined) => void;
	onPickType: (pickerIndex: number, type: string, dontRender: boolean | undefined) => void;
}

const defaultModelGeneration: ModelGeneration = 'xy';

const setGeneration = 'setgeneration';
const setShininess = 'setshininess';
const setShiny = "shiny";
const setNotShiny = "notshiny";

export abstract class PokemonPickerBase extends PickerBase<IPokemonPick, IPokemonPickerProps> {
	static defaultModelGeneration: ModelGeneration = defaultModelGeneration;
	static pokemonGens: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static pokemonGifsGens: KeyedDict<ModelGeneration, string[]> = {
		'rb': [],
		'gs': [],
		'rs': [],
		'dp': [],
		'bw': [],
		'xy': [],
	};
	static PokemonPickerBaseLoaded: boolean = false;

	choicesByGeneration: KeyedDict<ModelGeneration, Dict<IPokemonPick>> = {
		'rb': {},
		'gs': {},
		'rs': {},
		'dp': {},
		'bw': {},
		'xy': {},
	};
	generation: ModelGeneration = defaultModelGeneration;
	replicationTargets: PokemonPickerBase[] = [];
	shininess: boolean = false;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IPokemonPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		PokemonPickerBase.loadData();

		const allChoices: Dict<IPokemonPick> = {};
		const lists = props.gif ? PokemonPickerBase.pokemonGifsGens : PokemonPickerBase.pokemonGens;
		for (const generation of Dex.getModelGenerations()) {
			for (const pokemon of lists[generation]) {
				this.choicesByGeneration[generation][pokemon] = {generation, pokemon};
				if (!(pokemon in allChoices)) allChoices[pokemon] = this.choicesByGeneration[generation][pokemon];
			}
		}

		this.choices = this.choicesByGeneration[this.generation];
		this.renderChoices(allChoices);
	}

	static loadData(): void {
		if (this.PokemonPickerBaseLoaded) return;

		for (const generation of Dex.getModelGenerations()) {
			const dex = Dex.getDex('gen' + Dex.getModelGenerationMaxGen(generation));
			const gen = dex.getGen();
			for (const key of dex.getData().pokemonKeys) {
				const pokemon = dex.getExistingPokemon(key);
				if (this.pokemonGens[generation].includes(pokemon.name) || (pokemon.forme && pokemon.baseSpecies === 'Unown')) continue;

				this.pokemonGens[generation].push(pokemon.name);
				if (Dex.hasModelData(pokemon)) this.pokemonGifsGens[generation].push(pokemon.name);

				if (pokemon.name === 'Unown') continue;

				if (pokemon.cosmeticFormes) {
					for (const name of pokemon.cosmeticFormes) {
						const forme = dex.getPokemon(name);
						if (forme && forme.gen <= gen) {
							this.pokemonGens[generation].push(forme.name);
							if (Dex.hasModelData(forme)) this.pokemonGifsGens[generation].push(forme.name);
						}
					}
				}

				if (pokemon.otherFormes) {
					for (const name of pokemon.otherFormes) {
						const forme = dex.getPokemon(name);
						if (forme && forme.gen <= gen) {
							this.pokemonGens[generation].push(forme.name);
							if (Dex.hasModelData(forme)) this.pokemonGifsGens[generation].push(forme.name);
						}
					}
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

	onPick(pick: string, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (!replicatedFrom) {
			this.props.onPick(this.pickerIndex, {generation: this.generation, pokemon: pick, shiny: this.shininess}, dontRender);
		}
	}

	isInGeneration(generation: ModelGeneration, pokemon: string): boolean {
		return pokemon in this.choicesByGeneration[generation];
	}

	tryParentPickGeneration(generation: ModelGeneration): void {
		if (!this.currentPicks.length || this.isInGeneration(generation, this.currentPicks[0])) this.parentPickGeneration(generation);
	}

	onPickGeneration(previousGeneration: ModelGeneration, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (!replicatedFrom) this.props.onPickGeneration(this.pickerIndex, this.generation, dontRender);

		this.replicatePickGeneration(this.generation, replicatedFrom);
	}

	pickGeneration(generation: ModelGeneration, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (this.generation === generation) return;

		const previousGeneration = this.generation;
		this.generation = generation;
		this.choices = this.choicesByGeneration[this.generation];

		this.onPickGeneration(previousGeneration, dontRender, replicatedFrom);
	}

	parentPickGeneration(generation: ModelGeneration): void {
		this.pickGeneration(generation, true);
	}

	replicatePickGeneration(generation: ModelGeneration, replicatedFrom: PokemonPickerBase | undefined): void {
		for (const target of this.replicationTargets) {
			if (!replicatedFrom || target !== replicatedFrom) target.pickGeneration(generation, true, this);
		}
	}

	onPickShininess(shininess: boolean, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (!replicatedFrom) this.props.onPickShininess(this.pickerIndex, this.shininess, dontRender);

		this.replicatePickShininess(this.shininess, replicatedFrom);
	}

	pickShininess(shininess: boolean, dontRender?: boolean, replicatedFrom?: PokemonPickerBase): void {
		if (this.shininess === shininess) return;

		this.shininess = shininess;

		this.onPickShininess(shininess, dontRender, replicatedFrom);
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

		if (cmd === setGeneration) {
			const target = targets[0].trim();
			if (target in PokemonPickerBase.pokemonGens) {
				this.pickGeneration(target as ModelGeneration);
			} else {
				return "'" + target + "' is not a valid generation option.";
			}
		} else if (cmd === setShininess) {
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

	renderModelGenerationOptions(): string {
		let html = "";
		if (this.props.gif) {
			html += "Model generation:";
			for (const i in PokemonPickerBase.pokemonGens) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setGeneration + "," + i,
					i.toUpperCase(), {selectedAndDisabled: this.generation === i});
			}
		}

		return html;
	}

	renderShininessOptions(): string {
		let html = "";
		if (this.props.gif && this.generation !== 'rb') {
			html = "Shiny: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + setShininess + "," + setShiny, "Yes",
				{selectedAndDisabled: this.shininess});
			html += "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + ", " + setShininess + "," + setNotShiny, "No",
				{selectedAndDisabled: !this.shininess});
		}

		return html;
	}
}