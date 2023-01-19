import { assertStrictEqual } from '../test/test-tools';
import type { GameFileTests, IGameFile } from '../types/games';
import { DEFAULT_BATTLE_FORMAT_ID, game as eliminationTournamentGame } from './templates/battle-elimination';
import { BattleEliminationTournament } from './templates/battle-elimination-tournament';

const name = "Cloak and Dagger";
const description = "Every player is given a different randomly generated Pokemon that they have to protect from fainting each battle! " +
	"Any other 5 Pokemon can be chosen to complete a team.";

class CloakAndDagger extends BattleEliminationTournament {
	canChangeFormat = true;
	firstRoundExtraTime = 3 * 60 * 1000;
	startingTeamsLength = 1;
	allowsFormes = false;
	baseHtmlPageGameName = name;
	htmlPageGameDescription = description;
	requiredTier = "OU";
	usesCloakedPokemon = true;
	banlist = ['Zorua', 'Zoroark'];

	getGameCustomRules(): string[] {
		return ['-Zorua-Base', '-Zorua-Hisui', '-Zoroark-Base', '-Zoroark-Hisui', '-Illusion'];
	}

}

const tests: GameFileTests<CloakAndDagger> = {
	'name from input properties': {
		test(game): void {
			if (game.format.variant) return;
			const originalName = game.format.nameWithOptions;

			game.validateInputProperties({options: {}});
			assertStrictEqual(game.format.nameWithOptions, "Cloak and Dagger");

			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {format: 'almostanyability'}});
			assertStrictEqual(game.format.nameWithOptions, "Cloak and Dagger: Almost Any Ability");

			game.battleFormatId = DEFAULT_BATTLE_FORMAT_ID;
			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {format: 'gen8ou'}});
			assertStrictEqual(game.format.nameWithOptions, "Cloak and Dagger: Gen 8 OU");

			game.battleFormatId = DEFAULT_BATTLE_FORMAT_ID;
			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {rules: 'sametypeclause'}});
			assertStrictEqual(game.format.nameWithOptions, "Monotype Cloak and Dagger");

			game.battleFormatId = DEFAULT_BATTLE_FORMAT_ID;
			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {format: 'almostanyability', rules: 'sametypeclause'}});
			assertStrictEqual(game.format.nameWithOptions, "Monotype Cloak and Dagger: Almost Any Ability");

			const longRules = 'sametypeclause|-Charmander|-Bulbasaur|-Squirtle|-Cyndaquil|-Chikorita|-Totodile|-Torchic|-Treecko|-Mudkip';
			game.battleFormatId = DEFAULT_BATTLE_FORMAT_ID;
			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {rules: longRules}});
			assertStrictEqual(game.format.nameWithOptions, "Cloak and Dagger" + Dex.getDefaultCustomRulesName());

			game.battleFormatId = DEFAULT_BATTLE_FORMAT_ID;
			game.format.nameWithOptions = originalName;
			game.validateInputProperties({options: {format: 'almostanyability', rules: longRules}});
			assertStrictEqual(game.format.nameWithOptions, "Cloak and Dagger: Almost Any Ability" + Dex.getDefaultCustomRulesName());
		},
	},
};

export const game: IGameFile<CloakAndDagger> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['cloakdagger', 'cd'],
	class: CloakAndDagger,
	description,
	name,
	tests: Object.assign({}, eliminationTournamentGame.tests, tests),
	variants: [
		// {
		// 	name: "Cloak and Dagger Ubers",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9ubers",
		// 	requiredTier: "Uber",
		// 	variantAliases: ["ubers", "uber"],
		// },
		{
			name: "Cloak and Dagger UU",
			canChangeFormat: false,
			battleFormatId: "gen9uu",
			requiredTier: "UU",
			variantAliases: ["uu"],
		},
		{
			name: "Cloak and Dagger RU",
			canChangeFormat: false,
			battleFormatId: "gen9ru",
			requiredTier: "RU",
			variantAliases: ["ru"],
		},
		// {
		// 	name: "Cloak and Dagger NU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9nu",
		// 	requiredTier: "NU",
		// 	variantAliases: ["nu"],
		// },
		// {
		// 	name: "Cloak and Dagger PU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9pu",
		// 	requiredTier: "PU",
		// 	variantAliases: ["pu"],
		// },
		// {
		// 	name: "Cloak and Dagger ZU",
		// 	canChangeFormat: false,
		// 	battleFormatId: "gen9zu",
		// 	requiredTier: "ZU",
		// 	variantAliases: ["zu"],
		// },
		{
			name: "Cloak and Dagger LC",
			canChangeFormat: false,
			battleFormatId: "gen9lc",
			requiredTier: "LC",
			variantAliases: ["lc", "little cup"],
		},
	],
});
