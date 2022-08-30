import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_MIDDLE_EGG_GROUPS = 1;

class WailordsEggCompatibilities extends QuestionAndAnswer {
	static pokemonEggGroups: Dict<DeepImmutableArray<string>> = {};
	static eggGroups: Dict<string[]> = {};
	static eggGroupKeys: string[] = [];
	static pokemonKeys: string[] = [];

	lastStartEggGroup: string = "";
	lastEndEggGroup: string = "";
	lastStartPokemon: string = "";
	lastEndPokemon: string = "";
	roundTime = 30 * 1000;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme || pokemon.eggGroups[0] === 'Ditto' || pokemon.eggGroups[0] === 'Undiscovered') continue;

			this.pokemonKeys.push(pokemon.name);
			this.pokemonEggGroups[pokemon.name] = pokemon.eggGroups;

			for (const eggGroup of pokemon.eggGroups) {
				if (!(eggGroup in this.eggGroups)) {
					this.eggGroups[eggGroup] = [];
					this.eggGroupKeys.push(eggGroup);
				}

				this.eggGroups[eggGroup].push(pokemon.name);
			}
		}
	}

	async customGenerateHint(): Promise<void> {
		let eggGroups = this.shuffle(WailordsEggCompatibilities.eggGroupKeys);
		let startEggGroup = eggGroups[0];
		while (startEggGroup === this.lastStartEggGroup) {
			eggGroups = this.shuffle(WailordsEggCompatibilities.eggGroupKeys);
			startEggGroup = eggGroups[0];
		}

		eggGroups.shift();

		let endEggGroup = eggGroups[0];
		while (endEggGroup === this.lastEndEggGroup) {
			eggGroups = this.shuffle(eggGroups);
			endEggGroup = eggGroups[0];
		}

		let startPokemon = this.sampleOne(WailordsEggCompatibilities.eggGroups[startEggGroup]);
		while (startPokemon === this.lastStartPokemon || WailordsEggCompatibilities.pokemonEggGroups[startPokemon].includes(endEggGroup)) {
			startPokemon = this.sampleOne(WailordsEggCompatibilities.eggGroups[startEggGroup]);
		}

		let endPokemon = this.sampleOne(WailordsEggCompatibilities.eggGroups[endEggGroup]);
		while (endPokemon === this.lastEndPokemon || endPokemon === startPokemon ||
			WailordsEggCompatibilities.pokemonEggGroups[endPokemon].includes(startEggGroup)) {
			endPokemon = this.sampleOne(WailordsEggCompatibilities.eggGroups[endEggGroup]);
		}

		const startPokemonGif = this.getHintKeyGif(startPokemon);
		const endPokemonGif = this.getHintKeyGif(endPokemon);
		if (this.pokemonGifHints && (!startPokemonGif || !endPokemonGif)) {
			return await this.customGenerateHint();
		}

		const middleEggGroups = BASE_MIDDLE_EGG_GROUPS + this.random(2);
		let validChains: string[][] = [[startPokemon]];

		for (let i = 0; i < middleEggGroups; i++) {
			const newValidChains: string[][] = [];
			for (const chain of validChains) {
				const lastPokemon = chain[chain.length - 1];
				for (const eggGroup of WailordsEggCompatibilities.pokemonEggGroups[lastPokemon]) {
					for (const pokemon of WailordsEggCompatibilities.eggGroups[eggGroup]) {
						if (pokemon !== endPokemon && !chain.includes(pokemon)) {
							newValidChains.push(chain.concat([pokemon]));
						}
					}
				}
			}

			validChains = newValidChains;
		}

		const includedKeys: string[] = [];
		const finalValidChains: string[][] = [];
		for (const chain of validChains) {
			const lastPokemon = chain[chain.length - 1];
			for (const eggGroup of WailordsEggCompatibilities.pokemonEggGroups[lastPokemon]) {
				if (WailordsEggCompatibilities.eggGroups[eggGroup].includes(endPokemon)) {
					const key = chain.join(',');
					if (!includedKeys.includes(key)) {
						finalValidChains.push(chain);
						includedKeys.push(key);
					}
				}
			}
		}

		const answers = finalValidChains.map(x => x.slice(1).join(" > "));
		if (!finalValidChains.length) {
			return await this.customGenerateHint();
		}

		this.lastStartEggGroup = startEggGroup;
		this.lastEndEggGroup = endEggGroup;
		this.lastStartPokemon = startPokemon;
		this.lastEndPokemon = endPokemon;
		this.answers = answers;

		let hint = "<b>Randomly generated start and end</b>:";
		if (startPokemonGif && endPokemonGif) {
			hint += "<br /><center>" + startPokemonGif + " and " + endPokemonGif + "<br />";
		} else {
			hint += " <i>" + startPokemon + " and " + endPokemon + " ";
		}

		hint += "(" + middleEggGroups + " connection" + (middleEggGroups > 1 ? "s" : "") + ")";

		if (this.pokemonGifHints) {
			hint += "</center>";
		} else {
			hint += "</i>";
		}
		this.hint = hint;
	}
}

export const game: IGameFile<WailordsEggCompatibilities> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['wailords', 'wec', 'eggcompatibilities'],
	category: 'knowledge-3',
	class: WailordsEggCompatibilities,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon chain]"],
	defaultOptions: ['points'],
	description: "Players guess Pokemon in compatible egg groups to connect the chains!",
	freejoin: true,
	name: "Wailord's Egg Compatibilities",
	mascot: "Wailord",
	minigameCommand: 'eggcompatibility',
	minigameCommandAliases: ['eggcompat'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon in compatible egg groups to connect " +
		"the chain!",
	modes: ["collectiveteam", "spotlightteam"],
	variants: [
		{
			name: "Wailord's Egg Compatibilities (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});
