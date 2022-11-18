import type { IGameFile } from '../types/games';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Six";
const description = "Every player battles with the same randomly generated team!";

class SameSix extends SameBattleEliminationTournament {
	firstRoundExtraTime = 5 * 60 * 1000;
	startingTeamsLength = 6;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
}

export const game: IGameFile<SameSix> = Games.copyTemplateProperties(sameBattleEliminationTournamentGame, {
	aliases: ['ssix'],
	class: SameSix,
	description,
	name,
	variants: [
		{
			name: "Monocolor Same Six",
			canChangeFormat: false,
			monoColor: true,
			variantAliases: ["monocolor"],
		},
		{
			name: "Monotype Same Six",
			canChangeFormat: false,
			monoType: true,
			variantAliases: ["monotype"],
		},
		{
			name: "Monoregion Same Six",
			canChangeFormat: false,
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Same Six Ubers",
			canChangeFormat: false,
			requiredTier: "Uber",
			battleFormatId: "gen8ubers",
			variantAliases: ["ubers"],
		},
		{
			name: "Same Six OU",
			canChangeFormat: false,
			requiredTier: "OU",
			variantAliases: ["ou"],
		},
		{
			name: "Same Six UU",
			canChangeFormat: false,
			requiredTier: "UU",
			battleFormatId: "gen8uu",
			variantAliases: ["uu"],
		},
		{
			name: "Same Six RU",
			canChangeFormat: false,
			requiredTier: "RU",
			battleFormatId: "gen8ru",
			variantAliases: ["ru"],
		},
		{
			name: "Same Six NU",
			canChangeFormat: false,
			requiredTier: "NU",
			battleFormatId: "gen8nu",
			variantAliases: ["nu"],
		},
		{
			name: "Same Six PU",
			canChangeFormat: false,
			requiredTier: "PU",
			battleFormatId: "gen8pu",
			variantAliases: ["pu"],
		},
		{
			name: "Same Six ZU",
			canChangeFormat: false,
			requiredTier: "ZU",
			battleFormatId: "gen8zu",
			variantAliases: ["zu"],
		},
		{
			name: "Same Six LC",
			canChangeFormat: false,
			requiredTier: "LC",
			fullyEvolved: false,
			battleFormatId: "gen8lc",
			variantAliases: ["lc", "little cup"],
		},
	],
});
