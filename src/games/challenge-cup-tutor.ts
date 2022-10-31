import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import type { IMove } from "../types/pokemon-showdown";
import { game as searchChallengeTournamentGame, SearchChallengeTournament } from "./templates/search-challenge-tournament";

class ChallengeCupTutor extends SearchChallengeTournament {
	move: string = "";
	tournamentRules: string[] = ["maxteamsize=12", "blitz"];

	onTournamentStart(players: Dict<Player>): void {
		super.onTournamentStart(players);

		const usablePokemon = Dex.getUsablePokemon(this.battleFormat).length;
		const minAvailability = Math.floor(usablePokemon * 0.1);
		const maxAvailability = Math.floor(usablePokemon * 0.3);
		const usableMoves = Dex.getUsableMoves(this.battleFormat);
		for (const usableMove of this.shuffle(usableMoves)) {
			const move = Dex.getExistingMove(usableMove);
			const availability = Dex.getMoveAvailability(move);
			if (!move.isNonstandard && !move.isZ && !move.isMax && !move.realMove && availability >= minAvailability &&
				availability <= maxAvailability) {
				this.move = move.name;
				break;
			}
		}

		if (!this.move) throw new Error("Failed to generate a valid target move");

		this.announce("The randomly chosen move is **" + this.move + "**!");
	}

	getObjectiveText(): string {
		if (!this.tournamentStarted) return "";
		return "Find a Pokemon with the move <b> " + this.move + "</b>";
	}

	registerMove(player: Player, move: IMove): void {
		if (move.name === this.move) {
			this.announce(player.name + " found a Pokemon with **" + this.move + "** and won the challenge!");
			this.winners.set(player, 1);
			this.addBits(player, 1000);
			return this.end();
		}
	}
}

export const game: IGameFile<ChallengeCupTutor> = Games.copyTemplateProperties(searchChallengeTournamentGame, {
	aliases: ['cct'],
	category: 'search-challenge',
	class: ChallengeCupTutor,
	description: "Players search for a Pokemon with the randomly chosen move in Challenge Cup 1v1 battles!",
	freejoin: true,
	name: "Challenge Cup Tutor",
});
