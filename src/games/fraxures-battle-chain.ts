import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/dex";
import { Chain, game as chainGame } from "./templates/chain";

const name = "Fraxure's Battle Chain";
const data: {types: string[]} = {
	types: [],
};
let loadedData = false;

class FraxuresBattleChain extends Chain {
	linkEndCache: Dict<string[]> = {};

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const typeKeys = Object.keys(Dex.data.typeChart);
		for (let i = 0; i < typeKeys.length; i++) {
			data.types.push(typeKeys[i]);
			for (let j = 0; j < typeKeys.length; j++) {
				if (i === j) continue;
				const type = [typeKeys[i], typeKeys[j]].sort().join(',');
				if (!data.types.includes(type)) data.types.push(type);
			}
		}

		loadedData = true;
	}

	getLinkStarts(link: IPokemon): string[] {
		return [link.types.slice().sort().join(",")];
	}

	getLinkEnds(link: IPokemon): string[] {
		const type = link.types.slice().sort().join(",");
		if (type in this.linkEndCache) return this.linkEndCache[type].slice();
		const ends: string[] = [];
		for (const typeString of data.types) {
			const types = typeString.split(",");
			let superEffective = false;
			for (const type of types) {
				if (Dex.isImmune(type, link.types)) {
					continue;
				} else {
					if (Dex.getEffectiveness(type, link.types) > 0) {
						superEffective = true;
					}
				}
			}
			if (superEffective) ends.push(typeString);
		}

		this.linkEndCache[type] = ends;
		return ends;
	}
}

export const game: IGameFile<FraxuresBattleChain> = Games.copyTemplateProperties(chainGame, {
	aliases: ["fraxures", "battlechain", "fbc"],
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	class: FraxuresBattleChain,
	defaultOptions: ['freejoin', 'points'],
	description: "Players answer each round with a Pokemon whose type is super effective against the previous Pokemon (no formes or repeats in a round)!",
	name,
	mascot: "Fraxure",
});
