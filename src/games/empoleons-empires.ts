import type { Player } from "../room-activity";
import { Game } from "../room-game";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";

class EmpoleonsEmpires extends Game {
	canGuess: boolean = false;
	playerAliases = new Map<Player, string>();
	aliasIds: string[] = [];
	currentPlayer: Player | null = null;
	maxPlayers: number = 15;
	minPlayers: number = 4;
	points = new Map<Player, number>();
	successiveSuspects = new Map<Player, number>();

	onRemovePlayer(player: Player): void {
		if (this.started) {
			if (this.currentPlayer === player) return this.nextRound();
			if (this.getRemainingPlayerCount() < 2) this.end();
		}
	}

	onStart(): void {
		this.say("Now requesting aliases!");
		for (const i in this.players) {
			if (!this.playerAliases.has(this.players[i])) {
				this.players[i].say("Please select an alias to use with ``" +Config.commandCharacter + "alias [alias]``!");
			}
		}
		this.timeout = setTimeout(() => {
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				if (!this.playerAliases.has(this.players[i])) this.eliminatePlayer(this.players[i], "You did not choose an alias!");
			}
			this.nextRound();
		}, 60 * 1000);
	}

	onNextRound(): void {
		if (this.getRemainingPlayerCount() <= 1) return this.end();
		const aliases: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			aliases.push(this.playerAliases.get(this.players[i])!);
		}
		const uhtmlName = this.uhtmlBaseName + '-aliases';
		const html = "<div class='infobox'><b>Remaining players (" + this.getRemainingPlayerCount() + ")</b>: " +
			this.getPlayerNames(this.getRemainingPlayers()) + "<br><br><b>Remaining aliases</b>: " + Tools.shuffle(aliases).join(", ") +
			".</div>";
		this.onUhtml(uhtmlName, html, () => {
			if (!this.currentPlayer) this.currentPlayer = this.getRandomPlayer();
			const currentPlayer = this.currentPlayer;
			const text = "**" + this.currentPlayer.name + "** you are up! Please guess another player with ``" +
				Config.commandCharacter + "guess [user], [alias]``";
			this.on(text, () => {
				this.canGuess = true;
				this.timeout = setTimeout(() => {
					if (this.currentPlayer === currentPlayer) {
						this.say("**" + this.currentPlayer.name + "** (AKA " + this.playerAliases.get(this.currentPlayer) + ") did not " +
							"suspect anyone and was eliminated!");
						this.eliminatePlayer(this.currentPlayer, "You did not suspect another player!");
						this.currentPlayer = null;
					}
					this.nextRound();
				}, 30 * 1000);
			});
			this.say(text);
		});
		this.sayUhtmlAuto(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.addBits(winner, 500);
			this.winners.set(winner, 1);
			for (const i in this.players) {
				if (this.players[i] === winner) continue;
				const player = this.players[i];
				const points = this.points.get(player);
				if (!points) continue;
				this.addBits(player, 50 * points);
			}
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<EmpoleonsEmpires> = {
	/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
	guess: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canGuess || this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];
			const targets = target.split(",");
			if (targets.length !== 2) {
				this.say("Usage: ``" + Config.commandCharacter + "guess [player], [alias]``");
				return false;
			}
			const attackedPlayer = this.players[Tools.toId(targets[0])];
			if (!attackedPlayer) {
				this.say("You must specify a player in the game.");
				return false;
			}
			if (attackedPlayer === player) {
				this.say("You cannot guess your own alias.");
				return false;
			}
			if (attackedPlayer.eliminated) {
				this.say(attackedPlayer.name + " has already been eliminated.");
				return false;
			}
			let validAlias = false;
			const guessedAlias = Tools.toId(targets[1]);
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				if (Tools.toId(this.playerAliases.get(this.players[i])) === guessedAlias) {
					validAlias = true;
					break;
				}
			}
			if (!validAlias) {
				this.say("You must specify an alias in the game.");
				return false;
			}
			this.canGuess = false;
			let successiveSuspects = this.successiveSuspects.get(player) || 0;
			if (guessedAlias === Tools.toId(this.playerAliases.get(attackedPlayer))) {
				this.say("Correct! " + attackedPlayer.name + " has been eliminated from the game.");
				this.eliminatePlayer(attackedPlayer, "Your alias was guessed by " + player.name + "!");
				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);
				successiveSuspects++;
				this.successiveSuspects.set(player, successiveSuspects);
				// if (successiveSuspects === 5) Games.unlockAchievement(this.room, player, "Great Detective", this);
			} else {
				this.say("Incorrect.");
				this.currentPlayer = attackedPlayer;
				this.successiveSuspects.set(player, 0);
			}
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
		aliases: ['g'],
	},
	alias: {
		command(target, room, user): GameCommandReturnType {
			if (this.playerAliases.has(this.players[user.id])) {
				user.say("You have already chosen your alias!");
				return false;
			}
			const player = this.players[user.id];
			const alias = target.trim();
			if (alias.includes(',')) {
				user.say("Aliases cannot include commas.");
				return false;
			}
			const id = Tools.toId(target);
			if (!id || Tools.toAlphaNumeric(target).length !== target.length) {
				user.say("Aliases can only contain alpha-numeric characters.");
				return false;
			}
			if (alias.length > 15) {
				user.say("Aliases must be shorter than 15 characters.");
				return false;
			}
			const otherUser = Users.get(target);
			if (otherUser && otherUser.rooms.has(this.room as Room)) {
				user.say("Aliases cannot be the names of other users in the room.");
				return false;
			}
			if (this.aliasIds.includes(id)) {
				user.say("That alias has already been chosen.");
				return false;
			}
			if (Client.willBeFiltered(alias, this.room as Room)) {
				user.say("Aliases cannot contain banned words.");
				return false;
			}
			this.playerAliases.set(player, alias);
			this.aliasIds.push(id);
			user.say("You have chosen **" + alias + "** as your alias!");
			return true;
		},
		aliases: ['nick'],
		pmOnly: true,
	},
	dqalias: {
		command(target, room, user): GameCommandReturnType {
			if (!user.hasRank(this.room as Room, 'driver')) return false;
			let targetPlayer: Player | undefined;
			const targetAlias = Tools.toId(target);
			this.playerAliases.forEach((alias, player) => {
				if (!targetPlayer && Tools.toId(alias) === targetAlias) {
					targetPlayer = player;
				}
			});
			if (!targetPlayer) {
				user.say("Please specify a valid alias.");
				return false;
			}
			if (targetPlayer.eliminated) {
				user.say(targetPlayer.name + " is already eliminated.");
				return false;
			}
			this.removePlayer(targetPlayer.name);
			this.room.say("/modnote " + user.name + " DQed " + targetPlayer.name + " from " + this.name + " for using the alias '" +
				target.trim() + "'.");
			return true;
		},
		pmOnly: true,
		staffGameCommand: true,
	},
	/* eslint-enable */
};

export const game: IGameFile<EmpoleonsEmpires> = {
	aliases: ["empoleons"],
	commandDescriptions: [Config.commandCharacter + "alias [alias]", Config.commandCharacter + "guess [player], [alias]"],
	commands,
	class: EmpoleonsEmpires,
	description: "Players choose aliases and await their turns to guess the aliases of other players. A player will guess until they " +
		"are incorrect, at which point it will be the guessed player's turn.",
	formerNames: ["Empires"],
	name: "Empoleon's Empires",
	noOneVsOne: true,
	mascot: "Empoleon",
};
