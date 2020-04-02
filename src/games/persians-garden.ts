import { Player } from "../room-activity";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as mapGame, GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapCurrencyGame } from "./templates/map-currency";

const currency = "coins";
const payDayPoints = 7000;
const bankruptRounds = 5;

const achievements: AchievementsDict = {
	"payday": {name: "Pay Day", type: 'points', bits: 1000, description: 'collect at least ' + payDayPoints + ' ' + currency},
	"meowthscoin": {name: "Meowth's Coin", type: 'special', bits: 1000, description: 'get lucky and find Meowth in the garden'},
	"bankrupt": {name: "Bankrupt", type: 'special', bits: 1000, description: 'go ' + bankruptRounds + ' rounds without finding any ' + currency},
};

class PersiansGarden extends MapCurrencyGame {
	canLateJoin: boolean = true;
	currency: string = currency;
	initialCurrencySpaces: number = 40;
	floors = new Map<Player, number>();
	maxDimensions: number = 8;
	minDimensions: number = 8;
	// noCurrencyAchievement = achievements.bankrupt;
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
		player.say("You arrived at (" + space.coordinates + ") and were greeted by a Meowth. It scratched at a hedge and revealed a small coin!");
		this.unlockAchievement(player, achievements.meowthscoin!);
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
			this.eliminatePlayer(eliminated[i].player, "Persian used Fury Swipes and knocked you out of the garden!");
			names.push(eliminated[i].player.name);
		}
		this.say("The player" + (playersToEliminate > 1 ? "s" : "") + " with the least amount of " + this.currency + " " + (playersToEliminate > 1 ? "were" : "was") + " **" + names.join(", ") + "**!");
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
			if (earnings > this.maxBits) earnings = this.maxBits;
			this.addBits(player, earnings);
		}

		if (unlockedPayDay.length) this.unlockAchievement(unlockedPayDay, achievements.payday!);

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
