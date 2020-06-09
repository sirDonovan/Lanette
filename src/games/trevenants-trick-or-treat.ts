import type { ICommandDefinition } from "../command-parser";
import type { PRNGSeed } from "../prng";
import type { Player } from "../room-activity";
import { Game } from "../room-game";
import type { Room } from "../rooms";
import type { GameCommandReturnType, IGameFile } from "../types/games";
import type { User } from "../users";

const GRID_SIZE = 4;

const data: {allPossibleMoves: Dict<readonly string[]>; pokedex: string[]} = {
	allPossibleMoves: {},
	pokedex: [],
};

class TrevenantsTrickOrTreat extends Game {
	points = new Map<Player, number>();
	pokemonGrid: string[][] = [];
	hasAnswered = new Set<Player>();
	indicesToReplace = new Set();
	timeout: NodeJS.Timer | null = null;

	pokemonList: string[];

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.pokemonList = this.shuffle(data.pokedex);
	}

	static loadData(room: Room | User): void {
		const pokedex = Games.getPokemonList(x => x.gen <= 5 && !x.forme && Dex.hasGifData(x, 'bw'));
		for (const pokemon of pokedex) {
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			if (!allPossibleMoves.length) continue;
			data.pokedex.push(pokemon.id);
			data.allPossibleMoves[pokemon.id] = allPossibleMoves;
		}
	}

	generateNewMons(): void {
		this.pokemonGrid = [];
		for (let i = 0; i < GRID_SIZE; i++) {
			this.pokemonGrid.push([]);
			for (let j = 0; j < GRID_SIZE; j++) {
				this.pokemonGrid[i].push(this.getNextMon());
			}
		}
	}

	getNextMon(): string {
		if (!this.pokemonList.length) this.pokemonList = this.shuffle(data.pokedex);
		return this.pokemonList.shift()!;
	}

	onSignups(): void {
		this.format.options.points = 1000;
		this.say("Use ``" + Config.commandCharacter + "trick [move]`` in PMs to guess moves only one Pokemon in the grid can learn.");
		this.generateNewDisplay();
		this.timeout = setTimeout(() => this.generateNewDisplay(), 60 * 1000);
	}

	onEnd(): void {
		this.announceWinners();
	}

	generateNewDisplay(): void {
		this.generateNewMons();
		this.display();
	}

	display(): void {
		let html = `<div class="infobox"><center>`;
		for (let i = 0; i < GRID_SIZE; i++) {
			for (let j = 0; j < GRID_SIZE; j++) {
				html += Dex.getPokemonGif(Dex.getExistingPokemon(this.pokemonGrid[i][j]), "bw");
			}
			html += "<br />";
		}
		html += "<br /><br />" + this.getPlayerPoints() + "</center></div>";
		this.sayUhtmlChange(this.uhtmlBaseName + '-round-pokemon', html);
	}
}

const commands: Dict<ICommandDefinition<TrevenantsTrickOrTreat>> = {
	trick: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user): GameCommandReturnType {
			if (!this.started || (user.id in this.players && this.players[user.id].eliminated)) return false;
			const move = Dex.getMove(target);
			if (!move) {
				user.say("'" + target + "' is not a valid move.");
				return false;
			}
			const player = this.createPlayer(user) || this.players[user.id];
			this.hasAnswered.add(player);
			const indices: [number, number][] = [];
			for (let i = 0; i < GRID_SIZE; i++) {
				for (let j = 0; j < GRID_SIZE; j++) {
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
				player.say("**" + move.name + "** is learned by more than 1 Pokemon  (" +
					Tools.joinList(indices.map(index => this.pokemonGrid[index[0]][index[1]])) + ").");
				return false;
			}

			const points = this.points.get(player) || 0;
			let earnedPoints = 0;
			for (const pokemon of data.pokedex) {
				if (data.allPossibleMoves[pokemon].includes(move.id)) earnedPoints++;
			}
			const totalPoints = points + earnedPoints;
			this.points.set(player, totalPoints);
			player.say("You earned **" + earnedPoints + "** points for " + move.name + "! Your total is now **" + totalPoints + "**.");
			if (totalPoints >= this.format.options.points) {
				this.winners.set(player, totalPoints);
				for (const i in this.players) {
					if (this.players[i].eliminated) continue;
					const player = this.players[i];
					const points = this.points.get(player);
					if (points) this.addBits(player, points);
				}
				this.end();
				return true;
			}
			this.pokemonGrid[indices[0][0]][indices[0][1]] = this.getNextMon();
			this.display();
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.generateNewDisplay(), 60 * 1000);
			return true;
		},
		pmGameCommand: true,
	},
};

export const game: IGameFile<TrevenantsTrickOrTreat> = {
	aliases: ["trevenants", "ttt", "trickortreat"],
	category: 'speed',
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
