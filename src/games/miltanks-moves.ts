import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Miltank's Moves";
const data: {'moves': Dict<Dict<string[]>>, 'pokemon': string[]} = {
	moves: {},
	pokemon: [],
};
let loadedData = false;

class MiltanksMoves extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Games.getPokemonList(x => !x.isForme && !!x.allPossibleMoves.length);
		const moves = Games.getMovesList();
		const bannedMoves: string[] = [];
		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			const availability = Dex.getMoveAvailability(move, pokedex);
			if (availability >= Games.maxMoveAvailability) bannedMoves.push(move.id);
		}

		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			for (let i = 0; i < pokemon.allPossibleMoves.length; i++) {
				const move = Dex.getExistingMove(pokemon.allPossibleMoves[i]);
				if (bannedMoves.includes(move.id)) continue;
				const hint = "Name a move of **" + pokemon.species + "** that is **" + move.type + "** type!";
				if (!(pokemon.species in data.moves)) {
					data.moves[pokemon.species] = {};
					data.pokemon.push(pokemon.species);
				}
				if (!(hint in data.moves[pokemon.species])) data.moves[pokemon.species][hint] = [];
				data.moves[pokemon.species][hint].push(move.name);
			}
		}

		for (const species in data.moves) {
			for (const i in data.moves[species]) {
				if (data.moves[species][i].length > 4) delete data.moves[species][i];
			}
		}

		loadedData = true;
	}

	async setAnswers() {
		const species = this.sampleOne(data.pokemon);
		this.hint = this.sampleOne(Object.keys(data.moves[species]));
		this.answers = data.moves[species][this.hint];
	}
}

export const game: IGameFile<MiltanksMoves> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['miltanks', 'mm'],
	class: MiltanksMoves,
	defaultOptions: ['points'],
	description: "Players guess moves of the specified type that the given Pokemon learn!",
	freejoin: true,
	name,
	mascot: "Miltank",
	modes: ['survival'],
});
