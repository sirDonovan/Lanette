import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";

const name = "Landorus' War";
const data: {learnsets: Dict<readonly string[]>, moves: string[], pokemon: string[]} = {
	learnsets: {},
	moves: [],
	pokemon: [],
};
let loadedData = false;

class LandorusWar extends Game {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		const moveList = Dex.getMovesList(x => {
			if (x.id === 'hiddenpower' || (!x.basePower && !x.basePowerCallback)) return false;
			return true;
		});

		for (let i = 0; i < moveList.length; i++) {
			data.moves.push(moveList[i].id);
		}

		const pokemonList = Dex.getPokemonList(x => !!x.allPossibleMoves.length);
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			let moves = 0;
			for (let i = 0; i < pokemon.allPossibleMoves.length; i++) {
				if (data.moves.includes(pokemon.allPossibleMoves[i])) moves++;
			}
			if (moves < 20) continue;
			data.learnsets[pokemon.id] = pokemon.allPossibleMoves;
			data.pokemon.push(pokemon.id);
		}

		loadedData = true;
	}

	fakePokemon: string[] = [];
	playerAliases = new Map<Player, string>();
	playerAliasesList: string[] = [];
	playerPokemon = new Map<Player, IPokemon>();
	pokemonList: string[] = [];
	roundMoves = new Set<Player>();
	roundSuspects = new Set<Player>();
	suspectedPlayers = new Map<Player, number>();

	onRemovePlayer(player: Player) {
		const alias = this.playerAliases.get(player);
		if (alias) {
			const index = this.playerAliasesList.indexOf(alias);
			if (index !== -1) this.playerAliasesList.splice(index, 1);
		}
	}

	onStart() {
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
			fakes.push(Dex.getExistingPokemon(pokemonList[0]).species);
			pokemonList.shift();
			this.playerPokemon.set(player, pokemon);
			this.playerAliases.set(player, alias);
			player.say("You were assigned **" + pokemon.species + "** and the **" + alias + "** trainer class!");
		}
		this.playerAliasesList = this.shuffle(playerAliases);
		this.fakePokemon = fakes;

		this.nextRound();
	}

	onNextRound() {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return this.end();
		this.roundMoves.clear();
		this.roundSuspects.clear();
		let pokemonList: string[] = [];
		for (const i in this.players) {
			if (!this.players[i].eliminated) pokemonList.push(this.playerPokemon.get(this.players[i])!.species);
		}
		pokemonList = pokemonList.concat(this.fakePokemon);
		pokemonList.sort();
		this.pokemonList = pokemonList;

		let html = "<div class='infobox'>";
		html += "<b>Remaining Pokemon</b>: " + this.pokemonList.join(", ") + "<br /><br />";
		html += "<b>Remaining players (" + remainingPlayerCount + ")</b>: " + this.playerAliasesList.join(", ") + "<br /><br />";
		html += "Use <code>" + Config.commandCharacter + "use [move], [trainer]</code> and <code>" + Config.commandCharacter + "suspect [trainer], [Pokemon]</code> in PMs!";
		html += "</div>";

		const uhtmlName = this.uhtmlBaseName + '-pokemon';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
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

	getPlayerSummary(player: Player) {
		if (player.eliminated) return;
		player.say("You were assigned **" + this.playerPokemon.get(player)!.species + "** and you are the **" + this.playerAliases.get(player) + "**!");
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
		command(target, room, user) {
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
				player.say(playerPokemon.species + " does not learn **" + move.name + "**.");
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
				player.say("The move didn't do damage!");
			} else {
				const effectiveness = Dex.getEffectiveness(move, attackedPokemon);
				if (effectiveness === 0) {
					player.say("The move was neutral!");
				} else {
					player.say("The move was **" + (2 * Math.abs(effectiveness)) + "x** " + (effectiveness < 0 ? "resisted" : "super-effective") + "!");
				}
			}

			this.roundMoves.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	suspect: {
		command(target, room, user) {
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

			const pokemonid = Tools.toId(targets[1]);
			let pokemonInUse = false;
			for (let i = 0; i < this.pokemonList.length; i++) {
				if (Tools.toId(this.pokemonList[i]) === pokemonid) {
					pokemonInUse = true;
					break;
				}
			}
			if (!pokemonInUse) {
				const pokemon = Dex.getPokemon(pokemonid);
				if (!pokemon) {
					player.say("'" + targets[1] + "' is not a valid Pokemon.");
				} else {
					player.say("**" + pokemon.species + "** is not a Pokemon in this game.");
				}
				return false;
			}

			const targetPokemon = this.playerPokemon.get(targetPlayer)!;
			if (pokemonid === targetPokemon.id) {
				const targetAlias = this.playerAliases.get(targetPlayer)!;
				player.say("Correct! " + targetAlias + " was " + targetPlayer.name + ".");
				this.playerAliasesList.splice(this.playerAliasesList.indexOf(targetAlias), 1);
				targetPlayer.say("You have been suspected by " + player.name + " and eliminated from the game!");
				targetPlayer.eliminated = true;
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
	class: LandorusWar,
	commandDescriptions: [Config.commandCharacter + "use [move], [trainer]", Config.commandCharacter + "suspect [trainer], [Pokemon]"],
	commands,
	description: "Players try to identify the randomly chosen Pokemon of other players by using moves against them to discover their type. Players may only use moves of which the Pokemon they have been randomly assigned to is able to learn.",
	name,
	mascot: "Landorus",
	scriptedOnly: true,
};
