import type { Player } from "../../room-activity";
import type { IGameTemplateFile } from "../../types/games";
import { game as searchChallengeGame, SearchChallenge } from "./search-challenge";

const PLAYER_CAP = 16;
const AUTO_DQ_MINUTES = 2;
const MIN_TARGET_POKEMON = 5;
const BASE_TARGET_POKEMON = 10;
export const MAX_TARGET_POKEMON = 15;

export abstract class SearchChallengeTournament extends SearchChallenge {
	multiplePokemon: boolean = false;
	tournamentCreated: boolean = false;
	tournamentEnded: boolean = false;
	tournamentStarted: boolean = false;
	tournamentRules: string[] = [];

	targetPokemon?: number;

	onSignups(): void {
		this.sayUhtml(this.uhtmlBaseName + "-description", this.getSignupsHtml());

		Tournaments.createListeners[this.room.id] = {
			format: this.battleFormat,
			game: this,
		};

		this.room.createTournament(this.battleFormat, 'roundrobin', PLAYER_CAP);
		if (this.tournamentRules.length) this.room.setTournamentRules(this.tournamentRules.join(", "));
		this.room.setTournamentAutoDq(AUTO_DQ_MINUTES);
		this.room.forceTimerTournament();

		this.tournamentCreated = true;
	}

	onDeallocate(): void {
		if (this.tournamentCreated && !this.tournamentEnded) {
			this.tournamentEnded = true;
			this.room.endTournament();
		}
	}

	onTournamentStart(players: Dict<Player>): void {
		this.tournamentStarted = true;

		for (const i in players) {
			this.createPlayer(players[i].name);
		}

		if (this.multiplePokemon) {
			if (this.playerCount <= PLAYER_CAP / 4) {
				this.targetPokemon = MIN_TARGET_POKEMON;
			} else if (this.playerCount <= PLAYER_CAP / 2) {
				this.targetPokemon = BASE_TARGET_POKEMON;
			} else {
				this.targetPokemon = MAX_TARGET_POKEMON;
			}
		}
	}

	onTournamentEnd(): void {
		if (this.tournamentEnded) return;

		this.tournamentEnded = true;
		this.end();
	}

	onEnd(): void {
		if (!this.winners.size) this.say("No winners this challenge!");
	}
}

export const game: IGameTemplateFile<SearchChallengeTournament> = Object.assign(Tools.deepClone(searchChallengeGame), {
	modes: undefined,
	modeProperties: undefined,
	tests: undefined,
	variants: undefined,
});