import type { IGameFile } from '../types/games';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Solo";
const description = "Every player battles with the same randomly generated Pokemon!";

class SameSolo extends SameBattleEliminationTournament {
	startingTeamsLength = 1;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	battleFormatId = '1v1';

	getGameCustomRules(): string[] {
		return ["-Focus Sash"];
	}
}

export const game: IGameFile<SameSolo> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['ssolo'],
	class: SameSolo,
	description,
	name,
});
