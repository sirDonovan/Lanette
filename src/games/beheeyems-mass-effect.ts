import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Beheeyem's Mass Effect";
const data: {types: Dict<string[]>} = {
	types: {},
};
const effectivenessLists: Dict<string[]> = {};
const effectivenessListsKeys: string[] = [];
let loadedData = false;

class BeheeyemsMassEffect extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList();
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			const typing = pokemon.types.slice().sort().join('/');
			if (!(typing in data.types)) data.types[typing] = [];
			data.types[typing].push(pokemon.species);
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
						resistances.push("**" + type + "**");
					} else if (effectiveness === -1) {
						resistances.push(type);
					} else if (effectiveness === 1) {
						weaknesses.push(type);
					} else if (effectiveness >= 2) {
						weaknesses.push("**" + type + "**");
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
			for (let i = 0; i < data.types[typing].length; i++) {
				const pokemon = data.types[typing][i];
				if (!effectivenessLists[effectiveness].includes(pokemon)) effectivenessLists[effectiveness].push(pokemon);
			}
		}

		loadedData = true;
	}

	lastEffectiveness: string = '';

	onSignups() {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	async setAnswers() {
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
	class: BeheeyemsMassEffect,
	defaultOptions: ['points'],
	description: "Each round, players find a Pokemon whose type effectiveness matches the given parameters.",
	formerNames: ["Mass Effect"],
	freejoin: true,
	name,
	mascot: "Beheeyem",
	modes: ['survival', 'team'],
});
