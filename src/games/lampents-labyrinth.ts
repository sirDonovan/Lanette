import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { MapFloor, MapFloorSpace } from "./templates/map";
import { game as mapGame, MapGame } from "./templates/map";

type AchievementNames = "mazerunner" | "litwicksflame" | "recklessadventurer";

const currencyName = "wicks";
const mazeRunnerPoints = 4000;
const recklessAdventurerRound = 3;

class LampentsLabyrinth extends MapGame  {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"mazerunner": {name: "Maze Runner", type: 'points', bits: 1000, description: 'collect at least ' + mazeRunnerPoints + ' ' +
			currencyName},
		"litwicksflame": {name: "Litwick's Flame", type: 'special', bits: 1000, description: 'get lucky and find Litwick in the labyrinth'},
		"recklessadventurer": {name: "Reckless Adventurer", type: 'special', bits: 1000, description: 'get eliminated by traps in the ' +
			'first ' + recklessAdventurerRound + ' rounds'},
	};

	canLateJoin: boolean = true;
	currency: string = currencyName;
	escapedPlayers = new Map<Player, boolean>();
	maxDimensions: number = 10;
	minDimensions: number = 5;
	recklessAdventurerAchievement = LampentsLabyrinth.achievements.recklessadventurer;
	recklessAdventurerRound = recklessAdventurerRound;
	roundActions = new Map<Player, boolean>();

	onGenerateMapFloor(floor: MapFloor): void {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		const achievementResult = this.unlockAchievement(player, LampentsLabyrinth.achievements.litwicksflame);
		const repeatUnlock = achievementResult && achievementResult.includes(player);
		let currency = 0;
		if (repeatUnlock) {
			currency = this.getRandomCurrency();
			this.points.set(player, (this.points.get(player) || 0) + currency);
		}
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and were greeted by a Litwick. Its " +
			"flame illuminated a small coin on the ground" + (repeatUnlock ? " worth " + currency + " " + this.currency + "! Your total " +
			"is now " + this.points.get(player) + "." : "!"));
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			this.positionPlayer(player);
		}
		this.lives.set(player, 3);
		return true;
	}

	onStart(): void {
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound(): void {
		this.offCommands(this.moveCommands);
		if (this.canLateJoin && this.round > 1) this.canLateJoin = false;

		const len = this.getRemainingPlayerCount();
		if (!len) {
			this.say("The Lampent sweep through the labyrinth and find no remaining players!");
			this.canMove = false;
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => {
			if (this.timeout) clearTimeout(this.timeout);
			this.nextRound();
		});

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) {
				this.canMove = true;
				this.displayMapLegend();
			}
			this.updateRoundHtml();
			this.setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onMaxRound(): void {
		this.say("The Lampent flee the labyrinth and leave the remaining players shrouded in darkness!");
		this.canMove = false;
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.escapedPlayers.has(this.players[i])) this.winners.set(this.players[i], 1);
		}

		const unlockedMazeRunner: Player[] = [];

		this.winners.forEach((value, player) => {
			let earnings = this.points.get(player);
			if (!earnings) return;
			if (earnings >= mazeRunnerPoints) unlockedMazeRunner.push(player);
			earnings = Math.round(earnings / 4);
			if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		});

		if (unlockedMazeRunner.length) this.unlockAchievement(unlockedMazeRunner, LampentsLabyrinth.achievements.mazerunner);

		this.announceWinners();
	}
}

export const game: IGameFile<LampentsLabyrinth> = Games.copyTemplateProperties(mapGame, {
	aliases: ["lampents", "llabyrinth"],
	class: LampentsLabyrinth,
	description: "Players must find a path out of the labyrinth without falling into traps! You may travel once per turn (up to 3 paces).",
	name: "Lampent's Labyrinth",
	mascot: "Lampent",
	scriptedOnly: true,
});
