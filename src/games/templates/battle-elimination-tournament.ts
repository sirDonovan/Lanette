import type { Player } from "../../room-activity";
import type { Room } from "../../rooms";
import type { IGameTemplateFile } from "../../types/games";
import type { IClientTournamentData } from "../../types/tournaments";
import { game as battleEliminationGame, BattleElimination } from "./battle-elimination";

const GROUPCHAT_SUFFIX = "Games";

export abstract class BattleEliminationTournament extends BattleElimination {
	autoDqMinutes: number = 3;
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

		this.firstRoundTime = (this.autoDqMinutes * 60 * 1000) + this.firstRoundExtraTime;

		if (Config.tournamentGamesSameRoom && Config.tournamentGamesSameRoom.includes(this.room.id)) {
			this.subRoom = this.room;
			this.sameRoomSubRoom = true;
		} else if (Config.tournamentGamesSubRoom && this.room.id in Config.tournamentGamesSubRoom) {
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
				this.creatingSubRoom = true;

				Rooms.addCreateListener(id, room => {
					this.subRoom = room;
					this.creatingSubRoom = false;
					this.startAdvertisements();
					if (this.signupsStarted) this.createTournament();
				});

				this.roomCreateListeners.push(id);

				Client.joinRoom(id);

				this.room.createSubRoomGroupchat(name);
			}
		}
	}

	getCustomRules(): string[] {
		const customRules = this.battleFormat.customRules ? this.battleFormat.customRules.slice() : [];
		if (!this.usesCloakedPokemon) {
			const allPokemon: string[] = [];
			const checkedPokemon: Dict<boolean> = {};

			for (const name of this.pokedex) {
				const pokemon = Dex.getExistingPokemon(name);

				const formes = this.allowsFormes ? Dex.getFormes(pokemon, true) : [pokemon.name];
				const usableFormes: string[] = [];
				for (const forme of formes) {
					if (this.battleFormat.usablePokemon!.includes(forme)) usableFormes.push(forme);
				}

				if (this.evolutionsPerRound) {
					const evolutionLines = Dex.getEvolutionLines(pokemon, usableFormes);
					for (const line of evolutionLines) {
						for (const stage of line) {
							if (stage in checkedPokemon) continue;

							const stageFormes = this.allowsFormes ? Dex.getFormes(Dex.getExistingPokemon(stage), true) : [stage];
							const usableStageFormes: string[] = [];
							for (const stageForme of stageFormes) {
								if (this.battleFormat.usablePokemon!.includes(stageForme)) usableStageFormes.push(stageForme);
							}

							let addBaseModifier = false;
							if (!Dex.getExistingPokemon(stage).forme && usableStageFormes.length !== stageFormes.length) {
								for (const usableStageForme of usableStageFormes) {
									if (!Dex.getExistingPokemon(usableStageForme).forme) {
										addBaseModifier = true;
										break;
									}
								}
							}

							if (addBaseModifier) {
								const baseModifier = stage + "-Base";
								if (!allPokemon.includes(baseModifier)) allPokemon.push(baseModifier);
							}

							for (const usableStageForme of usableStageFormes) {
								if (addBaseModifier && usableStageForme === stage) continue;

								if (!allPokemon.includes(usableStageForme)) allPokemon.push(usableStageForme);
							}

							checkedPokemon[stage] = true;
						}
					}
				} else {
					let addBaseModifier = false;
					if (!pokemon.forme && usableFormes.length !== formes.length) {
						for (const forme of usableFormes) {
							if (!Dex.getExistingPokemon(forme).forme) {
								addBaseModifier = true;
								break;
							}
						}
					}

					if (addBaseModifier) {
						const baseModifier = pokemon.name + "-Base";
						if (!allPokemon.includes(baseModifier)) allPokemon.push(baseModifier);
					}

					for (const usableForme of usableFormes) {
						if (addBaseModifier && usableForme === pokemon.name) continue;

						if (!allPokemon.includes(usableForme)) allPokemon.push(usableForme);
					}
				}
			}

			const pokemonListRules = Dex.getCustomRulesForPokemonList(allPokemon);
			for (const rule of pokemonListRules) {
				if (!customRules.includes(rule)) customRules.push(rule);
			}
		}

		if (this.getGameCustomRules) {
			const ruleTable = Dex.getRuleTable(this.battleFormat);
			const gameCustomRules = this.getGameCustomRules();
			for (const rule of gameCustomRules) {
				try {
					const validated = Dex.validateRule(rule);
					if (typeof validated === 'string' && !ruleTable.has(validated) && !customRules.includes(validated)) {
						customRules.push(validated);
					}
				} catch (e) {} // eslint-disable-line no-empty
			}
		}

		return customRules;
	}

	createTournament(): void {
		if (this.subRoom.tournament) {
			this.say("You must wait for the " + this.subRoom.tournament.name + " tournament" +
				(!this.sameRoomSubRoom ? " in " + this.subRoom.title : "") + " to end.");
			this.deallocate(true);
			return;
		}

		Tournaments.createListeners[this.subRoom.id] = {
			format: this.battleFormat,
			game: this,
			callback: () => {
				if (this.timeout) clearTimeout(this.timeout);

				this.subRoom.forcePublicTournament();
				this.subRoom.forceTimerTournament();
				this.subRoom.disallowTournamentScouting();
				this.subRoom.disallowTournamentModjoin();

				const customRules = this.getCustomRules();
				if (customRules.length) {
					this.subRoom.setTournamentRules(customRules.join(","));

					const customRuleInfo = Dex.getCustomRuleInfoDisplay(customRules);
					if (customRuleInfo) this.subRoom.sayHtml(customRuleInfo);

					this.pokedex = this.shuffle(this.pokedex);
				}

				this.subRoom.announce("You must join the tournament in this room to play!" +
					(!this.canRejoin ? " Once you leave, you cannot re-join." : ""));

				if (Config.tournamentGameRoomAdvertisements && this.room.id in Config.tournamentGameRoomAdvertisements) {
					for (const roomId of Config.tournamentGameRoomAdvertisements[this.room.id]) {
						const advertisementRoom = Rooms.get(roomId);
						if (advertisementRoom) {
							advertisementRoom.sayHtml('<a href="/' + this.subRoom.id + '" class="ilink"><strong>' +
								this.format.nameWithOptions + '</strong> tournament created in <strong>' + this.subRoom.title +
								'</strong>.</a>');
						}
					}
				}

				this.tournamentCreated = true;
			},
		};

		this.setTimeout(() => {
			if (!this.subRoom.tournament) {
				this.say("The tournament could not be created.");
				this.deallocate(true);
			}
		}, 30 * 1000);

		Tournaments.createTournament(this.subRoom, {format: this.battleFormat, cap: this.playerCap, name: this.name});
	}

	onSignups(): void {
		super.onSignups();

		this.debugLog("Original Pokedex size: " + this.pokedex.length);

		if (!this.usesCloakedPokemon) {
			// limit pokedex size for custom rules
			const maxPokemon = Math.max(this.getMinimumPokedexSizeForPlayers(this.maxPlayers - 1),
				this.getMinimumPokedexSizeForPlayers(this.maxPlayers));

			this.debugLog("Max Pokemon: " + maxPokemon + " (for " + this.maxPlayers + " max players)");

			if (this.pokedex.length > maxPokemon) {
				this.pokedex = this.pokedex.slice(0, maxPokemon);

				this.debugLog("Reduced Pokedex size: " + this.pokedex.length);
			}
		}

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
				this.debugLog(player.name + " left the tournament");

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
			this.debugLog("Renamed through room-tournament: " + oldId + " -> " + player.name);

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
				if (node.children) {
					const nameA = node.children[0].user || "";
					const nameB = node.children[1].user || "";
					const idA = Tools.toId(nameA);
					const idB = Tools.toId(nameB);

					let unknownPlayer: string | undefined;
					let stuckPlayer: Player | undefined;
					if (!(idA in this.players) && (!idB || idB in this.players)) {
						unknownPlayer = nameA;
						stuckPlayer = this.players[idB];
					} else if (!(idB in this.players) && (!idA || idA in this.players)) {
						unknownPlayer = nameB;
						stuckPlayer = this.players[idA];
					}

					const opponent = stuckPlayer ? this.playerOpponents.get(stuckPlayer) : undefined;
					if (unknownPlayer && stuckPlayer && opponent && this.playerOpponents.get(opponent) === stuckPlayer &&
						!bracketPlayerIds.includes(opponent.id)) {
						this.debugLog("Missed rename: " + opponent.name + " -> " + unknownPlayer);

						this.renamePlayer(unknownPlayer, Tools.toId(unknownPlayer), opponent.id);

						if (unknownPlayer.startsWith(Tools.guestUserPrefix)) {
							playersAndReasons.set(opponent, "You left the " + this.name + " tournament.");
						}
					} else if (unknownPlayer) {
						const missingPlayers: Player[] = [];
						for (const i in this.players) {
							if (!bracketPlayerIds.includes(this.players[i].id)) {
								missingPlayers.push(this.players[i]);
							}
						}

						if (missingPlayers.length === 1) {
							this.debugLog("Missed rename: " + missingPlayers[0].name + " -> " + unknownPlayer);

							this.renamePlayer(unknownPlayer, Tools.toId(unknownPlayer), missingPlayers[0].id);

							if (unknownPlayer.startsWith(Tools.guestUserPrefix)) {
								playersAndReasons.set(missingPlayers[0], "You left the " + this.name + " tournament.");
							}
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
			this.subRoom.setTournamentAutoDq(this.autoDqMinutes);
			this.subRoom.tournament!.setAutoDqMinutes(this.autoDqMinutes);
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

	startTournament(): boolean {
		if (!this.subRoom.initialized || this.playerCount < this.minPlayers) return false;

		this.subRoom.startTournament();
		return true;
	}
}

// @ts-expect-error
export const game: IGameTemplateFile<BattleEliminationTournament> = Tools.deepClone(battleEliminationGame);