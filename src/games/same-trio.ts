import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Trio";
const description = "Every player battles with the same randomly generated Pokemon trio!";

class SameTrio extends SameBattleEliminationTournament {
	firstRoundExtraTime = 1 * 60 * 1000;
	startingTeamsLength = 3;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	battleFormatId = 'gen6battlespottriples';
	battleFormatType: GameType = 'triples';

	getGameCustomRules(): string[] {
		return ['!!pickedteamsize=3', 'maxteamsize=3', '-Focus Sash', '-King\'s Rock', '-Ally Switch', '-Final Gambit', '-Moody',
			'-Perish Song', '-Swagger', 'Evasion Items Clause', 'Accuracy Moves Clause'];
	}
}

export const game: IGameFile<SameTrio> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['strio'],
	class: SameTrio,
	description,
	name,
});
