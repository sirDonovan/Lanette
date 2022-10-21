import type { Player } from "../../room-activity";
import type { IGameTemplateFile } from "../../types/games";
import type { MapFloor } from "./map";
import { game as mapGame, MapGame } from "./map";

export abstract class MapCurrencyGame extends MapGame {
	abstract initialCurrencySpaces: number;
	abstract startingLives: number;

	canLateJoin: boolean = true;
	roundActions = new Map<Player, boolean>();

	abstract eliminatePlayers(): void;

	onGenerateMapFloor(floor: MapFloor): void {
		this.setCurrencyCoordinates(floor, this.initialCurrencySpaces);
		this.setAchievementCoordinates(floor);
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			this.positionPlayer(player);
		}
		this.lives.set(player, this.startingLives);
		return true;
	}

	onStart(): void {
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound(): void {
		this.offCommands(this.moveCommands);
		if (this.canLateJoin && this.round > 1) this.canLateJoin = false;
		if (this.round > 1 && (this.round - 1) % 5 === 0) this.eliminatePlayers();

		const len = this.getRemainingPlayerCount();
		if (len < 2) return this.end();

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

export const game = Tools.deepClone(mapGame) as IGameTemplateFile<MapCurrencyGame>;
