import type { Player } from "../../room-activity";
import type { Room } from "../../rooms";
import type { IGameTemplateFile } from "../../types/games";
import type { IClientTournamentData } from "../../types/tournaments";
import { game as battleEliminationGame, BattleElimination } from "./battle-elimination";

const GROUPCHAT_SUFFIX = "Games";
const AUTO_DQ_MINUTES = 3;

export abstract class BattleEliminationTournament extends BattleElimination {
	requiresAutoconfirmed = false;
	startAutoDqTimer: NodeJS.Timer | undefined;
	tournamentCreated: boolean = false;
	tournamentEnded: boolean = false;
	tournamentStarted: boolean = false;
	usesTournamentStart = true;
	usesTournamentJoin = true;
	declare subRoom: Room;

	afterInitialize(): void {
		super.afterInitialize();

		this.firstRoundTime = (AUTO_DQ_MINUTES * 60 * 1000) + this.firstRoundExtraTime;

		const name = this.room.title + " " + GROUPCHAT_SUFFIX;
		const id = this.room.getSubRoomGroupchatId(name);
		const subRoom = Rooms.get(id);
		if (subRoom) {
			this.subRoom = subRoom;
			this.createTournament();
		} else {
			this.subRoom = Rooms.add(id);
			Client.joinRoom(id);

			Rooms.createListeners[id] = (room) => {
				this.subRoom = room;
				this.createTournament();
			};

			this.room.createSubRoomGroupchat(name);
		}
	}

	createTournament(): void {
		if (this.subRoom.tournament) {
			this.say("You must wait for the " + this.subRoom.tournament.name + " tournament in " + this.subRoom.title + " to end.");
			this.deallocate(true);
			return;
		}

		Tournaments.createListeners[this.subRoom.id] = {
			format: this.battleFormat,
			game: this,
			callback: () => {
				this.subRoom.nameTournament(this.name);
				this.subRoom.forcePublicTournament();
				this.subRoom.forceTimerTournament();
				this.subRoom.disallowTournamentScouting();
				this.subRoom.disallowTournamentModjoin();

				this.subRoom.announce("You must join the tournament in this room to play! Once you leave, you cannot re-join.");

				this.tournamentCreated = true;
			},
		};

		this.subRoom.createTournament(this.battleFormat, 'elimination', this.playerCap);
	}

	onSignups(): void {
		super.onSignups();

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this.subRoom) this.subRoom.setTournamentCap(this.playerCap);
	}

	onDeallocate(forceEnd?: boolean): void {
		if (forceEnd && this.tournamentCreated && !this.tournamentEnded) {
			this.subRoom.endTournament();
		}
	}

	onTournamentStart(players: Dict<Player>, bracketData?: IClientTournamentData): void {
		this.tournamentStarted = true;
		this.createBracketFromClientData(players, bracketData);
	}

	onTournamentEnd(forceEnd?: boolean): void {
		this.tournamentEnded = true;
		if (forceEnd && !this.ended) this.end();
	}

	onTournamentPlayerJoin(tournamentPlayer: Player): void {
		this.addPlayer(Users.add(tournamentPlayer.name, tournamentPlayer.id), true);
	}

	onTournamentPlayerLeave(name: string): void {
		if (this.started) {
			const player = this.players[Tools.toId(name)];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (player && !player.eliminated) {
				player.eliminated = true;
				this.tournamentDisqualifiedPlayers.push(player);
				this.onRemovePlayer(player);
			}
		} else {
			this.removePlayer(name);
		}
	}

	onTournamentPlayerRename(player: Player, oldId: string): void {
		if (oldId in this.players && (!(player.id in this.players) || this.players[player.id].name !== player.name)) {
			this.renamePlayer(player.name, player.id, oldId);
		}
	}

	onTournamentBracketUpdate(players: Dict<Player>, clientTournamentData: IClientTournamentData, tournamentStarted: boolean): void {
		if (tournamentStarted) this.createBracketFromClientData(players, clientTournamentData);
	}

	createBracketFromClientData(players: Dict<Player>, clientTournamentData?: IClientTournamentData): void {
		if (this.treeRoot || !clientTournamentData || !clientTournamentData.rootNode) return;

		this.playerCap = 0;
		for (const i in players) {
			if (!(players[i].id in this.players)) {
				this.addPlayer(Users.add(players[i].name, players[i].id), true);
			}
		}

		for (const i in this.players) {
			if (!(this.players[i].id in players)) {
				this.removePlayer(this.players[i].name, true);
			}
		}

		this.treeRoot = Tournaments.bracketToEliminationNode(clientTournamentData.rootNode, this.players);

		this.start(true);
	}

	startElimination(): void {
		super.startElimination();

		this.startAutoDqTimer = setTimeout(() => {
			this.subRoom.setTournamentAutoDq(AUTO_DQ_MINUTES);
			this.subRoom.tournament!.setAutoDqMinutes(AUTO_DQ_MINUTES);
		}, this.firstRoundTime);

		const database = Storage.getDatabase(this.room);
		const eliminatedPlayers: Player[] = [];
		for (const i in this.players) {
			const player = this.players[i];
			if (database.tournamentGameBanlist && player.id in database.tournamentGameBanlist) {
				if (database.tournamentGameBanlist[player.id].expirationTime <= Date.now()) {
					delete database.tournamentGameBanlist[player.id];
				} else {
					player.say("You are currently banned from participating in tournament games.");
					eliminatedPlayers.push(player);
				}
			} else {
				if (player.eliminated) eliminatedPlayers.push(player);
			}
		}

		// handle banned players or those that leave the tournament during the reroll delay
		if (eliminatedPlayers.length) {
			const playersAndReasons = new Map<Player, string>();
			for (const player of eliminatedPlayers) {
				playersAndReasons.set(player, "You left the " + this.name + " tournament.");
			}

			this.disqualifyPlayers(playersAndReasons);
		}
	}

	setPlayerCap(playerCap: number): void {
		this.playerCap = playerCap;

		if (this.playerCount >= playerCap) {
			this.subRoom.startTournament();
		} else {
			this.subRoom.setTournamentCap(playerCap);
			this.say("The game's player cap has been set to **" + playerCap + "**.");
		}
	}

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.startAutoDqTimer) clearTimeout(this.startAutoDqTimer);
	}
}

export const game: IGameTemplateFile<BattleEliminationTournament> = Object.assign(Tools.deepClone(battleEliminationGame), {
	modes: undefined,
	modeProperties: undefined,
	tests: undefined,
	variants: undefined,
});