import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";
import { Chain, commands } from "./templates/chain";

const name = "Fraxure's Battle Chain";
const data: {types: string[]} = {
	types: [],
};
let loadedData = false;

class FraxuresBattleChain extends Chain {
	static loadData(room: Room) {
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

	defaultOptions: DefaultGameOption[] = ['freejoin', 'points'];
	linkEndCache: Dict<string[]> = {};

	getLinkStarts(link: IPokemon): string[] {
		return [link.types.slice().sort().join(",")];
	}

	getLinkEnds(link: IPokemon): string[] {
		const type = link.types.slice().sort().join(",");
		if (type in this.linkEndCache) return this.linkEndCache[type].slice();
		const ends: string[] = [];
		for (let i = 0; i < data.types.length; i++) {
			const type = data.types[i].split(",");
			let superEffective = false;
			for (let i = 0; i < type.length; i++) {
				if (Dex.isImmune(type[i], link.types)) {
					continue;
				} else {
					if (Dex.getEffectiveness(type[i], link.types) > 0) {
						superEffective = true;
					}
				}
			}
			if (superEffective) ends.push(data.types[i]);
		}

		this.linkEndCache[type] = ends;
		return ends;
	}
}

export const game: IGameFile<FraxuresBattleChain> = {
	aliases: ["fraxures", "battlechain", "fbc"],
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	commands,
	class: FraxuresBattleChain,
	description: "Players answer each round with a Pokemon whose type is super effective against the previous Pokemon (no formes or repeats in a round)!",
	name,
	mascot: "Fraxure",
};
