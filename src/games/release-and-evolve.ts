import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Release and Evolve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team) and then evolve 1 Pokemon on your team.";
const bannedTiers: string[] = ['Uber', 'OU', 'UU', 'UUBL', 'RU', 'RUBL', 'NU', 'NUBL', 'PU', 'PUBL'];

class ReleaseAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	dropsPerRound = 1;
	evolutionsPerRound = 1;
	startingTeamsLength = 6;
	maxPlayers = 64;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 5 * 60 * 1000;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		if (bannedTiers.includes(pokemon.tier)) return false;
		return true;
	}
}

export const game: IGameFile<ReleaseAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['rande', 're', 'releaseevolve'],
	class: ReleaseAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Release and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Release and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen9uu",
			variantAliases: ["uu"],
		},
		{
			name: "Release and Evolve RU",
			canChangeFormat: false,
			battleFormatId: "gen9ru",
			variantAliases: ["ru"],
		},
		// {
		// 	name: "Release and Evolve NU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9nu",
		// 	variantAliases: ["nu"],
		// },
	],
});
