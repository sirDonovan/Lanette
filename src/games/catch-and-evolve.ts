import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Catch and Evolve";
const description = "Every player is given a randomly generated Pokemon to use as their starter. Each battle that you win, you " +
	"must 'catch' 1 of your opponent's Pokemon (add it to your team) and then evolve 1 Pokemon on your team.";
const bannedTiers: string[] = ['Uber', 'OU', 'UU', 'UUBL', 'RU', 'RUBL', 'NU', 'NUBL', 'PU', 'PUBL'];

class CatchAndEvolve extends BattleEliminationTournament {
	canChangeFormat = true;
	additionsPerRound = 1;
	evolutionsPerRound = 1;
	startingTeamsLength = 1;
	maxPlayers = 64;
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom', 'Wynaut'];

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		if (bannedTiers.includes(pokemon.tier)) return false;
		return true;
	}
}

export const game: IGameFile<CatchAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['cande', 'ce', 'catchevolve'],
	class: CatchAndEvolve,
	description,
	name,
	variants: [
		// {
		// 	name: "Monotype Catch and Evolve",
		// 	canChangeFormat: false,
		// 	monoType: true,
		// 	variantAliases: ["monotype"],
		// },
		{
			name: "Monoregion Catch and Evolve",
			canChangeFormat: false,
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Catch and Evolve Ubers",
			canChangeFormat: false,
			battleFormatId: "gen9ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Catch and Evolve UU",
			canChangeFormat: false,
			battleFormatId: "gen9uu",
			variantAliases: ["uu"],
		},
		{
			name: "Catch and Evolve RU",
			canChangeFormat: false,
			battleFormatId: "gen9ru",
			variantAliases: ["ru"],
		},
		// {
		// 	name: "Catch and Evolve NU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9nu",
		// 	variantAliases: ["nu"],
		// },
		// {
		// 	name: "Catch and Evolve PU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9pu",
		// 	variantAliases: ["pu"],
		// },
		// {
		// 	name: "Catch and Evolve ZU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9zu",
		// 	variantAliases: ["zu"],
		// },
	],
});
