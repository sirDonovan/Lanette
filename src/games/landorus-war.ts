import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, GameCommandReturnType } from "../types/games";
import { IPokemon } from "../types/dex";
import { User } from "../users";

const name = "Landorus' War";
const data: {learnsets: Dict<readonly string[]>; moves: string[]; pokemon: string[]} = {
	learnsets: {},
	moves: [],
	pokemon: [],
};
let loadedData = false;

class LandorusWar extends Game {
	fakePokemon: string[] = [];
	playerAliases = new Map<Player, string>();
	playerAliasesList: string[] = [];
	playerPokemon = new Map<Player, IPokemon>();
	pokemonList: string[] = [];
	roundMoves = new Set<Player>();
	roundSuspects = new Set<Player>();
	suspectedPlayers = new Map<Player, number>();

	static loadData(room: Room | User): void {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		const moveList = Games.getMovesList(x => {
			if (x.id === 'hiddenpower' || (!x.basePower && !x.hasBasePowerCallback)) return false;
			return true;
		});

		for (const move of moveList) {
			data.moves.push(move.id);
		}

		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			let moves = 0;
			const allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
			for (const move of allPossibleMoves) {
				if (data.moves.includes(move)) moves++;
			}
			if (moves < 20) continue;
			data.learnsets[pokemon.id] = allPossibleMoves;
			data.pokemon.push(pokemon.id);
		}

		loadedData = true;
	}

	onRemovePlayer(player: Player): void {
		const alias = this.playerAliases.get(player);
		if (alias) {
			const index = this.playerAliasesList.indexOf(alias);
			if (index !== -1) this.playerAliasesList.splice(index, 1);
		}
	}

	onStart(): void {
		this.say("Now handing out Pokemon!");
		const aliases = this.sampleMany(Dex.data.trainerClasses, this.getRemainingPlayerCount());
		const pokemonList = this.shuffle(data.pokemon);
		const playerAliases: string[] = [];
		const fakes: string[] = [];
		for (const i in this.players) {
			const player = this.players[i];
			const pokemon = Dex.getExistingPokemon(pokemonList[0]);
			pokemonList.shift();
			const alias = aliases[0];
			aliases.shift();
			playerAliases.push(alias);
			fakes.push(Dex.getExistingPokemon(pokemonList[0]).name);
			pokemonList.shift();
			this.playerPokemon.set(player, pokemon);
			this.playerAliases.set(player, alias);
			player.say("You were assigned **" + pokemon.name + "** and the **" + alias + "** trainer class!");
		}
		this.playerAliasesList = this.shuffle(playerAliases);
		this.fakePokemon = fakes;

		this.nextRound();
	}

	onNextRound(): void {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return this.end();
		this.roundMoves.clear();
		this.roundSuspects.clear();
		let pokemonList: string[] = [];
		for (const i in this.players) {
			if (!this.players[i].eliminated) pokemonList.push(this.playerPokemon.get(this.players[i])!.name);
		}
		pokemonList = pokemonList.concat(this.fakePokemon);
		pokemonList.sort();
		this.pokemonList = pokemonList;

		let html = "<div class='infobox'>";
		html += "<b>Remaining Pokemon</b>: " + this.pokemonList.join(", ") + "<br /><br />";
		html += "<b>Remaining players (" + remainingPlayerCount + ")</b>: " + this.playerAliasesList.join(", ") + "<br /><br />";
		html += "Use <code>" + Config.commandCharacter + "use [move], [trainer]</code> and <code>" + Config.commandCharacter +
			"suspect [trainer], [Pokemon]</code> in PMs!";
		html += "</div>";

		const uhtmlName = this.uhtmlBaseName + '-pokemon';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			const player = this.players[i];
			const caught = this.suspectedPlayers.get(player);
			if (!caught) continue;
			this.addBits(player, Math.min(1000, 125 * caught));
		}

		const winner = this.getFinalPlayer();
		if (winner) this.winners.set(winner, 1);
		this.announceWinners();
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		const pokemon = this.playerPokemon.get(player);
		if (!pokemon) return player.say("You have not been assigned a Pokemon yet.");
		const alias = this.playerAliases.get(player);
		if (!alias) return player.say("You have not been assigned an alias yet.");
		player.say("You were assigned **" + pokemon.name + "** and you are the **" + alias + "**!");
	}

	getPlayerByAlias(alias: string, excludedPlayer: Player): Player | null {
		alias = Tools.toId(alias);
		for (const i in this.players) {
			if (this.players[i] !== excludedPlayer && alias === Tools.toId(this.playerAliases.get(this.players[i]))) return this.players[i];
		}
		return null;
	}
}

const commands: Dict<ICommandDefinition<LandorusWar>> = {
	use: {
		command(target, room, user): GameCommandReturnType {
			if (!this.started) return false;
			const player = this.players[user.id];
			if (!player || player.eliminated) return false;
			if (this.roundMoves.has(player)) {
				player.say("You have already used a move this round!");
				return false;
			}

			const targets = target.split(",");
			if (targets.length < 2) {
				player.say("You must specify a move and a trainer class.");
				return false;
			}

			const move = Dex.getMove(targets[0]);
			if (!move) {
				player.say("'" + targets[0] + "' is not a valid move.");
				return false;
			}
			if (!data.moves.includes(move.id)) {
				player.say("**" + move.name + "** cannot be used in this game.");
				return false;
			}

			const playerPokemon = this.playerPokemon.get(player)!;
			if (!data.learnsets[playerPokemon.id].includes(move.id)) {
				player.say(playerPokemon.name + " does not learn **" + move.name + "**.");
				return false;
			}

			const alias = targets.slice(1).join(",");
			if (alias === Tools.toId(this.playerAliases.get(player))) {
				player.say("You cannot use a move on yourself!");
				return false;
			}
			const attackedPlayer = this.getPlayerByAlias(alias, player);
			if (!attackedPlayer) {
				player.say("'" + alias + "' is not a trainer class in this game.");
				return false;
			}
			if (attackedPlayer.eliminated) {
				player.say("The player with that trainer class has already been eliminated.");
				return false;
			}

			const attackedPokemon = this.playerPokemon.get(attackedPlayer)!;
			if (Dex.isImmune(move, attackedPokemon)) {
				player.say("The move had no effect!");
			} else {
				const effectiveness = Dex.getEffectiveness(move, attackedPokemon);
				if (effectiveness === 0) {
					player.say("The move was neutral!");
				} else {
					player.say("The move was **" + (2 * Math.abs(effectiveness)) + "x** " +
						(effectiveness < 0 ? "resisted" : "super-effective") + "!");
				}
			}

			this.roundMoves.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	suspect: {
		command(target, room, user): GameCommandReturnType {
			if (!this.started || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			if (this.roundSuspects.has(player)) {
				player.say("You have already suspected a trainer this round!");
				return false;
			}

			const targets = target.split(",");
			if (targets.length !== 2) {
				player.say("You must specify the player and the Pokemon.");
				return false;
			}

			const alias = targets[0];
			const targetPlayer = this.getPlayerByAlias(alias, player);
			if (alias === Tools.toId(this.playerAliases.get(player))) {
				player.say("You cannot suspect yourself!");
				return false;
			}
			if (!targetPlayer) {
				player.say("'" + alias + "' is not a trainer class in this game.");
				return false;
			}
			if (targetPlayer.eliminated) {
				player.say("The player with that trainer class has already been eliminated.");
				return false;
			}

			const pokemonId = Tools.toId(targets[1]);
			let pokemonInUse = false;
			for (const pokemon of this.pokemonList) {
				if (Tools.toId(pokemon) === pokemonId) {
					pokemonInUse = true;
					break;
				}
			}
			if (!pokemonInUse) {
				const pokemon = Dex.getPokemon(pokemonId);
				if (!pokemon) {
					player.say("'" + targets[1] + "' is not a valid Pokemon.");
				} else {
					player.say("**" + pokemon.name + "** is not a Pokemon in this game.");
				}
				return false;
			}

			const targetPokemon = this.playerPokemon.get(targetPlayer)!;
			if (pokemonId === targetPokemon.id) {
				const targetAlias = this.playerAliases.get(targetPlayer)!;
				player.say("Correct! " + targetAlias + " was " + targetPlayer.name + ".");
				this.playerAliasesList.splice(this.playerAliasesList.indexOf(targetAlias), 1);
				this.eliminatePlayer(targetPlayer, "You were suspected by " + player.name + "!");
				const suspectedPlayers = this.suspectedPlayers.get(player) || 0;
				this.suspectedPlayers.set(player, suspectedPlayers + 1);
				if (this.getRemainingPlayerCount() < 2) {
					this.end();
					return true;
				}
			} else {
				player.say("Incorrect!");
			}

			this.roundSuspects.add(player);
			return true;
		},
		pmGameCommand: true,
	},
};
commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['role'];

export const game: IGameFile<LandorusWar> = {
	aliases: ['landorus', 'lw'],
	category: 'knowledge',
	class: LandorusWar,
	commandDescriptions: [Config.commandCharacter + "use [move], [trainer]", Config.commandCharacter + "suspect [trainer], [Pokemon]"],
	commands,
	description: "Players try to identify the randomly chosen Pokemon of other players by using moves against them to discover their " +
		"type. Players may only use moves of which the Pokemon they have been randomly assigned to is able to learn.",
	name,
	mascot: "Landorus",
	scriptedOnly: true,
};
