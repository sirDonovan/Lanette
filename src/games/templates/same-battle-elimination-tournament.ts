import type { IGameTemplateFile } from "../../types/games";
import { game as battleEliminationTournamentGame, BattleEliminationTournament } from './battle-elimination-tournament';

export abstract class SameBattleEliminationTournament extends BattleEliminationTournament {
	banlist = ['Blissey', 'Wailord', 'Wobbuffet'];
	additionsPerRound = 0;
	dropsPerRound = 0;
	evolutionsPerRound = 0;
	canChangeFormat = true;
	fullyEvolved = true;
	allowsSingleStage = true;
	sharedTeams = true;
	canRejoin = true;

	generatePokedex(): void {
		super.generatePokedex();

		this.pokedex = this.pokedex.slice(0, this.startingTeamsLength);
	}

	getStartingTeam(): readonly string[] {
		return this.pokedex.slice();
	}
}

// @ts-expect-error
export const game: IGameTemplateFile<SameBattleEliminationTournament> = Tools.deepClone(battleEliminationTournamentGame);