import type { IGameFile } from '../types/games';
import {
	game as doublesBattleEliminationTournamentGame, DoublesBattleEliminationTournament
} from './templates/doubles-battle-elimination-tournament';

const name = "Doubles Cloak and Dagger";
const description = "Every player is given a different randomly generated Pokemon that they have to protect from fainting each battle! " +
	"Any other 5 Pokemon can be chosen to complete a team.";

class DoublesCloakAndDagger extends DoublesBattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 3 * 60 * 1000;
	startingTeamsLength = 1;
	allowsFormes = false;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	requiredDoublesTier = "DOU";
	usesCloakedPokemon = true;
	banlist = ['Zorua', 'Zoroark'];

	getGameCustomRules(): string[] {
		return ['-Zorua-Base', '-Zorua-Hisui', '-Zoroark-Base', '-Zoroark-Hisui', '-Illusion'];
	}

}

export const game: IGameFile<DoublesCloakAndDagger> = Games.copyTemplateProperties(doublesBattleEliminationTournamentGame, {
	aliases: ['doublescloakdagger', 'dcd'],
	class: DoublesCloakAndDagger,
	description,
	name,
	variants: [
		{
			name: "Doubles Cloak and Dagger UU",
			canChangeFormat: false,
			battleFormatId: "gen9doublesuu",
			requiredDoublesTier: "DUU",
			variantAliases: ["uu", "doublesuu"],
		},
		{
			name: "Doubles Cloak and Dagger LC",
			canChangeFormat: false,
			battleFormatId: "gen9doubleslc",
			requiredTier: "LC",
			requiredDoublesTier: "",
			variantAliases: ["lc", "littlecup", "doubleslc"],
		},
	],
});
