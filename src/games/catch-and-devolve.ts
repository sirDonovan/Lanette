import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Catch and De-volve";
const description = "Every player is given a randomly generated Pokemon to use as their starter. Each battle that you win, you " +
	"must 'catch' 1 of your opponent's Pokemon (add it to your team) and then de-volve 1 Pokemon on your team.";

class CatchAndDevolve extends BattleEliminationTournament {
	banlist = ['Wobbuffet'];
	canChangeFormat = true;
	additionsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 1;
	maxPlayers = 64;
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}

	meetsEvolutionCriteria(pokemon: IPokemon): boolean {
		return pokemon.evos.length <= 1;
	}
}

export const game: IGameFile<CatchAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['candde', 'cde', 'catchdevolve'],
	class: CatchAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Monotype Catch and De-volve",
			canChangeFormat: false,
			monoType: true,
			variantAliases: ["monotype"],
		},
		{
			name: "Monoregion Catch and De-volve",
			canChangeFormat: false,
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Catch and De-volve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen8ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Catch and De-volve UU",
			canChangeFormat: false,
			battleFormatId: "gen8uu",
			variantAliases: ["uu"],
		},
		{
			name: "Catch and De-volve RU",
			canChangeFormat: false,
			battleFormatId: "gen8ru",
			variantAliases: ["ru"],
		},
		{
			name: "Catch and De-volve NU",
			canChangeFormat: false,
			battleFormatId: "gen8nu",
			variantAliases: ["nu"],
		},
		{
			name: "Catch and De-volve PU",
			canChangeFormat: false,
			battleFormatId: "gen8pu",
			variantAliases: ["pu"],
		},
		{
			name: "Catch and De-volve ZU",
			canChangeFormat: false,
			battleFormatId: "gen8zu",
			variantAliases: ["zu"],
		},
	],
});
