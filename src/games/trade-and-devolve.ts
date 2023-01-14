import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Trade and De-volve";
const description = "Every player is given a randomly generated team to start out. Each battle that you win, you " +
	"must 'release' 1 of your Pokemon (remove it from your team), 'catch' 1 of your opponent's Pokemon (add it to your team), and then " +
	"de-volve 1 Pokemon on your team.";

// starting team length > 3 is too slow and eventually runs out of memory
class TradeAndDevolve extends BattleEliminationTournament {
	banlist = ['Wobbuffet'];
	canChangeFormat = true;
	additionsPerRound = 1;
	dropsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 3;
	maxPlayers = 64;
	requiredAddition = true;
	requiredDrop = true;
	requiredEvolution = true;
	canReroll = true;
	firstRoundExtraTime = 2 * 60 * 1000;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}

	meetsEvolutionCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}
}

export const game: IGameFile<TradeAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['tandde', 'tde', 'tradedevolve'],
	class: TradeAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Trade and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Trade and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen9uu",
			variantAliases: ["uu"],
		},
		{
			name: "Trade and De-volve RU",
			canChangeFormat: false,
			battleFormatId: "gen9ru",
			variantAliases: ["ru"],
		},
		// {
		// 	name: "Trade and De-volve NU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9nu",
		// 	variantAliases: ["nu"],
		// },
	],
});
