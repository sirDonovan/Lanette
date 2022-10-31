import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import { game as searchChallengeTournamentGame, SearchChallengeTournament } from "./templates/search-challenge-tournament";

class ChallengeCupChase extends SearchChallengeTournament {
	pokemon: string = "";
	tournamentRules: string[] = ["maxteamsize=24", "blitz"];

	onTournamentStart(players: Dict<Player>): void {
		super.onTournamentStart(players);

		const teamPreviewHiddenFormes = Dex.getTeamPreviewHiddenFormes();
		for (const species of this.shuffle(Dex.getUsablePokemon(this.battleFormat))) {
			const pokemon = Dex.getExistingPokemon(species);
			if (!this.meetsPokemonCriteria(pokemon, teamPreviewHiddenFormes)) continue;

			this.pokemon = pokemon.name;
			break;
		}

		if (!this.pokemon) throw new Error("Failed to generate a valid target Pokemon");

		this.announce("The randomly chosen Pokemon is **" + this.pokemon + "**!");
	}

	getObjectiveText(): string {
		if (!this.tournamentStarted) return "";
		return "Find a <b> " + this.pokemon + "</b>";
	}

	registerSwitch(player: Player, pokemon: IPokemon): void {
		if (pokemon.name === this.pokemon) {
			this.announce(player.name + " found a **" + this.pokemon + "** and won the challenge!");
			this.winners.set(player, 1);
			this.addBits(player, 1000);
			return this.end();
		}
	}
}

export const game: IGameFile<ChallengeCupChase> = Games.copyTemplateProperties(searchChallengeTournamentGame, {
	aliases: ['ccc'],
	category: 'search-challenge',
	class: ChallengeCupChase,
	description: "Players search for the randomly chosen Pokemon in Challenge Cup 1v1 battles!",
	freejoin: true,
	name: "Challenge Cup Chase",
});
