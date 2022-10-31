import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import {
	game as searchChallengeTournamentGame, MAX_TARGET_POKEMON, SearchChallengeTournament
} from "./templates/search-challenge-tournament";

class ChallengeCupElements extends SearchChallengeTournament {
	multiplePokemon: boolean = true;
	playerCounts = new Map<Player, string[]>();
	lastAnnouncedCounts = new Map<Player, number>();
	type: string = "";
	tournamentRules: string[] = ["maxteamsize=24", "blitz"];

	onTournamentStart(players: Dict<Player>): void {
		super.onTournamentStart(players);

		const types: string[] = [];
		const typeCounts: Dict<number> = {};
		const teamPreviewHiddenFormes = Dex.getTeamPreviewHiddenFormes();
		for (const species of Dex.getUsablePokemon(this.battleFormat)) {
			const pokemon = Dex.getExistingPokemon(species);
			if (!this.meetsPokemonCriteria(pokemon, teamPreviewHiddenFormes)) continue;

            for (const type of pokemon.types) {
                if (!(type in typeCounts)) typeCounts[type] = 0;
                typeCounts[type]++;
            }
		}

		for (const type of Object.keys(typeCounts)) {
			if (typeCounts[type] >= this.targetPokemon!) types.push(type);
		}

		this.type = this.sampleOne(types);
		this.announce("The randomly chosen type is **" + this.type + "**! You must find " + this.targetPokemon + " Pokemon.");
	}

	getObjectiveText(): string {
		if (!this.tournamentStarted) return "";
		return "Find " + this.targetPokemon + " Pokemon that are pure or part <b>" + this.type + " type</b>";
	}

	registerTeamPreview(player: Player, pokemon: IPokemon): void {
		if (pokemon.types.includes(this.type)) {
			const count = this.playerCounts.get(player) || [];
			if (!count.includes(pokemon.name)) {
				count.push(pokemon.name);
				if (count.length === this.targetPokemon) {
					this.announce(player.name + " found " + this.targetPokemon + " Pokemon and won the challenge!");
					this.winners.set(player, 1);
					this.addBits(player, 1000);
					return this.end();
				}

				this.playerCounts.set(player, count);
			}
		}
	}

	onBattleTeamPreview(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		const countA = (this.playerCounts.get(players[0]) || []).length;
		const countB = (this.playerCounts.get(players[1]) || []).length;
		if (countA > (this.lastAnnouncedCounts.get(players[0]) || 0)) {
			room.say(players[0].name + " your Pokemon count is now **" + countA + "**.");
			this.lastAnnouncedCounts.set(players[0], countA);
		}
		if (countB > (this.lastAnnouncedCounts.get(players[1]) || 0)) {
			room.say(players[1].name + " your Pokemon count is now **" + countB + "**.");
			this.lastAnnouncedCounts.set(players[1], countB);
		}

		return true;
	}

	onTournamentEnd(): void {
		if (!this.winners.size) {
			let highestCount = 0;
			this.playerCounts.forEach((counts, player) => {
				const count = counts.length;
				if (count > highestCount) {
					highestCount = count;
					this.winners.clear();
					this.winners.set(player, 1);
				} else if (count && count === highestCount) {
					this.winners.set(player, 1);
				}
			});

			if (this.winners.size) {
				this.winners.forEach((points, player) => {
					this.addBits(player, 500);
				});

				this.announce(Tools.joinList(this.getPlayerNamesText(this.winners)) + " found the most Pokemon and won the challenge!");
			}
		}

		super.onTournamentEnd();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerCounts.clear();
		this.lastAnnouncedCounts.clear();
	}
}

export const game: IGameFile<ChallengeCupElements> = Games.copyTemplateProperties(searchChallengeTournamentGame, {
	aliases: ['cce'],
	category: 'search-challenge',
	class: ChallengeCupElements,
	description: "Players search for up to " + MAX_TARGET_POKEMON + " Pokemon of the randomly chosen type in Challenge Cup 1v1 battles!",
	freejoin: true,
	name: "Challenge Cup Elements",
});
