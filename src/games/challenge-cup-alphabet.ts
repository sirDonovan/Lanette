import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import {
	game as searchChallengeTournamentGame, MAX_TARGET_POKEMON, SearchChallengeTournament
} from "./templates/search-challenge-tournament";

class ChallengeCupAlphabet extends SearchChallengeTournament {
	multiplePokemon: boolean = true;
	playerCounts = new Map<Player, string[]>();
	lastAnnouncedCounts = new Map<Player, number>();
	letter: string = "";
	tournamentRules: string[] = ["maxteamsize=24", "blitz"];

	onTournamentStart(players: Dict<Player>): void {
		super.onTournamentStart(players);

		const letters: string[] = [];
		const letterCounts: Dict<number> = {};
		const teamPreviewHiddenFormes = Dex.getTeamPreviewHiddenFormes();
		for (const species of Dex.getUsablePokemon(this.battleFormat)) {
			const pokemon = Dex.getExistingPokemon(species);
			if (!this.meetsPokemonCriteria(pokemon, teamPreviewHiddenFormes)) continue;

			const letter = pokemon.name.toUpperCase().charAt(0);
			if (!(letter in letterCounts)) letterCounts[letter] = 0;
			letterCounts[letter]++;
		}

		for (const letter of Object.keys(letterCounts)) {
			if (letterCounts[letter] >= this.targetPokemon!) letters.push(letter);
		}

		this.letter = this.sampleOne(letters);

		this.announce("The randomly chosen letter is **" + this.letter + "**! You must find " + this.targetPokemon + " Pokemon.");
	}

	getObjectiveText(): string {
		if (!this.tournamentStarted) return "";
		return "Find " + this.targetPokemon + " Pokemon starting with the letter <b> " + this.letter + "</b>";
	}

	registerTeamPreview(player: Player, pokemon: IPokemon): void {
		if (pokemon.name.charAt(0) === this.letter) {
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

export const game: IGameFile<ChallengeCupAlphabet> = Games.copyTemplateProperties(searchChallengeTournamentGame, {
	aliases: ['cca'],
	category: 'search-challenge',
	class: ChallengeCupAlphabet,
	description: "Players search for up to " + MAX_TARGET_POKEMON + " Pokemon in Challenge Cup 1v1 battles whose names start with the " +
		"randomly chosen letter!",
	freejoin: true,
	name: "Challenge Cup Alphabet",
});
