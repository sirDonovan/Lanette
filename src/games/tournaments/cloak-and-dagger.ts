import { EliminationTournament, game as eliminationTournamentGame } from '../templates/elimination-tournament';
import type { IGameFile } from '../../types/games';
import type { IPokemon } from '../../types/dex';

const name = "Cloak and Dagger";
const description = "Every player is given the same randomly generated Pokemon that they have to protect from fainting each battle! You " +
	"may choose any other 5 Pokemon to complete your team.";

class CloakAndDagger extends EliminationTournament {
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 1;
	baseTournamentName = name;
	tournamentDescription = description;
	canRejoin = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	requiredTier = "OU";
	tournamentRules = [
		"- All moves, abilities, and items are allowed",
		"- Mega evolutions and regional formes are allowed",
		"- Scouting is NOT allowed",
	];
	usesCloakedPokemon = true;

	getStartingTeam(): IPokemon[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<CloakAndDagger> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['cloakdagger', 'cd'],
	class: CloakAndDagger,
	description,
	name,
	variants: [
		{
			name: "Monotype Cloak and Dagger",
			variant: "monotype",
		},
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
