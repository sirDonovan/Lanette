import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

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

const data: {moves: Dict<IMovePairData>; pokemon: Dict<IPokemonPairData>} = {
	moves: {},
	pokemon: {},
};
const dataKeys: {'Pokemon': string[]; moves: string[]} = {
	'moves': [],
	'Pokemon': [],
};
const categories: {'Pokemon': (keyof IPokemonPairData)[]; moves: (keyof IMovePairData)[]} = {
	'moves': ['type', 'pp', 'bp', 'generation'],
	'Pokemon': ['type', 'color', 'ability', 'generation'],
};
type DataTypes = keyof typeof categories;

class PanchamPairs extends ScriptedGame {
	canPair: boolean = false;
	dataType: DataTypes = 'Pokemon';
	currentList: string[] = [];
	paired = new Set<Player>();
	pairRound: number = 0;
	points = new Map<Player, number>();

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			dataKeys['Pokemon'].push(pokemon.name);
			const abilities: string[] = [];
			for (const i in pokemon.abilities) {
				// @ts-expect-error
				abilities.push(pokemon.abilities[i]);
			}
			data.pokemon[pokemon.name] = {
				type: pokemon.types,
				color: [pokemon.color],
				ability: abilities,
				generation: ['' + pokemon.gen],
			};
		}

		const movesList = Games.getMovesList(x => !x.isMax && !x.isZ && !!x.basePower);
		for (const move of movesList) {
			dataKeys.moves.push(move.name);
			data.moves[move.name] = {
				"type": [move.type],
				"pp": [move.pp],
				"bp": [move.basePower],
				"generation": [move.gen],
			};
		}
	}

	getMinigameDescription(): string {
		if (this.dataType === "Pokemon") {
			return "Use <code>" + Config.commandCharacter + "pair [name, name, parameter type]</code> to pair the given Pokemon! " +
				"Valid parameter types are: " + Tools.joinList(categories.Pokemon) + ".";
		} else {
			return "Use <code>" + Config.commandCharacter + "pair [name, name, parameter type]</code> to pair the given moves! " +
				"Valid parameter types are: " + Tools.joinList(categories.moves) + ".";
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin && !this.isMiniGame) {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	onStart(): void {
		this.nextRound();
	}

	listPossiblePairs(): void {
		if (!this.format.options.freejoin) {
			this.pairRound++;
			if (this.pairRound >= 4) {
				this.nextRound();
				return;
			}

			const players: string[] = [];
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				if (!this.paired.has(this.players[i])) players.push(this.players[i].name);
			}
			this.say("These players still have not paired: " + players.join(", "));
		}

		const dataHtmlParts: string[] = [];
		if (this.dataType === 'Pokemon') {
			for (const name of this.currentList) {
				const pokemon = Dex.getExistingPokemon(name);
				dataHtmlParts.push(Dex.getPSPokemonIcon(pokemon) + pokemon.name);
			}
		} else {
			dataHtmlParts.push(this.currentList.join(", "));
		}

		const uhtmlName = this.uhtmlBaseName + '-' + this.round + '-pokemon';
		const dataHtml = dataHtmlParts.join(", ");
		let html = this.getMascotAndNameHtml(" - Pair 2 " + this.dataType + ":") + "<br /><br />";
		if (this.isMiniGame) {
			html += "<div class='infobox'>" + dataHtml + "</div>";
		} else {
			html += dataHtml;
			html = "<div class='infobox'>" + html + "</div>";
		}

		this.onUhtml(uhtmlName, html, () => {
			if (!this.canPair) this.canPair = true;
			if (this.isMiniGame) {
				this.timeout = setTimeout(() => {
					this.say("Time is up! " + this.getAnswers(""));
					this.end();
				}, 15 * 1000);
			} else if (!this.format.options.freejoin) {
				this.timeout = setTimeout(() => this.listPossiblePairs(), 15 * 1000);
			}
		});
		this.sayUhtmlAuto(uhtmlName, html);
	}

	getRandomPair(): [string, string, string] | undefined {
		for (let i = 0; i < this.currentList.length; i++) {
			for (let j = 0; j < this.currentList.length; j++) {
				if (i === j) continue;
				for (const parameter of categories[this.dataType]) {
					if (this.isParamPair(this.currentList[i], this.currentList[j], parameter)) {
						return [this.currentList[i], this.currentList[j], parameter];
					}
				}
			}
		}
	}

	getAnswers(givenAnswer: string): string {
		if (!givenAnswer) {
			const randomPair = this.getRandomPair()!;
			givenAnswer = randomPair[0] + " & " + randomPair[1] + " (" + randomPair[2] + ")";
		}

		return "A possible pair was __" + givenAnswer + "__.";
	}

	getForceEndMessage(): string {
		return this.getAnswers("");
	}

	onNextRound(): void {
		this.canPair = false;

		const eliminated: Player[] = [];
		if (this.round > 1 && !this.format.options.freejoin) {
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				if (!this.paired.has(player)) {
					this.eliminatePlayer(player, "You did not pair any " + this.dataType + "!");
					eliminated.push(player);
				}
			}
		}

		let remainingPlayerCount: number;
		if (this.format.options.freejoin) {
			remainingPlayerCount = this.random(5) + 5;
		} else {
			remainingPlayerCount = this.getRemainingPlayerCount();
			if (remainingPlayerCount === 1) {
				const winner = this.getFinalPlayer()!;
				this.winners.set(winner, 1);
				this.addBits(winner, 500);
				if (eliminated.length === 1) this.addBits(eliminated[0], 250);
				this.end();
				return;
			} else if (remainingPlayerCount === 0) {
				this.end();
				return;
			}
		}

		this.pairRound = 0;
		this.paired.clear();
		const newList: string[] = [];
		const pool = dataKeys[this.dataType];
		let shuffled: string[] = [];
		while (!newList.length) {
			shuffled = this.shuffle(pool);
			const base = shuffled[0];
			shuffled.shift();
			for (const item of shuffled) {
				if (this.isPair(base, item)) {
					newList.push(base);
					newList.push(item);
					break;
				}
			}
		}

		for (const item of newList) {
			const index = shuffled.indexOf(item);
			if (index !== -1) shuffled.splice(index, 1);
		}

		// eliminate 1 person per round
		let additional = (2 * (remainingPlayerCount - 1)) - newList.length;
		if (remainingPlayerCount === 2) additional--;
		for (let i = 0; i < additional; i++) {
			if (!shuffled[i]) break;
			newList.push(shuffled[i]);
		}
		this.currentList = this.shuffle(newList);

		if (this.isMiniGame) {
			this.listPossiblePairs();
		} else if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.listPossiblePairs(), 5000);
		} else {
			const html = this.getRoundHtml(players => this.format.options.freejoin ? this.getPlayerPoints(players) :
				this.getPlayerNames(players));
			const uhtmlName = this.uhtmlBaseName + '-round';
			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.listPossiblePairs(), 5000);
			});
			this.sayUhtml(uhtmlName, html);
		}
	}

	onEnd(): void {
		if (this.isMiniGame) return;

		if (this.format.options.freejoin) {
			this.convertPointsToBits();
		}

		this.announceWinners();
	}

	isParamPair(inputA: string, inputB: string, paramName: keyof IMovePairData | keyof IPokemonPairData, inCurrent?: boolean):
		[string, string] | false {
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
			if (pokemonA) nameA = pokemonA.name;
			if (pokemonB) nameB = pokemonB.name;
		}
		if (!nameA || !nameB || (inCurrent && (!this.currentList.includes(nameA) || !this.currentList.includes(nameB)))) return false;
		// @ts-expect-error
		if (!categories[this.dataType].includes(paramName)) return false;
		// @ts-expect-error
		for (const thing of usedData[nameA][paramName]) {
			// @ts-expect-error
			if ((usedData[nameB][paramName] as string[]).includes(thing)) {
				return [nameA, nameB];
			}
		}
		return false;
	}

	isPair(inputA: string, inputB: string): boolean {
		for (const param of categories[this.dataType]) {
			if (this.isParamPair(inputA, inputB, param, false)) return true;
		}
		return false;
	}
}

const commands: GameCommandDefinitions<PanchamPairs> = {
	pair: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canPair) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.paired.has(player)) return false;
			const split = target.split(",");
			if (split.length !== 3) return false;

			let param = Tools.toId(split[2]);
			if (param === 'gen') {
				param = 'generation';
			} else if (param === 'colour') {
				param = 'color';
			}

			const pair = this.isParamPair(split[0], split[1], param as keyof IPokemonPairData | keyof IMovePairData, true);
			if (!pair) return false;

			if (this.isMiniGame) {
				this.say((this.pm ? "You are" : "**" + user.name + "** is") + " correct! " + this.getAnswers(pair[0] + " & " +
					pair[1] + " (" + param + ")"));
				this.addBits(user, Games.minigameBits);
				this.end();
				return true;
			}

			if (this.format.options.freejoin) {
				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);
				this.say("**" + player.name + "** advances to **" + points + "** point" + (points > 1 ? "s" : "") + "! " +
						this.getAnswers(pair[0] + " & " + pair[1] + " (" + param + ")"));
				if (points === this.format.options.points) {
					for (const i in this.players) {
						if (this.players[i] !== player) this.players[i].eliminated = true;
					}
					this.winners.set(player, points);
					this.end();
					return true;
				}
				this.nextRound();
			} else {
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
			}
			return true;
		},
	},
};

export const game: IGameFile<PanchamPairs> = {
	aliases: ["panchams", "pairs"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "pair [name, name, param type]"],
	commands,
	class: PanchamPairs,
	defaultOptions: ['freejoin', 'points'],
	description: "Players try to pair the given Pokemon according to <code>/dexsearch</code> parameters! Valid parameter types include " +
		"generation, color, type, and ability.",
	name: "Pancham's Pairs",
	mascot: "Pancham",
	minigameCommand: 'panchampair',
	minigameCommandAliases: ['ppair'],
	variants: [
		{
			name: "Pancham's Move Pairs",
			dataType: 'moves',
			description: "Players try to pair the given moves according to <code>/movesearch</code> parameters! Valid parameter types " +
				"include type, base power, PP, and generation.",
			variantAliases: ['move', 'moves', 'Pokemon Moves'],
		},
	],
};
