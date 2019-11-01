import { IGameFile } from "../types/games";
import { Chain, game as chainGame } from "./templates/chain";

class UnownsPokemonChain extends Chain {}

export const game: IGameFile<UnownsPokemonChain> = Games.copyTemplateProperties(chainGame, {
	aliases: ["unowns", "upc", "pokemonchain"],
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	class: UnownsPokemonChain,
	defaultOptions: ['freejoin', 'points'],
	description: "Players answer each round with a Pokemon that starts with the last letter of the previous Pokemon (no formes and no repeats in a round)!",
	name: "Unown's Pokemon Chain",
	mascot: "Unown",
	variants: [
		{
			name: "Unown's Ability Chain",
			description: "Players answer each round with a move that starts with the last letter of the previous ability (no repeats in a round)!",
			commandDescriptions: [Config.commandCharacter + "g [ability]"],
			variant: "abilities",
			variantAliases: ['ability'],
		},
		{
			name: "Unown's Move Chain",
			description: "Players answer each round with a move that starts with the last letter of the previous move (no repeats in a round)!",
			commandDescriptions: [Config.commandCharacter + "g [move]"],
			variant: "moves",
			variantAliases: ['move'],
		},
	],
});
