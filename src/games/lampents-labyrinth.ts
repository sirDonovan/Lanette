import { Player } from "../room-activity";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as mapGame, GameMap, MapFloor, MapFloorSpace, MapGame } from "./templates/map";

const currency = "wicks";
const mazeRunnerPoints = 4000;
const recklessAdventurerRound = 3;

const achievements: AchievementsDict = {
	"mazerunner": {name: "Maze Runner", type: 'points', bits: 1000, description: 'collect at least ' + mazeRunnerPoints + ' ' + currency},
	"litwicksflame": {name: "Litwick's Flame", type: 'special', bits: 1000, description: 'get lucky and find Litwick in the labyrinth'},
	"recklessadventurer": {name: "Reckless Adventurer", type: 'special', bits: 1000, description: 'get eliminated by traps in the first ' + recklessAdventurerRound + ' rounds'},
};

class LampentsLabyrinth extends MapGame  {
	canLateJoin: boolean = true;
	currency: string = currency;
	escapedPlayers = new Map<Player, boolean>();
	floors = new Map<Player, number>();
	maxDimensions: number = 10;
	minDimensions: number = 5;
	recklessAdventurerAchievement = achievements.recklessadventurer;
	recklessAdventurerRound = recklessAdventurerRound;
	roundActions = new Map<Player, boolean>();
	userMaps = new Map<Player, GameMap>();

	getMap(player: Player): GameMap {
		if (!this.userMaps.has(player)) {
			this.userMaps.set(player, this.generateMap(this.playerCount));
			this.floors.set(player, 1);
		}
		return this.userMaps.get(player)!;
	}

	getFloorIndex(player: Player): number {
		return this.floors.get(player)! - 1;
	}

	onGenerateMapFloor(floor: MapFloor): void {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAchievementSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		delete space.attributes.achievement;
		player.say("You arrived safely at (" + space.coordinates + ") and were greeted by a Litwick. Its flame illuminated a small coin on the ground!");
		this.unlockAchievement(player, achievements.litwicksflame!);
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			if (this.round > 1) return false;
			this.positionPlayer(player);
		}
		this.lives.set(player, 3);
		return true;
	}

	onStart(): void {
		this.say("Now sending coordinates in PMs!");
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound(): void {
		const len = this.getRemainingPlayerCount();
		if (!len) {
			this.say("The Lampent sweep through the labyrinth and find no remaining players!");
			this.canMove = false;
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => {
			if (this.timeout) clearTimeout(this.timeout);
			this.nextRound();
		});

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) this.canMove = true;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
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
			if (earnings > this.maxBits) {
				earnings = this.maxBits;
			} else if (earnings < 250) {
				earnings = 250;
			}
			this.addBits(player, earnings);
		});

		if (unlockedMazeRunner.length) this.unlockAchievement(unlockedMazeRunner, achievements.mazerunner!);

		this.announceWinners();
	}
}

export const game: IGameFile<LampentsLabyrinth> = Games.copyTemplateProperties(mapGame, {
	achievements,
	aliases: ["lampents", "llabyrinth"],
	class: LampentsLabyrinth,
	description: "Players must find a path out of the labyrinth without falling into traps! You may travel once per turn (up to 3 paces).",
	name: "Lampent's Labyrinth",
	mascot: "Lampent",
	scriptedOnly: true,
});
