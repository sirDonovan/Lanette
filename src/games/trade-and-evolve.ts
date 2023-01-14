import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Trade and Evolve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team), 'catch' 1 of your opponent's Pokemon (add it to your team), and then " +
	"evolve 1 Pokemon on your team.";
const bannedTiers: string[] = ['Uber', 'OU', 'UU', 'UUBL', 'RU', 'RUBL', 'NU', 'NUBL', 'PU', 'PUBL'];

// starting team length > 3 is too slow and eventually runs out of memory
class TradeAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	additionsPerRound = 1;
	dropsPerRound = 1;
	evolutionsPerRound = 1;
	startingTeamsLength = 3;
	maxPlayers = 64;
	requiredAddition = true;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 2 * 60 * 1000;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		if (bannedTiers.includes(pokemon.tier)) return false;
		return true;
	}
}

export const game: IGameFile<TradeAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['tande', 'te', 'tradeevolve'],
	class: TradeAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Trade and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Trade and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen9uu",
			variantAliases: ["uu"],
		},
		{
			name: "Trade and Evolve RU",
			canChangeFormat: false,
			battleFormatId: "gen9ru",
			variantAliases: ["ru"],
		},
		// {
		// 	name: "Trade and Evolve NU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9nu",
		// 	variantAliases: ["nu"],
		// },
	],
});
