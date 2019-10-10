import { Player } from "../room-activity";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapShuffleGame } from "./templates/map-shuffle";

class KlinklangsCastle extends MapShuffleGame {
	canLateJoin: boolean = true;
	currency: string = 'gears';
	escapedPlayers = new Map<Player, boolean>();
	map: GameMap | null = null;
	maxDimensions: number = 10;
	minDimensions: number = 5;
	roundActions = new Map<Player, boolean>();
	startingLives: number = 3;

	getMap(player?: Player): GameMap {
		if (!this.map) this.map = this.generateMap(this.playerCount);
		return this.map;
	}

	getFloorIndex(player?: Player): number {
		return this.currentFloor - 1;
	}

	onGenerateMapFloor(floor: MapFloor) {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace) {
		delete space.attributes.achievement;
		// player.say("You arrived safely at (" + space.coordinates + ") and were greeted by a Klink. It shifted a hidden gear on the wall and revealed a small coin!");
		// Games.unlockAchievement(this.room, player, "Klink's Gear", this);
	}

	shuffleMap() {
		this.currentFloor++;
		this.generateMapFloor(this.getMap());
		this.say("**The Klinklang used Shift Gear and shuffled the map!**");
	}

	onMaxRound() {
		this.say("The remaining players drop their " + this.currency + " as the castle shifts into a clear path!");
		this.canMove = false;
	}

	onEnd() {
		for (const i in this.players) {
			const player = this.players[i];
			if (this.escapedPlayers.has(player)) this.winners.set(player, 1);
		}
		const len = this.winners.size;
		const exitCoordinates = this.getExitCoordinates(this.getFloorIndex());
		if (exitCoordinates.length) this.say("The possible exits were: " + exitCoordinates.join(" | "));
		if (len) {
			// const multiAchieve = len > 1;
			this.say("**Winner" + (len > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
			this.winners.forEach((value, user) => {
				let earnings = this.points.get(user);
				if (!earnings) return;
				// if (earnings >= 4000) Games.unlockAchievement(this.room, user, "King of the Castle", this, multiAchieve);
				earnings = Math.round(earnings / 4);
				if (earnings > this.maxBits) {
					earnings = this.maxBits;
				} else if (earnings < 250) {
					earnings = 250;
				}
				this.addBits(user, earnings);
			});
		} else {
			this.say("All players fell into traps or got lost in the castle!");
		}
	}
}

export const game: IGameFile<KlinklangsCastle> = {
	aliases: ["klinklangs", "kcastle"],
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: KlinklangsCastle,
	description: "Players must find a path out of the shifting castle without falling into traps! You may travel once per turn (up to 3 paces).",
	name: "Klinklang's Castle",
	mascot: "Klinklang",
	scriptedOnly: true,
};
