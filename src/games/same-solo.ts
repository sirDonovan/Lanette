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
	battleFormatId = 'gen91v1';
	banlist: string[] = ['Calyrex-Ice', 'Calyrex-Shadow', 'Cinderace', 'Dialga', 'Dragonite', 'Eternatus', 'Genesect', 'Giratina',
		'Giratina-Origin', 'Groudon', 'Ho-Oh', 'Jirachi', 'Koraidon', 'Kyogre', 'Kyurem-Black', 'Kyurem-White', 'Lugia', 'Lunala',
		'Magearna', 'Marshadow', 'Melmetal', 'Mew', 'Mewtwo', 'Mimikyu', 'Miraidon', 'Necrozma', 'Necrozma-Dawn-Wings',
		'Necrozma-Dusk-Mane', 'Palkia', 'Rayquaza', 'Reshiram', 'Sableye', 'Snorlax', 'Solgaleo', 'Victini', 'Xerneas', 'Yveltal',
		'Zacian', 'Zacian-Crowned', 'Zamazenta', 'Zamazenta-Crowned', 'Zekrom'];

	getGameCustomRules(): string[] {
		return ['-Moody', '-Power Construct', '-Bright Powder', '-Focus Band', '-Focus Sash', '-Lax Incense', '-Quick Claw',
			'-Acupressure', '-Hypnosis', '-Perish Song', '-Sing', 'Terastal Clause'];
	}
}

export const game: IGameFile<SameSolo> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['ssolo'],
	class: SameSolo,
	description,
	name,
});
