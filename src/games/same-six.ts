import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

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
			battleFormatId: "ubers",
			variantAliases: ["ubers"],
		},
		{
			name: "Same Six UU",
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Same Six RU",
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Same Six NU",
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
		{
			name: "Same Six PU",
			battleFormatId: "pu",
			variantAliases: ["pu"],
		},
		{
			name: "Same Six ZU",
			battleFormatId: "zu",
			variantAliases: ["zu"],
		},
	],
});
