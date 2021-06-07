import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import type {MapFloor, MapFloorSpace } from "./templates/map";
import { game as mapGame } from "./templates/map";
import { MapShuffleGame } from "./templates/map-shuffle";

type AchievementNames = "kingofthecastle" | "klinksgear";

const currencyName = "gears";
const kingOfTheCastlePoints = 4000;

class KlinklangsCastle extends MapShuffleGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"kingofthecastle": {name: "King of the Castle", type: 'points', bits: 1000, description: 'collect at least ' +
			kingOfTheCastlePoints + ' ' + currencyName},
		"klinksgear": {name: "Klink's Gear", type: 'special', bits: 1000, description: 'get lucky and find Klink in the castle'},
	};

	canLateJoin: boolean = true;
	currency: string = currencyName;
	escapedPlayers = new Map<Player, boolean>();
	maxDimensions: number = 10;
	minDimensions: number = 5;
	roundActions = new Map<Player, boolean>();
	sharedMap: boolean = true;
	startingLives: number = 3;

	onGenerateMapFloor(floor: MapFloor): void {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		const achievementResult = this.unlockAchievement(player, KlinklangsCastle.achievements.klinksgear);
		const repeatUnlock = achievementResult && achievementResult.includes(player);
		let currency = 0;
		if (repeatUnlock) {
			currency = this.getRandomCurrency();
			this.points.set(player, (this.points.get(player) || 0) + currency);
		}
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and were greeted by a Klink. It " +
			"shifted a hidden gear in the wall and revealed a small coin" + (repeatUnlock ? " worth " + currency + " " + this.currency +
			"! Your total is now " + this.points.get(player) + "." : "!"));
	}

	sendShuffleMapText(): void {
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

		if (this.sharedMap) {
			const exitCoordinates = this.getExitCoordinates(this.getFloorIndex());
			if (exitCoordinates.length) this.say("The possible exits were: " + exitCoordinates.join(" | "));
		}

		const unlockedKingOfTheCastle: Player[] = [];
		this.winners.forEach((value, player) => {
			let earnings = this.points.get(player);
			if (!earnings) return;
			if (earnings >= kingOfTheCastlePoints) unlockedKingOfTheCastle.push(player);
			earnings = Math.round(earnings / 4);
			if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		});

		if (unlockedKingOfTheCastle.length) this.unlockAchievement(unlockedKingOfTheCastle, KlinklangsCastle.achievements.kingofthecastle);

		this.announceWinners();
	}
}

export const game: IGameFile<KlinklangsCastle> = Games.copyTemplateProperties(mapGame, {
	aliases: ["klinklangs", "kcastle"],
	class: KlinklangsCastle,
	description: "Players must find a path out of the shifting castle without falling into traps! You may travel once per turn " +
		"(up to 3 paces).",
	name: "Klinklang's Castle",
	mascot: "Klinklang",
	scriptedOnly: true,
	variants: [
		{
			name: "Klinklang's Solo Castle",
			sharedMap: false,
			variantAliases: ['solo'],
		},
	],
});
