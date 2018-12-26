import { IFormat } from "./dex";
import { Tournament } from "./room-tournament";
import { Room } from "./rooms";

export class Tournaments {
	defaultCap = 64;
	maxCap = 128;
	tournamentTimers: Dict<NodeJS.Timer> = {};

	createTournament(room: Room, format: IFormat, generator: string, playerCap: number): Tournament {
		const tournament = new Tournament(room);
		tournament.initialize(format, generator, playerCap);

		return tournament;
	}

	createTournamentFromJSON(room: Room, update: {format: string, teambuilderFormat?: string, generator: string, playerCap?: number}) {
		if (!update.format && !update.teambuilderFormat) return;
		const format = update.teambuilderFormat ? Dex.getExistingFormat(update.teambuilderFormat) : Dex.getExistingFormat(update.format);
		room.tournament = this.createTournament(room, format, update.generator, update.playerCap || 0);
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
