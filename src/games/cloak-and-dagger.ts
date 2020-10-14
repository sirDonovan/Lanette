import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Cloak and Dagger";
const description = "Every player is given a different randomly generated Pokemon that they have to protect from fainting each battle! " +
	"Any other 5 Pokemon can be chosen to complete a team.";

class CloakAndDagger extends EliminationTournament {
	startingTeamsLength = 1;
	baseTournamentName = name;
	tournamentDescription = description;
	canRejoin = true;
	firstRoundExtraTime = 5 * 60 * 1000;
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
			variant: "ubers",
			requiredTier: "Uber",
		},
		{
			name: "Cloak and Dagger UU",
			variant: "uu",
			requiredTier: "UU",
		},
		{
			name: "Cloak and Dagger RU",
			variant: "ru",
			requiredTier: "RU",
		},
		{
			name: "Cloak and Dagger NU",
			variant: "nu",
			requiredTier: "NU",
		},
		{
			name: "Cloak and Dagger PU",
			variant: "pu",
			requiredTier: "PU",
		},
		{
			name: "Cloak and Dagger ZU",
			variant: "zu",
			requiredTier: "ZU",
		},
	],
});
