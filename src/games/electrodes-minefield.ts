import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { MapFloor, MapFloorSpace } from "./templates/map";
import { game as mapGame } from "./templates/map";
import { MapDamageGame } from "./templates/map-damage";

type AchievementNames = "minesweeper" | "voltorbsfuse";

const currencyName = "fragments";
const minesweeperPoints = 4000;

class ElectrodesMinefield extends MapDamageGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"minesweeper": {name: "Minesweeper", type: 'points', bits: 1000, description: 'collect at least ' + minesweeperPoints + ' ' +
			currencyName},
		"voltorbsfuse": {name: "Voltorb's Fuse", type: 'special', bits: 1000, description: 'get lucky and find Voltorb in the minefield'},
	};

	currency: string = currencyName;
	maxDimensions: number = 10;
	minDimensions: number = 8;
	roundActions = new Map<Player, boolean>();
	sharedMap: boolean = true;
	startingLives: number = 5;

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			this.lives.set(player, this.startingLives);
		}

		return true;
	}

	onSetMaxDimensions(): void {
		if (this.maxDimensions >= 9) this.startingLives = 4;
		for (const i in this.players) {
			this.lives.set(this.players[i], this.startingLives);
		}
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		const achievementResult = this.unlockAchievement(player, ElectrodesMinefield.achievements.voltorbsfuse);
		const repeatUnlock = achievementResult && achievementResult.includes(player);
		let currency = 0;
		if (repeatUnlock) {
			currency = this.getRandomCurrency();
			this.points.set(player, (this.points.get(player) || 0) + currency);
		}
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and were greeted by a Voltorb. It " +
			"rolled over a hidden switch and revealed a small coin" + (repeatUnlock ? " worth " + currency + " " + this.currency +
			"! Your total is now " + this.points.get(player) + "." : "!"));
	}

	onDamagePlayers(): void {
		const map  = this.getMap();
		const floor = map.floors[this.getFloorIndex()];
		const x = this.random(floor.x);
		const y = this.random(floor.y);
		this.say("An Electrode exploded on **(" + this.coordinatesToString(x, y) + ")**!");

		const blastCoordinates = this.radiateFromCoordinates(['' + x, '' + y], floor.y >= 7 ? 2 : 1);
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const playerCoordindates = this.playerCoordinates.get(player)!;
			if (!blastCoordinates.includes(this.coordinatesToString(playerCoordindates[0], playerCoordindates[1]))) continue;
			const lives = this.addLives(player, -1);
			const eliminated = lives === 0;
			this.playerRoundInfo.get(player)!.push("You were hit by the explosion and lost 1 life!" + (!eliminated ? " You have " +
				lives + " " + (lives > 1 ? "lives" : "life") + " left." : ""));
			if (eliminated) {
				this.eliminatePlayer(player, "You ran out of lives!");
			}
			this.sendPlayerControls(player);
		}

		this.setTimeout(() => this.nextRound(), 3 * 1000);
	}

	onMaxRound(): void {
		this.say("The Electrode roll away and give the remaining players time to escape!");
		this.canMove = false;
	}

	onEnd(): void {
		const unlockedMinesweeper: Player[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			let earnings = this.points.get(player);
			if (!earnings) continue;
			if (earnings >= minesweeperPoints) unlockedMinesweeper.push(player);
			earnings = Math.round(earnings / 4);
			if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		}

		if (unlockedMinesweeper.length) this.unlockAchievement(unlockedMinesweeper, ElectrodesMinefield.achievements.minesweeper);

		this.announceWinners();
	}
}

export const game: IGameFile<ElectrodesMinefield> = Games.copyTemplateProperties(mapGame, {
	aliases: ["electrodes", "eminefield"],
	class: ElectrodesMinefield,
	description: "Players must try to survive the Electrode explosions each round (blasts are in a radius)! You may travel once per " +
		"turn (up to 3 paces).",
	name: "Electrode's Minefield",
	mascot: "Electrode",
	scriptedOnly: true,
});
