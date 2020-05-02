import { Player } from "../room-activity";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as mapGame, GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapShuffleGame } from "./templates/map-shuffle";

const currency = "gears";
const kingOfTheCastlePoints = 4000;

const achievements: AchievementsDict = {
	"kingofthecastle": {name: "King of the Castle", type: 'points', bits: 1000, description: 'collect at least ' +
		kingOfTheCastlePoints + ' ' + currency},
	"klinksgear": {name: "Klink's Gear", type: 'special', bits: 1000, description: 'get lucky and find Klink in the castle'},
};

class KlinklangsCastle extends MapShuffleGame {
	canLateJoin: boolean = true;
	currency: string = currency;
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

	onGenerateMapFloor(floor: MapFloor): void {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		player.say("You arrived safely at (" + space.coordinates + ") and were greeted by a Klink. It shifted a hidden gear on the " +
			"wall and revealed a small coin!");
		this.unlockAchievement(player, achievements.klinksgear!);
	}

	shuffleMap(): void {
		this.currentFloor++;
		this.generateMapFloor(this.getMap());
		this.say("**The Klinklang used Shift Gear and shuffled the map!**");
	}

	onMaxRound(): void {
		this.say("The remaining players drop their " + this.currency + " as the castle shifts into a clear path!");
		this.canMove = false;
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.escapedPlayers.has(this.players[i])) this.winners.set(this.players[i], 1);
		}

		const exitCoordinates = this.getExitCoordinates(this.getFloorIndex());
		if (exitCoordinates.length) this.say("The possible exits were: " + exitCoordinates.join(" | "));

		const unlockedKingOfTheCastle: Player[] = [];
		this.winners.forEach((value, player) => {
			let earnings = this.points.get(player);
			if (!earnings) return;
			if (earnings >= kingOfTheCastlePoints) unlockedKingOfTheCastle.push(player);
			earnings = Math.round(earnings / 4);
			if (earnings > this.maxBits) {
				earnings = this.maxBits;
			} else if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		});

		if (unlockedKingOfTheCastle.length) this.unlockAchievement(unlockedKingOfTheCastle, achievements.kingofthecastle!);

		this.announceWinners();
	}
}

export const game: IGameFile<KlinklangsCastle> = Games.copyTemplateProperties(mapGame, {
	achievements,
	aliases: ["klinklangs", "kcastle"],
	class: KlinklangsCastle,
	description: "Players must find a path out of the shifting castle without falling into traps! You may travel once per turn " +
		"(up to 3 paces).",
	name: "Klinklang's Castle",
	mascot: "Klinklang",
	scriptedOnly: true,
});
