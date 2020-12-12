import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Release and Evolve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team) and then evolve 1 Pokemon on your team.";
const bannedTiers: string[] = ['Uber', 'OU', 'UU', 'UUBL', 'RU', 'RUBL', 'NU', 'NUBL', 'PU', 'PUBL'];

class ReleaseAndEvolve extends EliminationTournament {
	dropsPerRound = 1;
	evolutionsPerRound = 1;
	startingTeamsLength = 6;
	maxPlayers = 64;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 3 * 60 * 1000;
	baseTournamentName = name;
	tournamentDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom'];

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
			battleFormatId: "ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Release and Evolve UU",
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Release and Evolve RU",
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Release and Evolve NU",
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
	],
});
