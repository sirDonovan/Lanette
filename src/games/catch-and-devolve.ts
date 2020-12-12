import type { IGameFile } from '../types/games';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Catch and De-volve";
const description = "Every player is given a randomly generated Pokemon to use as their starter. Each battle that you win, you " +
	"must 'catch' 1 of your opponent's Pokemon (add it to your team) and then de-volve 1 Pokemon on your team.";

class CatchAndDevolve extends EliminationTournament {
	additionsPerRound = 1;
	evolutionsPerRound = -1;
	startingTeamsLength = 1;
	maxPlayers = 64;
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseTournamentName = name;
	tournamentDescription = description;
}

export const game: IGameFile<CatchAndDevolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['candde', 'cde', 'catchdevolve'],
	class: CatchAndDevolve,
	description,
	name,
	variants: [
		{
			name: "Monotype Catch and De-volve",
			monoType: true,
			variantAliases: ["monotype"],
		},
		{
			name: "Monoregion Catch and De-volve",
			monoRegion: true,
			variantAliases: ["monoregion", "monogen"],
		},
		{
			name: "Catch and De-volve Ubers",
			battleFormatId: "ubers",
			variantAliases: ["ubers", "uber"],
		},
		{
			name: "Catch and De-volve UU",
			battleFormatId: "uu",
			variantAliases: ["uu"],
		},
		{
			name: "Catch and De-volve RU",
			battleFormatId: "ru",
			variantAliases: ["ru"],
		},
		{
			name: "Catch and De-volve NU",
			battleFormatId: "nu",
			variantAliases: ["nu"],
		},
		{
			name: "Catch and De-volve PU",
			battleFormatId: "pu",
			variantAliases: ["pu"],
		},
		{
			name: "Catch and De-volve ZU",
			battleFormatId: "zu",
			variantAliases: ["zu"],
		},
	],
});
