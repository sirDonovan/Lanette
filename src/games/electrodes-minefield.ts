import { Player } from "../room-activity";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapDamageGame } from "./templates/map-damage";

class ElectrodesMinefield extends MapDamageGame {
	currency: string = "fragments";
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

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace) {
		delete space.attributes.achievement;
		// player.say("You arrived at (" + space.coordinates + ") and were greeted by a Voltorb. It rolled over a hidden switch and revealed a small coin!");
		// Games.unlockAchievement(this.room, player, "Voltorb's Fuse", this);
	}

	damagePlayers() {
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
			this.lives.set(player, lives);
			if (lives > 0) {
				player.say("You were hit by the explosion and lost 1 life! You have " + lives + " " + (lives > 1 ? "lives" : "life") + " remaining.");
			} else {
				player.say("You were hit by the explosion and lost 1 life! You have been eliminated from the game.");
				player.eliminated = true;
			}
		}
		this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	onMaxRound() {
		this.say("The Electrode roll away and give the remaining players time to escape!");
		this.canMove = false;
	}

	onEnd() {
		// const achievement: Player[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			let earnings = this.points.get(player);
			if (!earnings) continue;
			// if (earnings >= 4000) achievement.push(player);
			earnings = Math.round(earnings / 4);
			if (earnings > this.maxBits) {
				earnings = this.maxBits;
			} else if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		}

		/*
		const multiAchieve = achievement.length > 1;
		for (let i = 0; i < achievement.length; i++) {
			Games.unlockAchievement(this.room, achievement[i], "Minesweeper", this, multiAchieve);
		}
		*/

		this.announceWinners();
	}
}

export const game: IGameFile<ElectrodesMinefield> = {
	aliases: ["electrodes", "eminefield"],
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: ElectrodesMinefield,
	description: "Players must try to survive the Electrode explosions each round (blasts are in a radius)! You may travel once per turn (up to 3 paces).",
	name: "Electrode's Minefield",
	mascot: "Electrode",
	scriptedOnly: true,
};
