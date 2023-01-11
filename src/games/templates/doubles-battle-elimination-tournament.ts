import type { IGameTemplateFile } from '../../types/games';
import type { GameType } from '../../types/pokemon-showdown';
import { game as battleEliminationTournamentGame, BattleEliminationTournament } from './battle-elimination-tournament';

export abstract class DoublesBattleEliminationTournament extends BattleEliminationTournament {
	firstRoundExtraTime = 1 * 60 * 1000;
	activityWarnTimeout: number = 5 * 60 * 1000;
	autoDqMinutes: number = 5;
	battleFormatId = 'gen9doublesou';
	battleFormatType: GameType = 'doubles';

	getGameCustomRules(): string[] {
		return ['-Ally Switch', '-Perish Song'];
	}
}

// @ts-expect-error
export const game: IGameTemplateFile<DoublesBattleEliminationTournament> = Tools.deepClone(battleEliminationTournamentGame);
