import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

class ChandeluresCandles extends Game {
	lastTarget: Player | null = null;
	lives = new Map<Player, number>();
	puffs = new Map<Player, number>();
	roundActions = new Map<Player, boolean>();
	roundLimit: number = 20;
	roundTarget: Player | null = null;
	roundTimes: number[] = [3000, 4000, 5000, 6000];

	onStart() {
		for (const i in this.players) {
			this.lives.set(this.players[i], 3);
		}
		this.nextRound();
	}

	onRenamePlayer(player: Player, oldId: string) {
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

	exposeCandle() {
		if (this.getRemainingPlayerCount() < 2) return this.end();
		const players = this.shufflePlayers();
		let target = players.pop();
		while (target === this.lastTarget && players.length) {
			target = players.pop();
		}
		if (!target) throw new Error("No target player");
		this.roundTarget = target;
		this.lastTarget = target;
		this.roundActions.clear();
		const text = this.roundTarget.name + "'s candle was exposed!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound() {
		this.roundTarget = null;
		const len = this.getRemainingPlayerCount();
		if (len === 1) {
			this.end();
			return;
		}
		if (this.round > this.roundLimit) return this.end();
		let time = 5000;
		if (this.parentGame && this.parentGame.id === 'battlefrontier') time = this.sampleOne(this.roundTimes);
		const html = this.getRoundHtml(this.getPlayerLives);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.exposeCandle(), time);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		const len = this.getRemainingPlayerCount();
		if (len === 1) {
			const winner = this.getFinalPlayer();
			this.winners.set(winner, 1);
			this.say("**Winner:** " + winner.name);
			const puffs = this.puffs.get(winner) || 0;
			let bits = 500;
			if (puffs > 5) {
				bits += (puffs * 50);
				if (bits > 1000) bits = 1000;
			}
			this.addBits(winner, bits);
		} else {
			this.say("**Chandelure extinguished the remaining candle" + (len > 1 ? "s" : "") + "! Winner" + (len > 1 ? "s" : "") + "**: " + this.getPlayerNames());
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				this.winners.set(player, 1);
				const puffs = this.puffs.get(player);
				if (!puffs) continue;
				const lives = this.lives.get(player)!;
				let bits;
				if (lives < 1) {
					bits = puffs * 50;
				} else {
					bits = puffs * 100;
					if (bits > 1000) bits = 1000;
				}
				this.addBits(player, bits);
			}
		}
	}
}

const commands: Dict<ICommandDefinition<ChandeluresCandles>> = {
	hide: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated || !this.roundTarget) return;
			const player = this.players[user.id];
			if (player !== this.roundTarget) {
				let lives = this.lives.get(player);
				if (!lives) throw new Error(player.name + " has no lives");
				lives -= 1;
				user.say("Your candle was not exposed! Your swift movements used up one of your lives.");
				this.lives.set(player, lives);
				if (lives < 1) this.players[user.id].eliminated = true;
				return;
			}
			if (this.timeout) clearTimeout(this.timeout);
			this.say(this.roundTarget.name + " has safely escaped to the shadows...");
			this.roundTarget = null;
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		},
	},
	puff: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated || !this.roundTarget) return;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return;
			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) return;
			const targetPlayer = this.players[id];
			if (targetPlayer !== this.roundTarget) {
				let lives = this.lives.get(player)!;
				lives -= 1;
				user.say("You aimed at the wrong person! Your puff used up one of your lives.");
				if (lives < 1) this.players[user.id].eliminated = true;
				this.lives.set(player, lives);
				return;
			}
			this.roundActions.set(player, true);
			let targetLives = this.lives.get(targetPlayer)!;
			if (targetLives === 0) return;
			targetLives -= 1;
			this.lives.set(targetPlayer, targetLives);
			const puffs = this.puffs.get(player) || 0;
			this.puffs.set(player, (puffs + 1));
			// if (puffs >= 15) Games.unlockAchievement(this.room, player, "Blown Out", this);
			if (targetLives < 1) {
				if (this.timeout) clearTimeout(this.timeout);
				this.say(targetPlayer.name + " has been eliminated");
				targetPlayer.eliminated = true;
				this.roundTarget = null;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
		},
	},
};

export const game: IGameFile<ChandeluresCandles> = {
	aliases: ["chandelures", "candles", "cc"],
	battleFrontierCategory: 'Reaction',
	commandDescriptions: [Config.commandCharacter + "hide", Config.commandCharacter + "puff [player]"],
	commands,
	class: ChandeluresCandles,
	description: "Players try to blow out their opponents' candles for bits each round! If your candle is exposed, hide from others before they blow it out.",
	name: "Chandelure's Candles",
	mascot: "Chandelure",
};
