import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

interface IPokemonPairData {
	type: readonly string[];
	color: string[];
	ability: string[];
	generation: string[];
}

interface IMovePairData {
	type: string[];
	pp: number[];
	bp: number[];
	generation: number[];
}

const name = "Pancham's Pairs";

const data: {moves: Dict<IMovePairData>, pokemon: Dict<IPokemonPairData>} = {
	moves: {},
	pokemon: {},
};
const dataKeys: {'Pokemon': string[], moves: string[]} = {
	'moves': [],
	'Pokemon': [],
};
const categories: {'Pokemon': (keyof IPokemonPairData)[], moves: (keyof IMovePairData)[]} = {
	'moves': ['type', 'pp', 'bp', 'generation'],
	'Pokemon': ['type', 'color', 'ability', 'generation'],
};
type dataTypes = keyof typeof categories;

let loadedData = false;

class PanchamPairs extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList();
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			dataKeys['Pokemon'].push(pokemon.species);
			const abilities: string[] = [];
			for (const i in pokemon.abilities) {
				// @ts-ignore
				abilities.push(pokemon.abilities[i]);
			}
			data.pokemon[pokemon.species] = {
				type: pokemon.types,
				color: [pokemon.color],
				ability: abilities,
				generation: ['' + pokemon.gen],
			};
		}

		const movesList = Dex.getMovesList(x => !!x.basePower);
		for (let i = 0; i < movesList.length; i++) {
			const move = movesList[i];
			dataKeys.moves.push(move.name);
			data.moves[move.name] = {
				"type": [move.type],
				"pp": [move.pp],
				"bp": [move.basePower],
				"generation": [move.gen],
			};
		}

		loadedData = true;
	}

	canPair: boolean = false;
	dataType: dataTypes = 'Pokemon';
	currentList: string[] = [];
	currentListString: string = '';
	paired = new Set<Player>();
	pairRound: number = 0;

	onStart() {
		this.nextRound();
	}

	listPossiblePairs() {
		this.pairRound++;
		if (this.pairRound >= 4) {
			this.nextRound();
			return;
		}
		const players: string[] = [];
		for (const id in this.players) {
			const player = this.players[id];
			if (player.eliminated) continue;
			if (!this.paired.has(player)) {
				players.push(player.name);
			}
		}
		this.say("These players still haven't paired! " + players.join(", "));
		this.currentListString = "**Current " + this.dataType + "**: " + this.currentList.join(", ");
		this.on(this.currentListString, () => {
			this.timeout = setTimeout(() => this.listPossiblePairs(), 15 * 1000);
		});
		this.say(this.currentListString);
	}

	onNextRound() {
		this.canPair = false;
		const eliminated: Player[] = [];
		if (this.round > 1) {
			for (const id in this.players) {
				const player = this.players[id];
				if (player.eliminated) continue;
				if (!this.paired.has(player)) {
					player.say("You didn't pair any " + this.dataType + " and have been eliminated!");
					player.eliminated = true;
					eliminated.push(player);
				}
			}
		}
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount === 1) {
			const winner = this.getFinalPlayer();
			this.say("**Winner:** " + winner.name);
			this.winners.set(winner, 1);
			this.addBits(winner, 500);
			if (eliminated.length === 1) this.addBits(eliminated[0], 250);
			this.end();
			return;
		} else if (remainingPlayerCount === 0) {
			this.say("No winners this game. Better luck next time!");
			this.end();
			return;
		}
		this.pairRound = 0;
		this.paired.clear();
		this.currentList = [];
		const newList: string[] = [];
		const pool = dataKeys[this.dataType];
		let shuffled: string[] = [];
		while (!newList.length) {
			shuffled = this.shuffle(pool);
			const base = shuffled.shift();
			for (let i = 0, len = shuffled.length; i < len; i++) {
				if (base && this.isPair(base, shuffled[i])) {
					newList.push(base);
					newList.push(shuffled[i]);
					shuffled.splice(i, 1);
					break;
				}
			}
		}

		// eliminate 1 person per round
		let additional = (2 * (this.getRemainingPlayerCount() - 1)) - newList.length;
		if (remainingPlayerCount === 2) additional--;
		for (let i = 0; i < additional; i++) {
			newList.push(shuffled[i]);
		}

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			this.canPair = true;
			this.currentList = this.shuffle(newList);
			this.listPossiblePairs();
		});
		this.sayUhtml(uhtmlName, html);
	}

	isParamPair(inputA: string, inputB: string, paramName: keyof IMovePairData | keyof IPokemonPairData, inCurrent?: boolean): [string, string] | false {
		inputA = Tools.toId(inputA);
		inputB = Tools.toId(inputB);
		if (!inputA || !inputB || inputA === inputB) return false;
		let nameA = '';
		let nameB = '';
		let usedData: Dict<IMovePairData> | Dict<IPokemonPairData>;
		if (this.dataType === 'moves') {
			usedData = data.moves;
			const moveA = Dex.getMove(inputA);
			const moveB = Dex.getMove(inputB);
			if (moveA) nameA = moveA.name;
			if (moveB) nameB = moveB.name;
		} else {
			usedData = data.pokemon;
			const pokemonA = Dex.getPokemon(inputA);
			const pokemonB = Dex.getPokemon(inputB);
			if (pokemonA) nameA = pokemonA.species;
			if (pokemonB) nameB = pokemonB.species;
		}
		if (!nameA || !nameB || (inCurrent && (!this.currentList.includes(nameA) || !this.currentList.includes(nameB)))) return false;
		// @ts-ignore
		if (categories[this.dataType].indexOf(paramName) === -1) return false;
		// @ts-ignore
		for (let i = 0; i < usedData[nameA][paramName].length; i++) {
			// @ts-ignore
			if (usedData[nameB][paramName].includes(usedData[nameA][paramName][i])) {
				return [nameA, nameB];
			}
		}
		return false;
	}

	isPair(inputA: string, inputB: string) {
		for (let i = 0, len = categories[this.dataType].length; i < len; i++) {
			if (this.isParamPair(inputA, inputB, categories[this.dataType][i], false)) return true;
		}
		return false;
	}
}

const commands: Dict<ICommandDefinition<PanchamPairs>> = {
	pair: {
		command(target, room, user) {
			if (!this.canPair) return;
			const player = this.players[user.id];
			if (!player || player.eliminated || this.paired.has(player)) return;
			const split = target.split(",");
			if (split.length !== 3) return;
			let param = Tools.toId(split[2]);
			if (param === 'gen') {
				param = 'generation';
			} else if (param === 'colour') {
				param = 'color';
			}
			const pair = this.isParamPair(split[0], split[1], param as keyof IPokemonPairData | keyof IMovePairData, true);
			if (!pair) return;
			this.paired.add(player);
			player.say("You have paired " + pair[0] + " & " + pair[1] + " and advanced to the next round!");
			this.currentList.splice(this.currentList.indexOf(pair[0]), 1);
			this.currentList.splice(this.currentList.indexOf(pair[1]), 1);
			if (this.paired.size === this.getRemainingPlayerCount()) {
				this.nextRound();
			} else {
				let hasPair = false;
				for (let i = 0, len = this.currentList.length; i < len; i++) {
					for (let j = i + 1; j < len; j++) {
						if (this.isPair(this.currentList[i], this.currentList[j])) {
							hasPair = true;
							break;
						}
					}
					if (hasPair) break;
				}
				if (!hasPair) {
					this.say("No pairs Left! Moving to next round!");
					this.nextRound();
				}
			}
		},
	},
};

export const game: IGameFile<PanchamPairs> = {
	aliases: ["panchams", "pairs"],
	battleFrontierCategory: 'Knowledge',
	commandDescriptions: [Config.commandCharacter + "pair [name, name, param type]"],
	commands,
	class: PanchamPairs,
	description: "Players try to pair the given Pokemon according to <code>/dexsearch</code> parameters! Valid parameter types include generation, color, type, and ability.",
	name: "Pancham's Pairs",
	mascot: "Pancham",
	variants: [
		{
			name: "Pancham's Move Pairs",
			dataType: 'moves',
			description: "Players try to pair the given moves according to <code>/movesearch</code> parameters! Valid parameter types include type, base power, PP, and generation.",
			variant: "Moves",
			variantAliases: ['move', 'Pokemon Moves'],
		},
	],
};
