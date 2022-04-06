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

		if (Config.tournamentGamesSubRoom && this.room.id in Config.tournamentGamesSubRoom) {
			const subRoom = Rooms.get(Config.tournamentGamesSubRoom[this.room.id]);
			if (!subRoom) {
				this.say(Users.self.name + " must first join the room '" + Config.tournamentGamesSubRoom[this.room.id] + "'.");
				this.deallocate(true);
				return;
			}

			this.subRoom = subRoom;
		} else {
			const name = this.room.title + " " + GROUPCHAT_SUFFIX;
			const id = this.room.getSubRoomGroupchatId(name);
			const subRoom = Rooms.get(id);
			if (subRoom) {
				this.subRoom = subRoom;
			} else {
				Rooms.addCreateListener(id, room => {
					this.subRoom = room;
					if (this.signupsStarted) this.createTournament();
				});
				this.roomCreateListeners.push(id);

				Client.joinRoom(id);

				this.room.createSubRoomGroupchat(name);
			}
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
				if (this.timeout) clearTimeout(this.timeout);

				this.subRoom.nameTournament(this.name);
				this.subRoom.forcePublicTournament();
				this.subRoom.forceTimerTournament();
				this.subRoom.disallowTournamentScouting();
				this.subRoom.disallowTournamentModjoin();

				const customRules = this.getCustomRules();
				if (customRules.length) this.subRoom.setTournamentRules(customRules.join(","));

				this.subRoom.announce("You must join the tournament in this room to play!" +
					(!this.canRejoin ? " Once you leave, you cannot re-join." : ""));

				this.tournamentCreated = true;
			},
		};

		this.timeout = setTimeout(() => {
			if (!this.subRoom.tournament) {
				this.say("The tournament could not be created.");
				this.deallocate(true);
			}
		}, 15 * 1000);

		this.subRoom.createTournament(this.battleFormat, 'elimination', this.playerCap);
	}

	onSignups(): void {
		super.onSignups();

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this.subRoom && this.subRoom.initialized) {
			this.createTournament();
		}
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

	addTournamentPlayer(tournamentPlayer: Player): void {
		let user = Users.get(tournamentPlayer.name);
		let expiredUser = false;
		if (!user) {
			expiredUser = true;
			user = Users.add(tournamentPlayer.name, tournamentPlayer.id);
		}

		this.addPlayer(user, true);
		if (expiredUser) Users.remove(user);
	}

	onTournamentPlayerJoin(tournamentPlayer: Player): void {
		this.addTournamentPlayer(tournamentPlayer);
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
		if (!clientTournamentData || !clientTournamentData.rootNode) return;

		if (this.treeRoot) {
			// check for missed renames or Guest users
			const playersAndReasons = new Map<Player, string>();
			const root = Tournaments.bracketToStringEliminationNode(clientTournamentData.rootNode);

			const bracketPlayerIds: string[] = [];
			root.traverse(node => {
				if (node.children) {
					if (node.children[0].user) {
						const id = Tools.toId(node.children[0].user);
						if (!bracketPlayerIds.includes(id)) bracketPlayerIds.push(id);
					}

					if (node.children[1].user) {
						const id = Tools.toId(node.children[1].user);
						if (!bracketPlayerIds.includes(id)) bracketPlayerIds.push(id);
					}
				}
			});

			root.traverse(node => {
				if (node.children && node.children[0].user && node.children[1].user) {
					const nameA = node.children[0].user;
					const nameB = node.children[1].user;
					const idA = Tools.toId(nameA);
					const idB = Tools.toId(nameB);

					let unknownPlayer: string | undefined;
					let stuckPlayer: Player | undefined;
					if (!(idA in this.players) && idB in this.players) {
						unknownPlayer = nameA;
						stuckPlayer = this.players[idB];
					} else if (!(idB in this.players) && idA in this.players) {
						unknownPlayer = nameB;
						stuckPlayer = this.players[idA];
					}

					const opponent = stuckPlayer ? this.playerOpponents.get(stuckPlayer) : undefined;
					if (unknownPlayer && stuckPlayer && opponent && this.playerOpponents.get(opponent) === stuckPlayer &&
						!bracketPlayerIds.includes(opponent.id)) {
						this.renamePlayer(unknownPlayer, Tools.toId(unknownPlayer), opponent.id);

						if (unknownPlayer.startsWith("Guest ")) {
							playersAndReasons.set(opponent, "You left the " + this.name + " tournament.");
						}
					}
				}
			});

			if (playersAndReasons.size) this.disqualifyPlayers(playersAndReasons);

			root.destroy();
		} else {
			this.playerCap = 0;
			for (const i in players) {
				if (!(players[i].id in this.players)) {
					this.addTournamentPlayer(players[i]);
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

// @ts-expect-error
export const game: IGameTemplateFile<BattleEliminationTournament> = Tools.deepClone(battleEliminationGame);