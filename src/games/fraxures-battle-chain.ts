import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { User } from "../users";
import { Chain, game as chainGame } from "./templates/chain";

const data: {types: string[]} = {
	types: [],
};

class FraxuresBattleChain extends Chain {
	linkEndCache: Dict<string[]> = {};

	static loadData(room: Room | User): void {
		for (let i = 0; i < Dex.data.typeKeys.length; i++) {
			const outerType = Dex.getExistingType(Dex.data.typeKeys[i]).name;
			data.types.push(outerType);
			for (let j = 0; j < Dex.data.typeKeys.length; j++) {
				if (i === j) continue;
				const type = [outerType, Dex.getExistingType(Dex.data.typeKeys[j]).name].sort().join(',');
				if (!data.types.includes(type)) data.types.push(type);
			}
		}
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
	description: "Players answer each round with a Pokemon whose type is super effective against the previous Pokemon (no formes or " +
		"repeats in a round)!",
	name: "Fraxure's Battle Chain",
	mascot: "Fraxure",
	scriptedOnly: true,
});
