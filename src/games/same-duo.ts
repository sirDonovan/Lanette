import type { IGameFile } from '../types/games';
import type { GameType } from '../types/pokemon-showdown';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Duo";
const description = "Every player battles with the same randomly generated Pokemon duo!";

class SameDuo extends SameBattleEliminationTournament {
	firstRoundExtraTime = 1 * 60 * 1000;
	startingTeamsLength = 2;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	battleFormatId = 'gen92v2doubles';
	battleFormatType: GameType = 'doubles';
	banlist: string[] = ['Calyrex-Ice', 'Calyrex-Shadow', 'Cottonee', 'Dialga', 'Eternatus', 'Giratina', 'Giratina-Origin', 'Groudon',
		'Ho-Oh', 'Jirachi', 'Kyogre', 'Kyurem-White', 'Lugia', 'Lunala', 'Magearna', 'Marshadow', 'Melmetal', 'Mewtwo',
		'Necrozma-Dawn-Wings', 'Necrozma-Dusk-Mane', 'Palkia', 'Rayquaza', 'Reshiram', 'Solgaleo', 'Tornadus-Base', 'Urshifu-Base',
		'Urshifu-Rapid-Strike', 'Whimsicott', 'Xerneas', 'Yveltal', 'Zacian', 'Zacian-Crowned', 'Zamazenta', 'Zamazenta-Crowned', 'Zekrom'];

	getGameCustomRules(): string[] {
		return ['-Moody', '-Power Construct', '-Focus Sash', '-Ally Switch', '-Final Gambit', '-Perish Song', '-Swagger',
			'Terastal Clause'];
	}
}

export const game: IGameFile<SameDuo> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['sduo'],
	class: SameDuo,
	description,
	name,
});
