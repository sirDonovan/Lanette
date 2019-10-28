import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

class MagikarpsWaterWheel extends Game {
	achievementGetters = new Map<Player, boolean>();
	canLateJoin: boolean = true;
	canStay: boolean = false;
	points = new Map<Player, number>();
	roundCarp: boolean = false;

	onAddPlayer(player: Player, lateJoin?: boolean) {
		if (lateJoin) {
			if (this.round > 1) return false;
		}
		return true;
	}

	onStart() {
		this.say("Use ``" + Config.commandCharacter + "stay`` to stop with your current score any round!");
		this.nextRound();
	}

	spinWheel(player: Player) {
		let magikarp = false;
		if (!(this.round < 6 && this.roundCarp) && (this.random(10) + 1) <= 3) {
			magikarp = true;
			if (!this.roundCarp) this.roundCarp = true;
		}
		if (magikarp) {
			this.eliminatePlayer(player, "The wheel landed on a **Magikarp**!");
		} else {
			let points = this.points.get(player) || 0;
			/*
			if (!this.random(100)) {
				player.say("The wheel landed on something sparkling...");
				Games.unlockAchievement(this.room, user, "golden Magikarp", this);
				points += 1000;
				player.say("The golden Magikarp was worth 1000 points! Your score is now **" + points + "**.");
			} else {
			*/
			const spin = this.random(12) + 1;
			const previousPoints = points;
			if (spin <= 3) {
				points += 100;
			} else if (spin <= 5) {
				points += 200;
			} else if (spin <= 7) {
				points += 300;
			} else if (spin <= 9) {
				points += 400;
			} else if (spin === 10) {
				points += 500;
			} else if (spin === 11) {
				points += 600;
			} else if (spin === 12) {
				points += 700;
			}
			player.say("The wheel landed on " + (points - previousPoints) + "! Your score is now **" + points + "**.");
			this.points.set(player, points);
			/*
			if (points >= 4000 && !this.achievementGetters.has(player)) {
				Games.unlockAchievement(this.room, user, "Fish out of Water", this);
				this.achievementGetters.set(player, true);
			}
			*/
		}
	}
	onNextRound() {
		this.canStay = false;
		if (this.round > 1) {
			for (const i in this.players) {
				if (this.players[i].eliminated || this.players[i].frozen) continue;
				this.spinWheel(this.players[i]);
			}
		}

		const len = this.getRemainingPlayerCount();
		if (!len) return this.end();
		this.roundCarp = false;
		const uhtmlName = this.uhtmlBaseName + '-round';
		const html = this.getRoundHtml(this.getPlayerPoints);
		this.onUhtml(uhtmlName, html, () => {
			this.canStay = true;
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		const bits = new Map<Player, number>();
		let highestPoints = 0;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			bits.set(player, Math.min(250, points / 10));
			if (points > highestPoints) {
				this.winners.clear();
				this.winners.set(player, 1);
				highestPoints = points;
			} else if (points === highestPoints) {
				this.winners.set(player, 1);
			}
		}

		bits.forEach((amount, player) => {
			if (this.winners.has(player)) {
				this.addBits(player, 500);
			} else {
				this.addBits(player, amount);
			}
		});

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<MagikarpsWaterWheel>> = {
	stay: {
		command(target, room, user) {
			if (!this.canStay || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			player.say("You have stopped with **" + this.points.get(player) + "**!");
			player.frozen = true;
			return true;
		},
	},
};

export const game: IGameFile<MagikarpsWaterWheel> = {
	aliases: ['magikarps', 'mww', 'waterwheel', 'pyl'],
	class: MagikarpsWaterWheel,
	commandDescriptions: [Config.commandCharacter + "stay"],
	commands,
	description: "Each round, players try to gather points by spinning the wheel while avoiding Magikarp!",
	formerNames: ['Press Your Luck'],
	name: "Magikarp's Water Wheel",
	mascot: "Magikarp",
	scriptedOnly: true,
};
