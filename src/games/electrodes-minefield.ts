import type { Player } from "../room-activity";
import type { AchievementsDict, IGameFile } from "../types/games";
import { game as mapGame } from "./templates/map";
import type { GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapDamageGame } from "./templates/map-damage";

const currency = "fragments";
const minesweeperPoints = 4000;

const achievements: AchievementsDict = {
	"minesweeper": {name: "Minesweeper", type: 'points', bits: 1000, description: 'collect at least ' + minesweeperPoints + ' ' +
		currency},
	"voltorbsfuse": {name: "Voltorb's Fuse", type: 'special', bits: 1000, description: 'get lucky and find Voltorb in the minefield'},
};

class ElectrodesMinefield extends MapDamageGame {
	currency: string = currency;
	canLateJoin: boolean = true;
	map: GameMap | null = null;
	maxDimensions: number = 10;
	minDimensions: number = 8;
	roundActions = new Map<Player, boolean>();
	startingLives: number = 5;

	getMap(player?: Player): GameMap {
		if (!this.map) this.map = this.generateMap(this.playerCount);
		return this.map;
	}

	getFloorIndex(player?: Player): number {
		return this.currentFloor - 1;
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		player.say("You arrived at (" + space.coordinates + ") and were greeted by a Voltorb. It rolled over a hidden switch and " +
			"revealed a small coin!");
		this.unlockAchievement(player, achievements.voltorbsfuse!);
	}

	damagePlayers(): void {
		const map  = this.getMap();
		const floor = map.floors[this.getFloorIndex()];
		const x = this.random(floor.x);
		const y = this.random(floor.y);
		this.say("An Electrode exploded on **(" + x + ", " + y + ")**!");
		const blastCoordinates = this.radiateFromCoordinates(['' + x, '' + y], (floor.y >= 7 ? 2 : 1));
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const playerCoordindates = this.playerCoordinates.get(player)!;
			if (!blastCoordinates.includes(this.toStringCoordindates(playerCoordindates[0], playerCoordindates[1]))) continue;
			let lives = this.lives.get(player)!;
			lives -= 1;
			const eliminated = lives === 0;
			this.lives.set(player, lives);
			player.say("You were hit by the explosion and lost 1 life!" + (!eliminated ? " You have " + lives + " " +
				(lives > 1 ? "lives" : "life") + " left." : ""));
			if (eliminated) {
				this.eliminatePlayer(player, "You ran out of lives!");
			}
		}
		this.timeout = setTimeout(() => this.nextRound(), 5000);
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
			if (earnings > this.maxBits) {
				earnings = this.maxBits;
			} else if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		}

		if (unlockedMinesweeper.length) this.unlockAchievement(unlockedMinesweeper, achievements.minesweeper!);

		this.announceWinners();
	}
}

export const game: IGameFile<ElectrodesMinefield> = Games.copyTemplateProperties(mapGame, {
	achievements,
	aliases: ["electrodes", "eminefield"],
	class: ElectrodesMinefield,
	description: "Players must try to survive the Electrode explosions each round (blasts are in a radius)! You may travel once per " +
		"turn (up to 3 paces).",
	name: "Electrode's Minefield",
	mascot: "Electrode",
	scriptedOnly: true,
});
