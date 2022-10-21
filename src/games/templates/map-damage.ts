import type { Player } from "../../room-activity";
import type { IGameTemplateFile } from "../../types/games";
import type { MapFloor } from "./map";
import { game as mapGame, MapGame } from "./map";

export abstract class MapDamageGame extends MapGame {
	roundActions = new Map<Player, boolean>();

	abstract onDamagePlayers(): void;

	onGenerateMapFloor(floor: MapFloor): void {
		this.setCurrencyCoordinates(floor);
		this.setAchievementCoordinates(floor);
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			this.positionPlayer(player);
		}
		return true;
	}

	onStart(): void {
		this.maxDimensions = this.playerCount;
		if (this.onSetMaxDimensions) this.onSetMaxDimensions();

		this.positionPlayers();
		this.nextRound();
	}

	damagePlayers(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.offCommands(this.moveCommands);
		this.onDamagePlayers();
	}

	onNextRound(): void {
		if (this.canLateJoin && this.round > 1) this.canLateJoin = false;

		const len = this.getRemainingPlayerCount();
		if (!len) return this.end();
		this.roundActions.clear();
		this.onCommands(this.moveCommands, {max: len, remainingPlayersMax: true}, () => this.damagePlayers());

		const html = this.getRoundHtml(players => this.getPlayerLives(players));
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) {
				this.canMove = true;
				this.displayMapLegend();
			}
			this.updateRoundHtml();
			this.setTimeout(() => this.damagePlayers(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onSetMaxDimensions?(): void;
}

export const game = Tools.deepClone(mapGame) as IGameTemplateFile<MapDamageGame>;
