import { IFormat } from "./dex";
import { Tournament } from "./room-tournament";
import { Room } from "./rooms";

export class Tournaments {
	defaultCap = 64;
	maxCap = 128;
	tournamentTimers = {} as Dict<NodeJS.Timer>;

	createTournament(room: Room, format: IFormat, generator: string): Tournament {
		const tournament = new Tournament(room);
		tournament.initialize(format, generator);

		return tournament;
	}

	setTournamentTimer(room: Room, time: number, formatid?: string, cap?: number) {
		if (room.id in this.tournamentTimers) clearTimeout(this.tournamentTimers[room.id]);
		if (!cap) cap = this.defaultCap;
		this.tournamentTimers[room.id] = setTimeout(() => {
			room.say("/tour new " + formatid + ", elimination, " + cap);
			delete this.tournamentTimers[room.id];
		}, time);
	}
}
