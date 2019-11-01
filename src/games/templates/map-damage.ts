import { Player } from "../../room-activity";
import { IGameTemplateFile } from "../../types/games";
import { game as mapGame, MapFloor, MapGame } from "./map";

export abstract class MapDamageGame extends MapGame {
	abstract startingLives: number;

	canLateJoin: boolean = true;
	roundActions = new Map<Player, boolean>();

	abstract damagePlayers(): void;

	onGenerateMapFloor(floor: MapFloor) {
		this.setCurrencyCoordinates(floor);
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
		this.maxDimensions = this.playerCount;
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound() {
		const len = this.getRemainingPlayerCount();
		if (!len) return this.end();
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => {
			if (this.timeout) clearTimeout(this.timeout);
			this.damagePlayers();
		});

		const html = this.getRoundHtml(this.getPlayerLives);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) this.canMove = true;
			this.timeout = setTimeout(() => this.damagePlayers(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}
}

export const game: IGameTemplateFile<MapDamageGame> = Object.assign({}, mapGame);
