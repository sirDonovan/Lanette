import type { IGameFile } from '../types/games';
import {
	game as sameBattleEliminationTournamentGame, SameBattleEliminationTournament
} from './templates/same-battle-elimination-tournament';

const name = "Same Six";
const description = "Every player battles with the same randomly generated team!";

class SameSix extends SameBattleEliminationTournament {
	firstRoundExtraTime = 5 * 60 * 1000;
	startingTeamsLength = 6;
	allowsSingleStage = true;
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
			battleFormatId: "ubers",
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
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Same Six RU",
			canChangeFormat: false,
			requiredTier: "RU",
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Same Six NU",
			canChangeFormat: false,
			requiredTier: "NU",
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
		{
			name: "Same Six PU",
			canChangeFormat: false,
			requiredTier: "PU",
			battleFormatId: "pu",
			variantAliases: ["pu"],
		},
		{
			name: "Same Six ZU",
			canChangeFormat: false,
			requiredTier: "ZU",
			battleFormatId: "zu",
			variantAliases: ["zu"],
		},
		{
			name: "Same Six LC",
			canChangeFormat: false,
			requiredTier: "LC",
			fullyEvolved: false,
			battleFormatId: "lc",
			variantAliases: ["lc", "little cup"],
		},
	],
});
