import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";
import { User } from "../users";

const name = "Beheeyem's Mass Effect";
const data: {types: Dict<string[]>} = {
	types: {},
};
const effectivenessLists: Dict<string[]> = {};
const effectivenessListsKeys: string[] = [];
let loadedData = false;

class BeheeyemsMassEffect extends Guessing {
	lastEffectiveness: string = '';
	roundTime: number = 20 * 1000;

	static loadData(room: Room | User): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const typing = pokemon.types.slice().sort().join('/');
			if (!(typing in data.types)) data.types[typing] = [];
			data.types[typing].push(pokemon.name);
		}

		for (const typing in data.types) {
			const immunities: string[] = [];
			const resistances: string[] = [];
			const weaknesses: string[] = [];
			const typingArray = typing.split('/');
			for (const type in Dex.data.typeChart) {
				if (Dex.isImmune(type, typingArray)) {
					immunities.push(type);
				} else {
					const effectiveness = Dex.getEffectiveness(type, typingArray);
					if (effectiveness <= -2) {
						resistances.push("<b>" + type + "</b>");
					} else if (effectiveness === -1) {
						resistances.push(type);
					} else if (effectiveness === 1) {
						weaknesses.push(type);
					} else if (effectiveness >= 2) {
						weaknesses.push("<b>" + type + "</b>");
					}
				}
			}
			const text: string[] = [];
			if (weaknesses.length) text.push("Weak to " + Tools.joinList(weaknesses));
			if (resistances.length) text.push("Resists " + Tools.joinList(resistances));
			if (immunities.length) text.push("Immune to " + Tools.joinList(immunities));
			const effectiveness = text.join(" | ");
			if (!(effectiveness in effectivenessLists)) {
				effectivenessLists[effectiveness] = [];
				effectivenessListsKeys.push(effectiveness);
			}

			for (const pokemon of  data.types[typing]) {
				if (!effectivenessLists[effectiveness].includes(pokemon)) effectivenessLists[effectiveness].push(pokemon);
			}
		}

		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		let effectiveness = this.sampleOne(effectivenessListsKeys);
		while (effectiveness === this.lastEffectiveness) {
			effectiveness = this.sampleOne(effectivenessListsKeys);
		}
		this.lastEffectiveness = effectiveness;
		this.answers = effectivenessLists[effectiveness];
		this.hint = "<b>Randomly generated effectiveness</b>: <i>" + effectiveness + "</i>";
	}
}

export const game: IGameFile<BeheeyemsMassEffect> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["Beheeyems", "bme"],
	category: 'knowledge',
	class: BeheeyemsMassEffect,
	defaultOptions: ['points'],
	description: "Each round, players find a Pokemon whose type effectiveness matches the given parameters.",
	formerNames: ["Mass Effect"],
	freejoin: true,
	name,
	mascot: "Beheeyem",
	modes: ['survival', 'team'],
});
