import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';
import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/dex';

const name = "Same Six";
const description = "Every player battles with the same randomly generated team!";

class SameSix extends EliminationTournament {
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 6;
	maxPlayers = 16;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;
	firstRoundExtraTime = 10 * 60 * 1000;

	getStartingTeam(): readonly string[] {
		return this.pokedex.slice(0, this.startingTeamsLength);
	}
}

export const game: IGameFile<SameSix> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['ssix'],
	class: SameSix,
	description,
	name,
	variants: [
		{
			name: "Monocolor Same Six",
			variant: "monocolor",
		},
		{
			name: "Monotype Same Six",
			variant: "monotype",
		},
		{
			name: "Monoregion Same Six",
			variant: "monoregion",
			variantAliases: ["monogen"],
		},
		{
			name: "Same Six Ubers",
			variant: "ubers",
		},
		{
			name: "Same Six UU",
			variant: "uu",
		},
		{
			name: "Same Six RU",
			variant: "ru",
		},
		{
			name: "Same Six NU",
			variant: "nu",
		},
		{
			name: "Same Six PU",
			variant: "pu",
		},
		{
			name: "Same Six ZU",
			variant: "zu",
		},
	],
});
