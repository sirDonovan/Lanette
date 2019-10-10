import { Player } from "../../room-activity";
import { GameMap, MapFloor, MapGame } from "./map";

export abstract class MapShuffleGame extends MapGame {
	abstract startingLives: number;

	canLateJoin: boolean = true;
	currency: string = 'gears';
	escapedPlayers = new Map<Player, boolean>();
	map: GameMap | null = null;
	maxDimensions: number = 10;
	minDimensions: number = 5;
	roundActions = new Map<Player, boolean>();

	abstract shuffleMap(): void;

	onGenerateMapFloor(floor: MapFloor) {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAddPlayer(player: Player, lateJoin?: boolean) {
		if (lateJoin) {
			if (this.round > 1) return false;
			this.positionPlayer(player);
		}
		this.lives.set(player, 3);
		return true;
	}

	onStart() {
		this.say("Now sending coordinates in PMs!");
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound() {
		const len = this.getRemainingPlayerCount();
		if (!len) return this.end();
		if (this.round > 1 && (this.round - 1) % 5 === 0) this.shuffleMap();
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => this.nextRound());

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) this.canMove = true;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}
}
