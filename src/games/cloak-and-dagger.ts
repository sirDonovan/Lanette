import type { IGameFile } from '../types/games';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Cloak and Dagger";
const description = "Every player is given a different randomly generated Pokemon that they have to protect from fainting each battle! " +
	"Any other 5 Pokemon can be chosen to complete a team.";

class CloakAndDagger extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 3 * 60 * 1000;
	startingTeamsLength = 1;
	allowsFormes = false;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	requiredTier = "OU";
	usesCloakedPokemon = true;
	banlist = ['Zorua', 'Zoroark'];

	getGameCustomRules(): string[] {
		return ['-Zorua-Base', '-Zorua-Hisui', '-Zoroark-Base', '-Zoroark-Hisui', '-Illusion'];
	}

}

export const game: IGameFile<CloakAndDagger> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['cloakdagger', 'cd'],
	class: CloakAndDagger,
	description,
	name,
	variants: [
		{
			name: "Cloak and Dagger Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8ubers",
			requiredTier: "Uber",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Cloak and Dagger UU",
			canChangeFormat: false,
			battleFormatId: "gen8uu",
			requiredTier: "UU",
			variantAliases: ["uu"],
		},
		{
			name: "Cloak and Dagger RU",
			canChangeFormat: false,
			battleFormatId: "gen8ru",
			requiredTier: "RU",
			variantAliases: ["ru"],
		},
		{
			name: "Cloak and Dagger NU",
			canChangeFormat: false,
			battleFormatId: "gen8nu",
			requiredTier: "NU",
			variantAliases: ["nu"],
		},
		{
			name: "Cloak and Dagger PU",
			canChangeFormat: false,
			battleFormatId: "gen8pu",
			requiredTier: "PU",
			variantAliases: ["pu"],
		},
		{
			name: "Cloak and Dagger ZU",
			canChangeFormat: false,
			battleFormatId: "gen8zu",
			requiredTier: "ZU",
			variantAliases: ["zu"],
		},
		{
			name: "Cloak and Dagger LC",
			canChangeFormat: false,
			battleFormatId: "gen8lc",
			requiredTier: "LC",
			variantAliases: ["lc", "little cup"],
		},
	],
});
