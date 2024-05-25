import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";

type AchievementNames = "hotpotatohero";

const maxSpamTosses = 3;
const hotPotatoHeroTime = 9000;

class ChanseysEggToss extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"hotpotatohero": {name: "Hot Potato Hero", type: 'special', bits: 1000, description: 'hold the egg for ' +
			(hotPotatoHeroTime / 1000) + ' seconds'},
	};

	canToss: boolean = false;
	currentHolder: Player | null = null;
	hasAssistActions: boolean = true;
	maxPlayers: number = 20;
	holdTime: number = 0;
	roundTimes: number[] = [7000, 8000, 9000, 10000];
	spamTosses = new Map<Player, number>();

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated) return;
		const reason = "for changing their username";
		if (this.currentHolder) {
			this.currentHolder = player;
			this.explodeEgg(reason);
		} else {
			this.say(player.name + " was DQed " + reason + "!");
			this.eliminatePlayer(player);
		}
	}

	onUserLeaveRoom(room: Room, user: User): void {
		super.onUserLeaveRoom(room, user);

		if (!this.started || !this.currentHolder || !(user.id in this.players) || this.players[user.id].eliminated) return;
		this.currentHolder = this.players[user.id];
		this.explodeEgg("for leaving the room");
	}

	onRemovePlayer(player: Player): void {
		if (this.started && this.getRemainingPlayerCount() < 2) {
			this.say(player.name + " left the game!");
			this.end();
		}
	}

	onEliminatePlayer(): void {
		if (this.getRemainingPlayerCount() < 2) this.end();
	}

	giveEgg(player: Player): void {
		const previousHolder = this.currentHolder;

		this.holdTime = Date.now();
		this.currentHolder = player;

		const buttons: string[] = [];
		for (const i in this.players) {
			if (!this.players[i].eliminated && this.players[i] !== player) {
				buttons.push(this.getMsgRoomButton("toss " + this.players[i].name, "Toss to <b>" + this.players[i].name + "</b>",
					false, player));
			}
		}

		this.sendPlayerAssistActions(player, this.getCustomButtonsDiv(buttons, player), this.actionsUhtmlName);
		if (previousHolder) this.clearPlayerAssistActions(previousHolder, this.actionsUhtmlName);
	}

	explodeEgg(reason?: string): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.currentHolder) {
			this.say("The egg exploded on **" + this.currentHolder.name + "**" + (reason ? " " + reason : "") + "!");
			this.eliminatePlayer(this.currentHolder);
			this.currentHolder = null;
		}

		this.setTimeout(() => void this.nextRound(), 5000);
	}

	async onNextRound(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		this.spamTosses.clear();

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.setTimeout(() => {
				const holder = this.shufflePlayers()[0];
				const eggText = "Chansey handed the egg to **" + holder.name + "**!";
				this.on(eggText, () => {
					let time: number;
					if (this.getRemainingPlayerCount() === 2) {
						time = 5000;
					} else {
						time = this.sampleOne(this.roundTimes);
					}
					this.giveEgg(holder);
					this.canToss = true;
					this.setTimeout(() => {
						const boomText = "**BOOOOOM**";
						this.on(boomText, () => {
							this.canToss = false;
							this.setTimeout(() => this.explodeEgg(), 3000);
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

	destroyPlayers(): void {
		super.destroyPlayers();

		this.spamTosses.clear();
	}
}

const commands: GameCommandDefinitions<ChanseysEggToss> = {
	toss: {
		command(target, room, user) {
			if (!this.canToss) return false;
			if (this.players[user.id] !== this.currentHolder) {
				let spamTosses = this.spamTosses.get(this.players[user.id]) || 0;
				spamTosses++;
				if (spamTosses === maxSpamTosses) {
					this.currentHolder = this.players[user.id];
					this.explodeEgg("for spam tossing");
				} else {
					this.spamTosses.set(this.players[user.id], spamTosses);
				}

				return false;
			}

			const player = this.players[user.id];
			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) {
				player.sayPrivateHtml("You must pass the egg to someone currently in the game!");
				return false;
			}
			if (player === this.players[id]) {
				player.sayPrivateHtml("You cannot pass the egg to yourself!");
				return false;
			}

			this.spamTosses.delete(player);
			if (Date.now() - this.holdTime >= hotPotatoHeroTime) this.unlockAchievement(player, ChanseysEggToss.achievements.hotpotatohero);
			this.giveEgg(this.players[id]);
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
};
