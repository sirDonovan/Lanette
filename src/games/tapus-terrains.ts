import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, GameCommandReturnType } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";

const name = "Tapus' Terrains";
const terrains = {
	'Molten': 'Fire',
	'Rocky': 'Rock',
	'Sandy': 'Ground',
	'Swampy': 'Water',
};
type TerrainKey = keyof typeof terrains;
const terrainKeys = Object.keys(terrains) as TerrainKey[];
const data: {pokemon: KeyedDict<typeof terrains, string[]>; unusedPokemon: string[]} = {
	pokemon: {
		'Molten': [],
		'Rocky': [],
		'Sandy': [],
		'Swampy': [],
	},
	unusedPokemon: [],
};

let loadedData = false;

class TapusTerrains extends Game {
	canJump: boolean = false;
	canLateJoin: boolean = true;
	currentTerrain: TerrainKey | null = null;
	firstJump: Player | null = null;
	isElimination: boolean = false;
	queue: Player[] = [];
	revealTime: number = 3.5 * 1000;
	roundJumps = new Map<Player, boolean>();
	targetPokemon: string | null = null;
	terrainRound: number = 0;

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Games.getPokemonList(x => Dex.hasGifData(x));
		for (const pokemon of pokedex) {
			let used = false;
			for (const type of pokemon.types) {
				for (const key of terrainKeys) {
					if (type === terrains[key]) {
						data.pokemon[key].push(pokemon.name);
						if (!used) used = true;
						break;
					}
				}
			}
			if (!used) data.unusedPokemon.push(pokemon.name);
		}

		loadedData = true;
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (this.terrainRound > 1) {
			player.say("Sorry, the late-join period has ended.");
			return false;
		}
		return true;
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canJump = false;
		if (this.round > 1 && this.targetPokemon && this.currentTerrain) {
			if (!data.pokemon[this.currentTerrain].includes(this.targetPokemon)) {
				for (const i in this.players) {
					if (this.players[i].eliminated) continue;
					if (this.queue.includes(this.players[i]) || this.roundJumps.has(this.players[i])) this.eliminatePlayer(this.players[i], "You jumped on a Pokemon of the wrong type!");
				}
			} else {
				this.currentTerrain = null;
				const len = this.queue.length;
				if (len > 1 && this.isElimination) this.eliminatePlayer(this.queue[len - 1], "You were the last player to jump on " + this.targetPokemon + "!");
				for (const i in this.players) {
					if (this.players[i].eliminated) continue;
					if (!this.queue.includes(this.players[i])) this.eliminatePlayer(this.players[i], "You did not jump on " + this.targetPokemon + "!");
				}
				// if (len) this.markFirstAction(this.queue[0], 'firstJump');
			}
			if (this.getRemainingPlayerCount() < 2) return this.end();
		}
		let newTerrain = false;
		if (!this.currentTerrain) {
			this.currentTerrain = this.sampleOne(terrainKeys);
			newTerrain = true;
			this.terrainRound++;
			if (this.revealTime > 2000) this.revealTime -= 500;
			if (this.terrainRound === 20) {
				this.end();
				return;
			}
		}
		let targetPokemon: string;
		if (this.random(2)) {
			targetPokemon = this.sampleOne(data.pokemon[this.currentTerrain]);
		} else {
			targetPokemon = this.sampleOne(data.unusedPokemon);
		}
		this.targetPokemon = targetPokemon;
		this.roundJumps.clear();
		this.queue = [];
		const pokemonHtml = '<div class="infobox"><center>' + Dex.getPokemonGif(Dex.getExistingPokemon(this.targetPokemon)) + '<br />A wild <b>' + this.targetPokemon + '</b> appeared!</center></div>';
		if (newTerrain) {
			const roundHtml = this.getRoundHtml(this.getPlayerNames, null, "Round " + this.terrainRound);
			const uhtmlName = this.uhtmlBaseName + '-round';
			this.onUhtml(uhtmlName, roundHtml, () => {
				const terrainHtml = '<div class="infobox"><center><br />The terrain is <b>' + this.currentTerrain + '</b> (jump on a <b>' + terrains[this.currentTerrain!] + '</b> type)!<br />&nbsp;</center></div>';
				const uhtmlName = this.uhtmlBaseName + '-terrain';
				this.onUhtml(uhtmlName, terrainHtml, () => {
					// if (this.timeout) clearTimeout(this.timeout); // mocha tests
					this.timeout = setTimeout(() => {
						const uhtmlName = this.uhtmlBaseName + '-pokemon';
						this.onUhtml(uhtmlName, pokemonHtml, () => {
							this.canJump = true;
							// if (this.timeout) clearTimeout(this.timeout); // mocha tests
							this.timeout = setTimeout(() => this.nextRound(), this.revealTime);
						});
						this.sayUhtml(uhtmlName, pokemonHtml);
					}, this.revealTime);
				});
				this.timeout = setTimeout(() => this.sayUhtml(uhtmlName, terrainHtml), 5 * 1000);
			});
			this.sayUhtml(uhtmlName, roundHtml);
		} else {
			this.timeout = setTimeout(() => {
				const uhtmlName = this.uhtmlBaseName + '-pokemon';
				this.onUhtml(uhtmlName, pokemonHtml, () => {
					this.canJump = true;
					// if (this.timeout) clearTimeout(this.timeout); // mocha tests
					this.timeout = setTimeout(() => this.nextRound(), this.revealTime);
				});
				this.sayUhtml(uhtmlName, pokemonHtml);
			}, this.revealTime);
		}
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
			// if (player === this.firstJump) Games.unlockAchievement(this.room, player, "Rainbow Wing", this);
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<TapusTerrains>> = {
	jump: {
		command(target, room, user): GameCommandReturnType {
			if (!(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			if (this.roundJumps.has(player)) return false;
			this.roundJumps.set(player, true);
			if (!this.canJump) return false;
			this.queue.push(player);
			return true;
		},
	},
};

export const game: IGameFile<TapusTerrains> = {
	aliases: ['tapus', 'terrains', 'trace', 'tr'],
	category: 'reaction',
	class: TapusTerrains,
	commandDescriptions: [Config.commandCharacter + 'jump'],
	commands,
	description: "Players race through various terrains on Pokemon! Only jump on Pokemon of the appropriate type in each terrain.",
	formerNames: ["Terrain Race"],
	name,
	mascots: ['tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini'],
	variants: [
		{
			name: "Tapus' Terrains Elimination",
			isElimination: true,
			variant: "elimination",
		},
	],
};
