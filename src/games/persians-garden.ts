import { Player } from "../room-activity";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { MapCurrencyGame } from "./templates/map-currency";

class PersiansGarden extends MapCurrencyGame {
	canLateJoin: boolean = true;
	currency: string = "coins";
	initialCurrencySpaces: number = 40;
	floors = new Map<Player, number>();
	maxDimensions: number = 8;
	minDimensions: number = 8;
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

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace) {
		delete space.attributes.achievement;
		/*
		const database = Storage.getDatabase(this.room as Room);
		if (database.achievements && database.achievements[player.id] && database.achievements[player.id].indexOf('meowthscoin') !== -1) {
			let coins = ((Math.floor(Math.random() * 7) + 1) * 100) + ((Math.floor(Math.random() * 9) + 1) * 10) + (Math.floor(Math.random() * 9) + 1);
			player.say("You arrived at (" + space.coordinates + ") and were greeted by a Meowth. It scratched at a hedge and revealed " + coins + " " + this.currency + "!");
			let points = this.points.get(player) || 0;
			points += coins;
			this.points.set(player, points);
			player.say("Your collection is now " + points);
		} else {
			player.say("You arrived at (" + space.coordinates + ") and were greeted by a Meowth. It scratched at a hedge and revealed a small coin!");
			Games.unlockAchievement(this.room, player, "Meowth's Coin", this);
		}
		*/
	}

	eliminatePlayers() {
		const players = this.getRemainingPlayerCount();
		if (players < 2) return;
		let eliminateNumber = Math.floor(players / 2);
		if (players === 2) {
			eliminateNumber = 1;
		} else if (this.round === 20 || eliminateNumber >= players) {
			eliminateNumber = players - 1;
		}
		const coins = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player) || 0;
			coins.push({user: player, coins: points});
		}
		coins.sort((a, b) => a.coins - b.coins);
		const eliminated = coins.splice(0, eliminateNumber);
		const names: string[] = [];
		for (let i = 0; i < eliminateNumber; i++) {
			this.players[eliminated[i].user.id].eliminated = true;
			eliminated[i].user.say("Persian used Fury Swipes! You were knocked out of the garden.");
			names.push(eliminated[i].user.name);
		}
		this.say("The player" + (eliminateNumber > 1 ? "s" : "") + " with the least amount of " + this.currency + " " + (eliminateNumber > 1 ? "were" : "was") + " **" + names.join(", ") + "**!");
	}

	onMaxRound() {
		this.say("Persian fled the garden and gave the remaining players a chance to escape!");
		this.canMove = false;
	}

	onEnd() {
		// const achievement: Player[] = [];
		for (const i in this.players) {
			const player = this.players[i];
			let earnings = this.points.get(player);
			if (!earnings) continue;
			// if (earnings >= 7000) achievement.push(player);
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

		/*
		const multiAchieve = achievement.length > 1;
		for (let i = 0; i < achievement.length; i++) {
			Games.unlockAchievement(this.room, achievement[i], "Pay Day", this, multiAchieve);
		}
		*/

		this.announceWinners();
	}
}

export const game: IGameFile<PersiansGarden> = {
	aliases: ["persians", "pgarden"],
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	class: PersiansGarden,
	description: "Players must collect coins throughout the garden to stay alive! You may travel once per turn (up to 3 paces).",
	formerNames: ["Persian's Purge"],
	name: "Persian's Garden",
	mascot: "Persian",
	scriptedOnly: true,
};
