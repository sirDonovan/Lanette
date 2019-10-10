import { Player } from "../../room-activity";
import { MapFloor, MapGame } from "./map";

export abstract class MapCurrencyGame extends MapGame {
	abstract initialCurrencySpaces: number;
	abstract startingLives: number;

	canLateJoin: boolean = true;
	roundActions = new Map<Player, boolean>();

	abstract eliminatePlayers(): void;

	onGenerateMapFloor(floor: MapFloor) {
		this.setCurrencyCoordinates(floor, this.initialCurrencySpaces);
		this.setAchievementCoordinates(floor);
	}

	onAddPlayer(player: Player, lateJoin?: boolean) {
		if (lateJoin) {
			if (this.round > 1) return false;
			this.positionPlayer(player);
		}
		this.lives.set(player, this.startingLives);
		return true;
	}

	onStart() {
		this.say("Now sending coordinates in PMs!");
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound() {
		if (this.round > 1 && (this.round - 1) % 5 === 0) this.eliminatePlayers();
		const len = this.getRemainingPlayerCount();
		if (len < 2) return this.end();
		this.roundActions.clear();
		this.onCommands(this.moveCommands, len, () => this.nextRound());

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) this.canMove = true;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}
}
