import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { game as mapGame } from "./templates/map";
import { MapCurrencyGame } from "./templates/map-currency";

type AchievementNames = "payday" | "meowthscoin" | "bankrupt";

const currencyName = "coins";
const payDayPoints = 7000;
const bankruptRounds = 5;

class PersiansGarden extends MapCurrencyGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"payday": {name: "Pay Day", type: 'points', bits: 1000, description: 'collect at least ' + payDayPoints + ' ' + currencyName},
		"meowthscoin": {name: "Meowth's Coin", type: 'special', bits: 1000, description: 'get lucky and find Meowth in the garden'},
		"bankrupt": {name: "Bankrupt", type: 'special', bits: 1000, description: 'go ' + bankruptRounds + ' rounds without finding any ' +
			currencyName},
	};

	canLateJoin: boolean = true;
	currency: string = currencyName;
	initialCurrencySpaces: number = 40;
	floors = new Map<Player, number>();
	maxDimensions: number = 8;
	minDimensions: number = 8;
	noCurrencyAchievement = PersiansGarden.achievements.bankrupt;
	noCurrencyRound = bankruptRounds;
	roundActions = new Map<Player, boolean>();
	startingLives: number = 3;
	userMaps = new Map<Player, GameMap>();

	getMap(player: Player): GameMap {
		if (!this.userMaps.has(player)) {
			this.userMaps.set(player, this.generateMap(8, 8));
			this.floors.set(player, 1);
		}
		return this.userMaps.get(player)!;
	}

	getFloorIndex(player: Player): number {
		return this.floors.get(player)! - 1;
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		const achievementResult = this.unlockAchievement(player, PersiansGarden.achievements.meowthscoin);
		const repeatUnlock = achievementResult && achievementResult.includes(player);
		let currency = 0;
		if (repeatUnlock) {
			currency = this.getRandomCurrency();
			this.points.set(player, (this.points.get(player) || 0) + currency);
		}
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and were greeted by a Meowth. It " +
			"scratched at a hedge and revealed a small coin" + (repeatUnlock ? " worth " + currency + " " + this.currency +
			"! Your total is now " + this.points.get(player) + "." : "!"));
	}

	eliminatePlayers(): void {
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return;
		let playersToEliminate = Math.floor(remainingPlayerCount / 2);
		if (remainingPlayerCount === 2) {
			playersToEliminate = 1;
		} else if (this.round === 20) {
			playersToEliminate = remainingPlayerCount - 1;
		}
		const coins: {player: Player; coins: number}[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player) || 0;
			coins.push({player, coins: points});
		}
		coins.sort((a, b) => a.coins - b.coins);
		const eliminated = coins.splice(0, playersToEliminate);
		const names: string[] = [];
		for (let i = 0; i < playersToEliminate; i++) {
			const player = eliminated[i].player;
			this.playerRoundInfo.get(player)!.push("Persian used Fury Swipes and knocked you out of the garden!");
			this.eliminatePlayer(player, "You didn't collect enough " + this.currency + "!");
			this.updatePlayerHtmlPage(player);
			names.push(player.name);
		}
		this.say("The player" + (playersToEliminate > 1 ? "s" : "") + " with the least amount of " + this.currency + " " +
			(playersToEliminate > 1 ? "were" : "was") + " **" + names.join(", ") + "**!");
	}

	onMaxRound(): void {
		this.say("Persian fled the garden and gave the remaining players a chance to escape!");
		this.canMove = false;
	}

	onEnd(): void {
		const unlockedPayDay: Player[] = [];

		for (const i in this.players) {
			const player = this.players[i];
			let earnings = this.points.get(player);
			if (!earnings) continue;
			if (earnings >= payDayPoints) unlockedPayDay.push(player);
			if (!player.eliminated) {
				earnings += 1000;
				earnings = Math.round(earnings / 4);
				this.winners.set(player, 1);
			} else {
				if (!earnings) continue;
				earnings = Math.round(earnings / 6);
			}
			this.addBits(player, earnings);
		}

		if (unlockedPayDay.length) this.unlockAchievement(unlockedPayDay, PersiansGarden.achievements.payday);

		this.announceWinners();
	}
}

export const game: IGameFile<PersiansGarden> = Games.copyTemplateProperties(mapGame, {
	aliases: ["persians", "pgarden"],
	class: PersiansGarden,
	description: "Players must collect coins throughout the garden to stay alive! You may travel once per turn (up to 3 paces).",
	formerNames: ["Persian's Purge"],
	name: "Persian's Garden",
	mascot: "Persian",
	scriptedOnly: true,
});
