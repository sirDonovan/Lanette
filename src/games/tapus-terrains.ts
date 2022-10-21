import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const terrains = {
	'Basic': 'Normal',
	'Cavernous': 'Dragon',
	'Cloudy': 'Flying',
	'Electrified': 'Electric',
	'Grassy': 'Grass',
	'Infested': 'Bug',
	'Metallic': 'Steel',
	'Misty': 'Fairy',
	'Molten': 'Fire',
	'Rocky': 'Rock',
	'Sandy': 'Ground',
	'Shady': 'Dark',
	'Snowy': 'Ice',
	'Spooky': 'Ghost',
	'Swampy': 'Water',
	'Twisted': 'Psychic',
	'Venomous': 'Poison',
	'Violent': 'Fighting',
};
type TerrainKey = keyof typeof terrains;
const terrainKeys = Object.keys(terrains) as TerrainKey[];
const data: {pokemon: KeyedDict<TerrainKey, string[]>} = {
	pokemon: {
		'Basic': [],
		'Cavernous': [],
		'Cloudy': [],
		'Electrified': [],
		'Grassy': [],
		'Infested': [],
		'Metallic': [],
		'Misty': [],
		'Molten': [],
		'Rocky': [],
		'Sandy': [],
		'Shady': [],
		'Snowy': [],
		'Spooky': [],
		'Swampy': [],
		'Twisted': [],
		'Venomous': [],
		'Violent': [],
	},
};

class TapusTerrains extends ScriptedGame {
	canJump: boolean = false;
	canLateJoin: boolean = true;
	currentTerrain: TerrainKey | null = null;
	firstJump: Player | null = null;
	isElimination: boolean = false;
	points = new Map<Player, number>();
	queue: Player[] = [];
	roundTime: number = 4 * 1000;
	roundJumps = new Map<Player, boolean>();
	targetPokemon: string | null = null;
	terrainDisplayTime: number = 5 * 1000;
	terrainRound: number = 0;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (!Dex.hasModelData(pokemon)) continue;

			for (const type of pokemon.types) {
				for (const key of terrainKeys) {
					if (type === terrains[key]) {
						data.pokemon[key].push(pokemon.name);
						break;
					}
				}
			}
		}
	}

	onSignups(): void {
		if (this.options.freejoin) {
			this.roundTime = 3 * 1000;
			this.terrainDisplayTime = 3 * 1000;
			this.setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	onStart(): void {
		this.nextRound();
	}

	getDisplayedRoundNumber(): number {
		return this.terrainRound;
	}

	onNextRound(): void {
		this.canJump = false;
		if (this.round > 1 && this.targetPokemon && this.currentTerrain) {
			if (!data.pokemon[this.currentTerrain].includes(this.targetPokemon)) {
				if (!this.options.freejoin) {
					for (const i in this.players) {
						if (this.players[i].eliminated) continue;
						if (this.queue.includes(this.players[i]) || this.roundJumps.has(this.players[i])) {
							this.eliminatePlayer(this.players[i], "You jumped on a Pokemon of the wrong type!");
						}
					}
				}
			} else {
				this.currentTerrain = null;
				if (!this.options.freejoin) {
					const len = this.queue.length;
					if (len > 1 && this.isElimination) {
						this.eliminatePlayer(this.queue[len - 1], "You were the last player to jump on " + this.targetPokemon + "!");
					}
					for (const i in this.players) {
						if (this.players[i].eliminated) continue;
						if (!this.queue.includes(this.players[i])) {
							this.eliminatePlayer(this.players[i], "You did not jump on " + this.targetPokemon + "!");
						}
					}
					// if (len) this.markFirstAction(this.queue[0], 'firstJump');
				}
			}

			if (!this.options.freejoin && this.getRemainingPlayerCount() < 2) return this.end();
		}

		let newTerrain = false;
		if (!this.currentTerrain) {
			this.currentTerrain = this.sampleOne(terrainKeys);
			newTerrain = true;
			this.terrainRound++;
			if (this.canLateJoin && this.terrainRound > 1) this.canLateJoin = false;

			if (this.options.freejoin) {
				this.roundJumps.clear();
			} else {
				if (this.roundTime > 2000) this.roundTime -= 500;
				if (this.terrainRound > 20) {
					this.end();
					return;
				}
			}
		}

		let targetPokemon = '';
		if (this.random(2)) {
			targetPokemon = this.sampleOne(data.pokemon[this.currentTerrain]);
		} else {
			while (!targetPokemon || data.pokemon[this.currentTerrain].includes(targetPokemon)) {
				let otherTerrain = this.sampleOne(terrainKeys);
				while (otherTerrain === this.currentTerrain) {
					otherTerrain = this.sampleOne(terrainKeys);
				}
				targetPokemon = this.sampleOne(data.pokemon[otherTerrain]);
			}
		}
		this.targetPokemon = targetPokemon;
		this.queue = [];

		if (!this.options.freejoin) this.roundJumps.clear();

		const roundTime = this.getRoundTime();
		const pokemonHtml = '<div class="infobox"><center>' + Dex.getPokemonModel(Dex.getExistingPokemon(this.targetPokemon)) +
			'<br />A wild <b>' + this.targetPokemon + '</b> appeared!</center></div>';
		if (newTerrain) {
			const roundHtml = this.getRoundHtml(players => this.options.freejoin ? this.getPlayerPoints(players) :
				this.getPlayerNames(players));
			const roundUhtmlName = this.uhtmlBaseName + '-round';
			this.onUhtml(roundUhtmlName, roundHtml, () => {
				const terrainHtml = '<div class="infobox"><center><br />The terrain is <b>' + this.currentTerrain + '</b> (jump on <b>' +
					terrains[this.currentTerrain!] + '</b> type Pokemon)!<br />&nbsp;</center></div>';
				const terrainUhtmlName = this.uhtmlBaseName + '-terrain';
				this.onUhtml(terrainUhtmlName, terrainHtml, () => {
					this.setTimeout(() => {
						const pokemonUhtmlName = this.uhtmlBaseName + '-pokemon';
						this.onUhtml(pokemonUhtmlName, pokemonHtml, () => {
							this.canJump = true;
							if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint("", [], true);
							this.setTimeout(() => this.nextRound(), roundTime);
						});
						this.sayUhtml(pokemonUhtmlName, pokemonHtml);
					}, roundTime);
				});
				this.setTimeout(() => this.sayUhtml(terrainUhtmlName, terrainHtml), this.terrainDisplayTime);
			});
			this.sayUhtml(roundUhtmlName, roundHtml);
		} else {
			this.setTimeout(() => {
				const uhtmlName = this.uhtmlBaseName + '-pokemon';
				this.onUhtml(uhtmlName, pokemonHtml, () => {
					this.canJump = true;
					if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint("", [], false);
					this.setTimeout(() => this.nextRound(), roundTime);
				});
				this.sayUhtmlAuto(uhtmlName, pokemonHtml);
			}, roundTime);
		}
	}

	onEnd(): void {
		this.convertPointsToBits(0);

		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
			// if (player === this.firstJump) Games.unlockAchievement(this.room, player, "Rainbow Wing", this);
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundJumps.clear();
	}

	isValidJump(): boolean {
		if (this.currentTerrain && this.targetPokemon && data.pokemon[this.currentTerrain].includes(this.targetPokemon)) return true;
		return false;
	}

	botChallengeTurn(botPlayer: Player): void {
		if (!this.isValidJump()) return;

		this.setBotTurnTimeout(() => {
			const command = "jump";
			const text = Config.commandCharacter + command;
			this.on(text, () => {
				botPlayer.useCommand(command);
			});
			this.say(text);
		}, this.sampleOne(this.botChallengeSpeeds!));
	}
}

const commands: GameCommandDefinitions<TapusTerrains> = {
	jump: {
		command(target, room, user) {
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundJumps.has(player)) return false;
			this.roundJumps.set(player, true);
			if (!this.canJump) return false;

			if (this.options.freejoin) {
				if (this.isValidJump()) {
					if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);
					if (this.timeout) clearTimeout(this.timeout);

					this.currentTerrain = null;
					const points = this.addPoints(player, 1);
					if (points === this.options.points) {
						for (const i in this.players) {
							if (this.players[i] !== player) this.players[i].eliminated = true;
						}
						this.end();
						return true;
					} else {
						this.say("**" + player.name + "** advances to **" + points + "** point" + (points > 1 ? "s" : "") + "!");
						this.setTimeout(() => {
							this.roundJumps.clear();
							this.nextRound();
						}, 3 * 1000);
					}
				}
			} else {
				this.queue.push(player);
			}
			return true;
		},
	},
};

export const game: IGameFile<TapusTerrains> = {
	aliases: ['tapus', 'terrains', 'trace', 'tr'],
	challengeSettings: {
		botchallenge: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
		onevsone: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
	},
	category: 'reaction',
	class: TapusTerrains,
	commandDescriptions: [Config.commandCharacter + 'jump'],
	commands,
	defaultOptions: ['freejoin', 'points'],
	description: "Players race through various terrains on Pokemon! Only jump on Pokemon of the appropriate type in each terrain.",
	formerNames: ["Terrain Race"],
	name: "Tapus' Terrains",
	mascots: ['tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini'],
	mascotPrefix: "Tapus'",
	variants: [
		{
			name: "Tapus' Terrains Elimination",
			isElimination: true,
			variantAliases: ["elimination"],
			defaultOptions: [],
		},
	],
};
