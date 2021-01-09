import type { PRNGSeed } from "../lib/prng";
import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { User } from "../users";

const GRID_ROWS = 4;
const GRID_COLUMNS = 4;
const LAST_MOVES_LIMIT = 2;
const OVERALL_MOVES_LIMIT = 3;

const data: {allPossibleMoves: Dict<readonly string[]>; movesByPokemon: Dict<readonly string[]>; pokedex: string[]} = {
	allPossibleMoves: {},
	movesByPokemon: {},
	pokedex: [],
};

class TrevenantsTrickOrTreat extends ScriptedGame {
	indicesToReplace = new Set();
	lastMoves = new Map<Player, string[]>();
	overallMoves = new Map<Player, Dict<number>>();
	points = new Map<Player, number>();
	pokemonGrid: string[][] = [];
	timeLimit: number = 10 * 60 * 1000;

	pokemonList: string[];

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.pokemonList = this.shuffle(data.pokedex);
	}

	static loadData(): void {
		const pokedex = Games.getPokemonList(x => !x.forme);
		const movesByPokemon: Dict<string[]> = {};
		for (const pokemon of pokedex) {
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			if (allPossibleMoves.length <= 1) continue;

			for (const move of allPossibleMoves) {
				if (!(move in movesByPokemon)) movesByPokemon[move] = [];
				movesByPokemon[move].push(pokemon.id);
			}
			data.pokedex.push(pokemon.id);
			data.allPossibleMoves[pokemon.id] = allPossibleMoves;
		}

		data.movesByPokemon = movesByPokemon;
	}

	validateGridLearnsets(): boolean {
		if (!this.pokemonGrid.length) return false;

		const pokemon: string[] = [];
		for (const row of this.pokemonGrid) {
			for (const square of row) {
				pokemon.push(square);
			}
		}

		for (const move in data.movesByPokemon) {
			let inGrid = 0;
			for (const id of pokemon) {
				if (data.movesByPokemon[move].includes(id)) {
					inGrid++;
					if (inGrid > 1) break;
				}
			}
			if (inGrid === 1) return true;
		}

		return false;
	}

	getNextPokemon(): string {
		if (!this.pokemonList.length) this.pokemonList = this.shuffle(data.pokedex);
		return this.pokemonList.shift()!;
	}

	onSignups(): void {
		this.format.options.points = 1000;
		this.say("Use ``" + Config.commandCharacter + "trick [move]`` in PMs to guess moves only one Pokemon in the grid can learn.");
		this.timeout = setTimeout(() => this.generateNewDisplay(), 10 * 1000);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated || !this.points.has(this.players[i])) continue;
			this.addBits(this.players[i], this.points.get(this.players[i])! / 2);
		}

		this.announceWinners();
	}

	generateNewDisplay(): void {
		while (!this.validateGridLearnsets()) {
			this.pokemonGrid = [];
			for (let i = 0; i < GRID_ROWS; i++) {
				const row: string[] = [];
				for (let j = 0; j < GRID_COLUMNS; j++) {
					row.push(this.getNextPokemon());
				}
				this.pokemonGrid.push(row);
			}
		}
		this.display();
	}

	display(): void {
		let html = '<center><table border="2" style="table-layout: fixed;width: ' + (125 * GRID_COLUMNS) + 'px">';
		for (const row of this.pokemonGrid) {
			html += '<tr style="line-height: 3">';
			for (const square of row) {
				const pokemon = Dex.getExistingPokemon(square);
				html += '<td>' + Dex.getPokemonIcon(pokemon) + pokemon.name + '</td>';
			}
			html += "</tr>";
		}
		html += "</table><br />" + this.getPlayerPoints() + "</center>";
		this.sayUhtmlAuto(this.uhtmlBaseName + '-round-pokemon', html);
	}
}

const commands: GameCommandDefinitions<TrevenantsTrickOrTreat> = {
	trick: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.started || !this.pokemonGrid.length) return false;
			const move = Dex.getMove(target);
			if (!move) {
				user.say(CommandParser.getErrorText(['invalidMove', target]));
				return false;
			}

			const player = this.createPlayer(user) || this.players[user.id];
			let overallMoves = this.overallMoves.get(player);
			if (!overallMoves) {
				overallMoves = {};
				this.overallMoves.set(player, overallMoves);
			}

			if (move.id in overallMoves) {
				if (overallMoves[move.id] === OVERALL_MOVES_LIMIT) {
					user.say("You cannot use a move more than " + OVERALL_MOVES_LIMIT + " times.");
					return false;
				}
			} else {
				overallMoves[move.id] = 0;
			}
			overallMoves[move.id]++;

			const lastMoves = this.lastMoves.get(player) || [];
			if (lastMoves.includes(move.id)) {
				user.say("You must use at least " + LAST_MOVES_LIMIT + " other moves before using " + move.name + " again.");
				return false;
			}

			const indices: [number, number][] = [];
			for (let i = 0; i < GRID_ROWS; i++) {
				for (let j = 0; j < GRID_COLUMNS; j++) {
					const pokemon = Dex.getExistingPokemon(this.pokemonGrid[i][j]);
					if (data.allPossibleMoves[pokemon.id].includes(move.id)) {
						indices.push([i, j]);
					}
				}
			}

			if (!indices.length) {
				player.say("**" + move.name + "** is not learned by any Pokemon in the grid!");
				return false;
			}

			if (indices.length > 1) {
				player.say("**" + move.name + "** is learned by more than 1 Pokemon (" +
					Tools.joinList(indices.map(index => Dex.getExistingPokemon(this.pokemonGrid[index[0]][index[1]]).name)) + ").");
				return false;
			}

			if (lastMoves.length === LAST_MOVES_LIMIT) lastMoves.shift();
			lastMoves.push(move.id);
			this.lastMoves.set(player, lastMoves);

			const points = this.points.get(player) || 0;
			let earnedPoints = 0;
			for (const pokemon of data.pokedex) {
				if (data.allPossibleMoves[pokemon].includes(move.id)) earnedPoints++;
			}
			const totalPoints = points + earnedPoints;
			this.points.set(player, totalPoints);
			player.say("You earned **" + earnedPoints + "** point" + (earnedPoints > 1 ? "s" : "") + " for " + move.name + "! Your " +
				"total is now **" + totalPoints + "**.");
			if (totalPoints >= this.format.options.points) {
				this.winners.set(player, totalPoints);
				this.end();
				return true;
			}

			this.pokemonGrid[indices[0][0]][indices[0][1]] = this.getNextPokemon();
			if (!this.validateGridLearnsets()) {
				this.say("There are no unique moves remaining! Generating a new grid.");
				this.generateNewDisplay();
			} else {
				this.display();
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => this.generateNewDisplay(), 60 * 1000);
			}

			return true;
		},
		pmGameCommand: true,
	},
};

export const game: IGameFile<TrevenantsTrickOrTreat> = {
	aliases: ["trevenants", "ttt", "trickortreat"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "trick [move]"],
	commands,
	class: TrevenantsTrickOrTreat,
	description: "Players guess moves learned by only one Pokemon on the grid, gaining points equal to the total number of pokemon that " +
		"learn that move. The grid is constantly updating, so beware!",
	freejoin: true,
	name: "Trevenant's Trick-or-Treat",
	mascot: "Trevenant",
	scriptedOnly: true,
};
