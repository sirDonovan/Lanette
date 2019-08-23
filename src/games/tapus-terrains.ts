import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
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
const data: {pokemon: KeyedDict<typeof terrains, string[]>, unusedPokemon: string[]} = {
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
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Dex.getPokemonList(x => Dex.hasGifData(x));
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			let used = false;
			for (let i = 0; i < pokemon.types.length; i++) {
				const type = pokemon.types[i];
				for (let i = 0; i < terrainKeys.length; i++) {
					if (type === terrains[terrainKeys[i]]) {
						data.pokemon[terrainKeys[i]].push(pokemon.species);
						if (!used) used = true;
						break;
					}
				}
			}
			if (!used) data.unusedPokemon.push(pokemon.species);
		}

		loadedData = true;
	}

	canJump: boolean = false;
	canLateJoin: boolean = true;
	currentTerrain: TerrainKey | null = null;
	firstJump: Player | null = null;
	queue: Player[] = [];
	revealTime: number = 3.5 * 1000;
	roundJumps = new Map<Player, boolean>();
	targetPokemon: string | null = null;
	terrainRound: number = 0;

	onStart() {
		this.nextRound();
	}

	onNextRound() {
		this.canJump = false;
		if (this.round > 1 && this.targetPokemon && this.currentTerrain) {
			if (!data.pokemon[this.currentTerrain].includes(this.targetPokemon)) {
				for (const i in this.players) {
					const player = this.players[i];
					if (player.eliminated) continue;
					if (this.queue.includes(player) || this.roundJumps.has(player)) player.eliminated = true;
				}
			} else {
				this.currentTerrain = null;
				const len = this.queue.length;
				if (len > 1 && (this.variant === "elimination" || (this.parentGame && this.parentGame.id === 'battlefrontier'))) this.players[this.queue[len - 1].id].eliminated = true;
				for (const i in this.players) {
					const player = this.players[i];
					if (player.eliminated) continue;
					if (!this.queue.includes(player)) player.eliminated = true;
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

	onEnd() {
		const len = this.getRemainingPlayerCount();
		if (len) {
			// let multiAchieve = len > 1;
			this.say("**Winner" + (len > 1 ? "s" : "") + "**: " + this.getPlayerNames());
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				this.winners.set(player, 1);
				this.addBits(player, 500);
				// if (player === this.firstJump) Games.unlockAchievement(this.room, player, "Rainbow Wing", this);
			}
		} else {
			this.say("All players fell to the ground! No winners this game.");
		}
	}
}

const commands: Dict<ICommandDefinition<TapusTerrains>> = {
	jump: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated) return;
			const player = this.players[user.id];
			if (this.roundJumps.has(player)) return;
			this.roundJumps.set(player, true);
			if (!this.canJump) return;
			this.queue.push(player);
		},
	},
};

export const game: IGameFile<TapusTerrains> = {
	aliases: ['tapus', 'terrains', 'trace', 'tr'],
	battleFrontierCategory: 'Reaction',
	class: TapusTerrains,
	commandDescriptions: [Config.commandCharacter + 'jump'],
	commands,
	description: "Players race through various terrains on Pokemon! Only jump on Pokemon of the appropriate type in each terrain.",
	formerNames: ["Terrain Race"],
	name,
	mascots: ['tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini'],
	modes: ["survival"],
	variants: [
		{
			name: "Tapus' Terrains Elimination",
			variant: "elimination",
		},
	],
};
