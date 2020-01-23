import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

class ChanseysEggToss extends Game {
	canToss: boolean = false;
	currentHolder: Player | null = null;
	maxPlayers: number = 20;
	holdTime: number = 0;
	roundTimes: number[] = [7000, 8000, 9000, 10000];

	onRenamePlayer(player: Player, oldId: string) {
		if (!this.started || player.eliminated) return;
		this.removePlayer(player.name);
		const text = player.name + " was DQed for changing names!";
		if (this.currentHolder) {
			this.say(text + " Moving to the next round.");
			this.currentHolder = null;
			return this.nextRound();
		}
		this.say(text);
	}

	onRemovePlayer(player: Player) {
		if (this.currentHolder && this.getRemainingPlayerCount() < 2) {
			this.say(player.name + " left the game!");
			this.end();
		}
	}

	onStart() {
		this.nextRound();
	}

	giveEgg(player: Player) {
		this.holdTime = Date.now();
		this.currentHolder = player;
	}

	explodeEgg() {
		if (this.currentHolder) {
			this.say("The egg exploded on " + this.currentHolder.name + "!");
			this.eliminatePlayer(this.currentHolder);
			this.currentHolder = null;
		}
		if (this.getRemainingPlayerCount() < 2) return this.end();
		this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	onNextRound() {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) {
			return this.end();
		} else if (remainingPlayerCount <= 4) {
			this.roundTimes = [5000, 6000, 7000, 8000];
			// this.achievementTime = this.roundTimes[this.roundTimes.length - 2];
		}

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const holder = this.shufflePlayers()[0];
				const text = "Chansey handed the egg to **" + holder.name + "**!";
				this.on(text, () => {
					let time: number;
					if (remainingPlayerCount === 2) {
						time = 5000;
					} else {
						time = this.sampleOne(this.roundTimes);
					}
					this.giveEgg(holder);
					this.canToss = true;
					this.timeout = setTimeout(() => {
						const text = "**BOOOOOM**";
						this.on(text, () => {
							this.canToss = false;
							this.timeout = setTimeout(() => this.explodeEgg(), 3000);
						});
						this.say(text);
					}, time);
				});
				this.say(text);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 250);
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<ChanseysEggToss>> = {
	toss: {
		command(target, room, user) {
			if (!this.canToss || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			if (player !== this.currentHolder) {
				player.say("You are not holding the egg!");
				return false;
			}

			const targetPlayer = this.players[Tools.toId(target)];
			if (!targetPlayer || targetPlayer.eliminated) {
				player.say("You must pass the egg to someone currently in the game!");
				return false;
			}
			if (player === targetPlayer) {
				player.say("You cannot pass the egg to yourself!");
				return false;
			}

			// if (Date.now() - this.holdTime >= this.achievementTime) Games.unlockAchievement(this.room, user, "Lucky Egg", this);
			this.giveEgg(targetPlayer);
			return true;
		},
		aliases: ['pass'],
	},
};

export const game: IGameFile<ChanseysEggToss> = {
	aliases: ['chanseys', 'eggtoss'],
	category: 'reaction',
	class: ChanseysEggToss,
	commands,
	commandDescriptions: [Config.commandCharacter + 'toss [player]'],
	description: "Players try to get rid of the egg before it explodes!",
	name: "Chansey's Egg Toss",
	mascot: "Chansey",
	scriptedOnly: true,
};
