import type { Player } from "../../room-activity";
import type { IGameTemplateFile } from "../../types/games";
import type { MapFloor } from "./map";
import { game as mapGame, MapGame } from "./map";

export abstract class MapShuffleGame extends MapGame {
	abstract startingLives: number;

	canLateJoin: boolean = true;
	currency: string = 'gears';
	escapedPlayers = new Map<Player, boolean>();
	maxDimensions: number = 10;
	minDimensions: number = 5;
	roundActions = new Map<Player, boolean>();

	abstract sendShuffleMapText(): void;

	onGenerateMapFloor(floor: MapFloor): void {
		this.setExitCoordinates(floor);
		this.setCurrencyCoordinates(floor);
		this.setTrapCoordinates(floor);
		this.setAchievementCoordinates(floor);
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
		if (!len) return this.end();

		if (this.round > 1 && (this.round - 1) % 5 === 0) {
			this.sendShuffleMapText();
			this.advanceToNextFloor();

			this.escapedPlayers.forEach((value, player) => {
				this.playerRoundInfo.set(player, []);
			});
		}
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => this.nextRound());

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
}

export const game = Tools.deepClone(mapGame) as IGameTemplateFile<MapShuffleGame>;
