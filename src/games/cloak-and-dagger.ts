import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Cloak and Dagger";
const description = "Every player is given a different randomly generated Pokemon that they have to protect from fainting each battle! " +
	"Any other 5 Pokemon can be chosen to complete a team.";

class CloakAndDagger extends EliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 3 * 60 * 1000;
	startingTeamsLength = 1;
	allowsFormes = false;
	baseTournamentName = name;
	tournamentDescription = description;
	requiredTier = "OU";
	usesCloakedPokemon = true;
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
			battleFormatId: "ubers",
			requiredTier: "Uber",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Cloak and Dagger UU",
			canChangeFormat: false,
			battleFormatId: "uu",
			requiredTier: "UU",
			variantAliases: ["uu"],
		},
		{
			name: "Cloak and Dagger RU",
			canChangeFormat: false,
			battleFormatId: "ru",
			requiredTier: "RU",
			variantAliases: ["ru"],
		},
		{
			name: "Cloak and Dagger NU",
			canChangeFormat: false,
			battleFormatId: "nu",
			requiredTier: "NU",
			variantAliases: ["nu"],
		},
		{
			name: "Cloak and Dagger PU",
			canChangeFormat: false,
			battleFormatId: "pu",
			requiredTier: "PU",
			variantAliases: ["pu"],
		},
		{
			name: "Cloak and Dagger ZU",
			canChangeFormat: false,
			battleFormatId: "zu",
			requiredTier: "ZU",
			variantAliases: ["zu"],
		},
		{
			name: "Cloak and Dagger LC",
			canChangeFormat: false,
			battleFormatId: "lc",
			requiredTier: "LC",
			variantAliases: ["lc", "little cup"],
		},
	],
});
