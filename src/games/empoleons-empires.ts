import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

class EmpoleonsEmpires extends Game {
	canGuess: boolean = false;
	playerAliases = new Map<Player, string>();
	aliasIds: string[] = [];
	currentPlayer: Player | null = null;
	maxPlayers: number = 15;
	points = new Map<Player, number>();
	successiveSuspects = new Map<Player, number>();

	onRemovePlayer(player: Player) {
		if (this.currentPlayer === player) return this.nextRound();
		if (this.getRemainingPlayerCount() < 2) this.end();
	}

	onStart() {
		this.say("Now requesting aliases!");
		for (const id in this.players) {
			if (!this.playerAliases.has(this.players[id])) this.players[id].say("Please select an alias to use with ``" + Config.commandCharacter + "alias [alias]``!");
		}
		this.timeout = setTimeout(() => {
			for (const id in this.players) {
				if (this.players[id].eliminated) continue;
				const player = this.players[id];
				if (!this.playerAliases.has(player)) {
					player.say("You were eliminated for not choosing an alias!");
					player.eliminated = true;
				}
			}
			this.nextRound();
		}, 60 * 1000);
	}

	onNextRound() {
		if (this.getRemainingPlayerCount() <= 1) return this.end();
		const aliases: string[] = [];
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			aliases.push(this.playerAliases.get(this.players[id])!);
		}
		const uhtmlName = this.uhtmlBaseName + '-aliases';
		const html = "<div class='infobox'><b>Remaining players (" + this.getRemainingPlayerCount() + ")</b>: " + this.getPlayerNames(this.getRemainingPlayers()) + "<br><br><b>Remaining aliases</b>: " + Tools.shuffle(aliases).join(", ") + ".</div>";
		this.onUhtml(uhtmlName, html, () => {
			if (!this.currentPlayer) this.currentPlayer = this.getRandomPlayer();
			const currentPlayer = this.currentPlayer;
			const text = "**" + this.currentPlayer.name + "** you're up! Please guess another player with ``" + Config.commandCharacter + "guess [user], [alias]``";
			this.on(text, () => {
				this.canGuess = true;
				this.timeout = setTimeout(() => {
					if (this.currentPlayer === currentPlayer) {
						this.say("**" + this.currentPlayer.name + "** (AKA " + this.playerAliases.get(this.currentPlayer!) + ") didn't suspect anyone and was eliminated!");
						this.currentPlayer.eliminated = true;
						this.currentPlayer = null;
					}
					this.nextRound();
				}, 30 * 1000);
			});
			this.say(text);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		if (this.getRemainingPlayerCount() === 1) {
			const winner = this.getFinalPlayer();
			this.say("**Winner**: " + winner.name);
			this.addBits(winner, 500);
			this.winners.set(winner, 1);
			for (const i in this.players) {
				if (i === winner.id) continue;
				const points = this.points.get(this.players[i]);
				if (!points) continue;
				this.addBits(this.players[i], 50 * points);
			}
		} else {
			this.say("No winners this game!");
		}
	}
}

const commands: Dict<ICommandDefinition<EmpoleonsEmpires>> = {
	guess: {
		command(target, room, user) {
			if (!this.canGuess || !(user.id in this.players) || this.players[user.id] !== this.currentPlayer) return;
			const player = this.players[user.id];
			const targets = target.split(",");
			if (targets.length !== 2) return this.say("Usage: ``" + Config.commandCharacter + "guess [player], [alias]``");
			const attackedPlayer = this.players[Tools.toId(targets[0])];
			if (!attackedPlayer) return this.say("You must specify a player in the game.");
			if (attackedPlayer === player) return this.say("You cannot guess your own alias.");
			if (attackedPlayer.eliminated) return this.say(attackedPlayer.name + " has already been eliminated.");
			let validAlias = false;
			const guessedAlias = Tools.toId(targets[1]);
			for (const id in this.players) {
				if (this.players[id].eliminated) continue;
				if (Tools.toId(this.playerAliases.get(this.players[id])) === guessedAlias) {
					validAlias = true;
					break;
				}
			}
			if (!validAlias) return user.say("You must specify an alias in the game.");
			this.canGuess = false;
			let successiveSuspects = this.successiveSuspects.get(player) || 0;
			if (guessedAlias === Tools.toId(this.playerAliases.get(attackedPlayer))) {
				this.say("Correct! " + attackedPlayer.name + " has been eliminated.");
				attackedPlayer.eliminated = true;
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
		},
		aliases: ['g'],
	},
	alias: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated) return;
			if (this.playerAliases.has(this.players[user.id])) return user.say("You have already chosen your alias!");
			const player = this.players[user.id];
			const alias = target.trim();
			if (alias.includes(',')) return user.say("Aliases cannot include commas.");
			const id = Tools.toId(target);
			if (!id || Tools.toAlphaNumeric(target).length !== target.length) {
				return user.say("Aliases can only contain alpha-numeric characters.");
			}
			if (alias.length > 15) {
				return user.say("Aliases must be shorter than 15 characters.");
			}
			const otherUser = Users.get(target);
			if (otherUser && otherUser.rooms.has(this.room as Room)) {
				return user.say("Aliases cannot be the names of other users in the room.");
			}
			if (this.aliasIds.includes(id)) {
				return user.say("That alias has already been chosen.");
			}
			if (Client.willBeFiltered(alias, this.room as Room)) {
				return user.say("Aliases cannot contain banned words.");
			}
			this.playerAliases.set(player, alias);
			this.aliasIds.push(id);
			user.say("You have chosen **" + alias + "** as your alias!");
		},
		aliases: ['nick'],
		pmOnly: true,
	},
	dqalias: {
		command(target, room, user) {
			if (!this.started || !user.hasRank(this.room as Room, 'driver')) return;
			let targetPlayer: Player | undefined;
			const targetAlias = Tools.toId(target);
			this.playerAliases.forEach((alias, player) => {
				if (!targetPlayer && Tools.toId(alias) === targetAlias) {
					targetPlayer = player;
				}
			});
			if (!targetPlayer) return user.say("Please specify a valid alias.");
			if (targetPlayer.eliminated) return user.say(targetPlayer.name + " is already eliminated.");
			this.removePlayer(targetPlayer.name);
			this.room.say("/modnote " + targetPlayer.name + " was DQed from " + this.name + " for using the alias '" + target.trim() + "'.");
		},
		pmOnly: true,
	},
};

export const game: IGameFile<EmpoleonsEmpires> = {
	aliases: ["empoleons"],
	battleFrontierCategory: 'Luck',
	commandDescriptions: [Config.commandCharacter + "alias [alias]", Config.commandCharacter + "guess [player], [alias]"],
	commands,
	class: EmpoleonsEmpires,
	description: "Players choose aliases and await their turns to guess the aliases of other players. A player will guess until they are incorrect, at which point it will be the guessed player's turn.",
	formerNames: ["Empires"],
	name: "Empoleon's Empires",
	mascot: "Empoleon",
};
