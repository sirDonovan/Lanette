import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

class MareepsCountingSheep extends ScriptedGame {
	canCount: boolean = false;
	currentNumber: number = 0;
	lastCounter: Player | null = null;
	points = new Map<Player, number>();
	roundCounts = new Map<Player, number>();

	onSignups(): void {
		this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	startCount(): void {
		const text = "Mareep has started counting!";
		this.on(text, () => {
			this.canCount = true;
			this.setEndTimer();
		});
		this.say(text);
	}

	setEndTimer(): void {
		this.timeout = setTimeout(() => {
			const text = "Mareep lost count!";
			this.on(text, () => this.nextRound());
			this.say(text);
		}, 5 * 1000);
	}

	onNextRound(): void {
		this.canCount = false;

		if (this.round > 1) {
			for (const i in this.players) {
				const points = this.points.get(this.players[i]);
				if (points && points >= this.format.options.points) this.winners.set(this.players[i], points);
			}

			if (this.winners.size) {
				this.end();
				return;
			}
		}

		this.currentNumber = 0;
		this.roundCounts.clear();
		this.lastCounter = null;

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.startCount(), 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	addCountingPoints(): void {
		this.roundCounts.forEach((count, player) => {
			this.addPoints(player, count);
		});
	}

	onEnd(): void {
		this.convertPointsToBits();
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<MareepsCountingSheep> = {
	count: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canCount) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (player === this.lastCounter) {
				player.say("You cannot count consecutively!");
				return false;
			}

			const targetNumber = parseInt(Tools.toId(target));
			if (isNaN(targetNumber) || targetNumber < 1) return false;

			if (this.timeout) clearTimeout(this.timeout);

			if (targetNumber !== (this.currentNumber + 1)) {
				this.say(player.name + " counted incorrectly!");
				this.addCountingPoints();
				this.nextRound();
				return false;
			}

			this.currentNumber++;

			const roundCounts = this.roundCounts.get(player) || 0;
			this.roundCounts.set(player, roundCounts + 1);
			this.lastCounter = player;

			this.setEndTimer();

			return true;
		},
	},
};

export const game: IGameFile<MareepsCountingSheep> = {
	aliases: ['mareeps', 'counting'],
	class: MareepsCountingSheep,
	commands,
	commandDescriptions: [Config.commandCharacter + "count [number]"],
	customizableOptions: {
		points: {
			min: 10,
			base: 10,
			max: 20,
		},
	},
	defaultOptions: ['freejoin'],
	description: "Players count up one by one without repeating numbers!",
	freejoin: true,
	name: "Mareep's Counting Sheep",
	mascot: "Mareep",
};
