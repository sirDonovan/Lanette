import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Same Six";
const description = "Every player battles with the same randomly generated team!";

class SameSix extends EliminationTournament {
	firstRoundExtraTime = 5 * 60 * 1000;
	additionsPerRound = 0;
	evolutionsPerRound = 0;
	startingTeamsLength = 6;
	maxPlayers = 16;
	baseTournamentName = name;
	tournamentDescription = description;
	fullyEvolved = true;
	sharedTeams = true;
	canRejoin = true;

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
			monoColor: true,
			variantAliases: ["monocolor"],
		},
		{
			name: "Monotype Same Six",
			monoType: true,
			variantAliases: ["monotype"],
		},
		{
			name: "Monoregion Same Six",
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Same Six Ubers",
			requiredTier: "Uber",
			battleFormatId: "ubers",
			variantAliases: ["ubers"],
		},
		{
			name: "Same Six OU",
			requiredTier: "OU",
			variantAliases: ["ou"],
		},
		{
			name: "Same Six UU",
			requiredTier: "UU",
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Same Six RU",
			requiredTier: "RU",
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Same Six NU",
			requiredTier: "NU",
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
		{
			name: "Same Six PU",
			requiredTier: "PU",
			battleFormatId: "pu",
			variantAliases: ["pu"],
		},
		{
			name: "Same Six ZU",
			requiredTier: "ZU",
			battleFormatId: "zu",
			variantAliases: ["zu"],
		},
		{
			name: "Same Six LC",
			requiredTier: "LC",
			fullyEvolved: false,
			battleFormatId: "lc",
			variantAliases: ["lc", "little cup"],
		},
	],
});
