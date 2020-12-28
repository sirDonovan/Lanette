import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "spectralsnuffer";

const puffAchievementAmount = 15;

class ChandeluresCandles extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"spectralsnuffer": {name: "Spectral Snuffer", type: 'special', bits: 1000, description: 'puff candles ' +
			puffAchievementAmount + ' times'},
	};

	lastTarget: Player | null = null;
	lives = new Map<Player, number>();
	maxRound: number = 20;
	puffs = new Map<Player, number>();
	roundActions = new Map<Player, boolean>();
	roundTarget: Player | null = null;
	roundTimes: number[] = [3000, 4000, 5000, 6000];

	onStart(): void {
		for (const i in this.players) {
			this.lives.set(this.players[i], 3);
		}
		this.nextRound();
	}

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated) return;
		this.removePlayer(player.name, true);
		const text = player.name + " was DQed for changing names!";
		if (this.roundTarget) {
			this.say(text + " Moving to the next round.");
			this.roundTarget = null;
			return this.nextRound();
		}
		this.say(text);
	}

	exposeCandle(): void {
		if (this.getRemainingPlayerCount() < 2) return this.end();
		const players = this.shufflePlayers();
		let target = players.pop()!;
		while (target === this.lastTarget && players.length) {
			target = players.pop()!;
		}
		this.roundTarget = target;
		this.lastTarget = target;
		this.roundActions.clear();
		const text = this.roundTarget.name + "'s candle was exposed!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound(): void {
		this.roundTarget = null;
		const len = this.getRemainingPlayerCount();
		if (len <= 1) {
			this.end();
			return;
		}
		const html = this.getRoundHtml(players => this.getPlayerLives(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.exposeCandle(), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			const puffs = this.puffs.get(winner) || 0;
			let bits = 500;
			if (puffs > 5) bits += puffs * 50;
			this.addBits(winner, bits);
		} else {
			this.say("Chandelure extinguished the remaining candles!");
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				this.winners.set(player, 1);
				const puffs = this.puffs.get(player);
				if (!puffs) continue;
				const lives = this.lives.get(player)!;
				let bits;
				if (lives < 1) {
					bits = puffs * 50;
				} else {
					bits = puffs * 100;
				}
				this.addBits(player, bits);
			}
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<ChandeluresCandles> = {
	hide: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.roundTarget) return false;
			const player = this.players[user.id];
			if (player !== this.roundTarget) {
				user.say("Your candle was not exposed! Your movement used up one of your lives.");
				const lives = this.addLives(player, -1);
				if (!lives) this.eliminatePlayer(player, "You ran out of lives!");
				return false;
			}
			if (this.timeout) clearTimeout(this.timeout);
			this.say(this.roundTarget.name + " has safely escaped to the shadows...");
			this.roundTarget = null;
			this.timeout = setTimeout(() => this.nextRound(), 5000);
			return true;
		},
	},
	puff: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.roundTarget || this.roundActions.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) return false;
			const targetPlayer = this.players[id];
			if (targetPlayer !== this.roundTarget) {
				player.say("You aimed at the wrong person! Your puff used up one of your lives.");
				const lives = this.addLives(player, -1);
				if (!lives) this.eliminatePlayer(player, "You ran out of lives!");
				return false;
			}

			this.roundActions.set(player, true);
			if (targetPlayer.eliminated) return false;
			let puffs = this.puffs.get(player) || 0;
			puffs++;
			this.puffs.set(player, puffs);
			if (puffs === puffAchievementAmount) this.unlockAchievement(player, ChandeluresCandles.achievements.spectralsnuffer);
			const targetLives = this.addLives(targetPlayer, -1);
			if (!targetLives) {
				if (this.timeout) clearTimeout(this.timeout);
				this.say(targetPlayer.name + " has been eliminated from the game!");
				this.eliminatePlayer(targetPlayer, "You ran out of lives!");
				this.roundTarget = null;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return true;
		},
	},
};

export const game: IGameFile<ChandeluresCandles> = {
	aliases: ["chandelures", "candles", "cc"],
	category: 'reaction',
	commandDescriptions: [Config.commandCharacter + "hide", Config.commandCharacter + "puff [player]"],
	commands,
	class: ChandeluresCandles,
	description: "Players try to put out their opponents' candles for bits each round! If your candle is exposed, hide from others " +
		"before they can puff.",
	name: "Chandelure's Candles",
	mascot: "Chandelure",
};
