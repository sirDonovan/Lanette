import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";

type AchievementNames = "hotpotatohero";

const hotPotatoHeroTime = 9000;

class ChanseysEggToss extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"hotpotatohero": {name: "Hot Potato Hero", type: 'special', bits: 1000, description: 'hold the egg for ' +
			(hotPotatoHeroTime / 1000) + ' seconds'},
	};

	canToss: boolean = false;
	currentHolder: Player | null = null;
	maxPlayers: number = 20;
	holdTime: number = 0;
	roundTimes: number[] = [7000, 8000, 9000, 10000];

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated) return;
		const reason = "for changing their username";
		if (this.currentHolder) {
			this.currentHolder = player;
			this.explodeEgg(reason);
		} else {
			this.eliminatePlayer(player, "You cannot change your username!");
			this.say(player.name + " was DQed " + reason + "!");
		}
	}

	onUserLeaveRoom(room: Room, user: User): void {
		if (!this.started || !this.currentHolder || !(user.id in this.players) || this.players[user.id].eliminated) return;
		this.currentHolder = this.players[user.id];
		this.explodeEgg("for leaving the room");
	}

	onRemovePlayer(player: Player): void {
		if (this.currentHolder && this.getRemainingPlayerCount() < 2) {
			this.say(player.name + " left the game!");
			this.end();
		}
	}

	onStart(): void {
		this.nextRound();
	}

	giveEgg(player: Player): void {
		this.holdTime = Date.now();
		this.currentHolder = player;
	}

	explodeEgg(reason?: string): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.currentHolder) {
			this.say("The egg exploded on **" + this.currentHolder.name + "**" + (reason ? " " + reason : "") + "!");
			this.eliminatePlayer(this.currentHolder);
			this.currentHolder = null;
		}

		if (this.getRemainingPlayerCount() < 2) return this.end();
		this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	onNextRound(): void {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) {
			return this.end();
		} else if (remainingPlayerCount <= 4) {
			// this.roundTimes = [5000, 6000, 7000, 8000];
		}

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const holder = this.shufflePlayers()[0];
				const eggText = "Chansey handed the egg to **" + holder.name + "**!";
				this.on(eggText, () => {
					let time: number;
					if (remainingPlayerCount === 2) {
						time = 5000;
					} else {
						time = this.sampleOne(this.roundTimes);
					}
					this.giveEgg(holder);
					this.canToss = true;
					this.timeout = setTimeout(() => {
						const boomText = "**BOOOOOM**";
						this.on(boomText, () => {
							this.canToss = false;
							this.timeout = setTimeout(() => this.explodeEgg(), 3000);
						});
						this.say(boomText);
					}, time);
				});
				this.say(eggText);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 250);
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<ChanseysEggToss> = {
	toss: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canToss) return false;
			const player = this.players[user.id];
			if (player !== this.currentHolder) {
				player.say("You are not holding the egg!");
				return false;
			}

			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) {
				player.say("You must pass the egg to someone currently in the game!");
				return false;
			}
			if (player === this.players[id]) {
				player.say("You cannot pass the egg to yourself!");
				return false;
			}

			if (Date.now() - this.holdTime >= hotPotatoHeroTime) this.unlockAchievement(player, ChanseysEggToss.achievements.hotpotatohero);
			this.giveEgg(this.players[id]);
			return true;
		},
		aliases: ['pass'],
	},
};

export const game: IGameFile<ChanseysEggToss> = {
	aliases: ['chanseys', 'eggtoss'],
	class: ChanseysEggToss,
	commands,
	commandDescriptions: [Config.commandCharacter + 'toss [player]'],
	description: "Players try to get rid of the egg before it explodes!",
	name: "Chansey's Egg Toss",
	mascot: "Chansey",
	scriptedOnly: true,
};
