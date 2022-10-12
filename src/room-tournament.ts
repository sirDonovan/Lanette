import type { Player } from "./room-activity";
import { Activity } from "./room-activity";
import type { ScriptedGame } from "./room-game-scripted";
import type { Room } from "./rooms";
import type { IBattleGameData } from "./types/games";
import type { IFormat } from "./types/pokemon-showdown";
import type { ICurrentTournamentBattle, ITournamentEndJson, ITournamentUpdateJson } from "./types/tournaments";

const AUTO_DQ_WARNING_TIMEOUT = 30 * 1000;
const GENERATORS: Dict<number> = {
	"Single": 1,
	"Double": 2,
	"Triple": 3,
	"Quadruple": 4,
	"Quintuple": 5,
	"Sextuple": 6,
};

export class Tournament extends Activity {
	readonly activityType: string = 'tournament';
	adjustCapTimer: NodeJS.Timer | null = null;
	readonly battleData = new Map<Room, IBattleGameData>();
	readonly battleRooms: string[] = [];
	readonly createTime: number = Date.now();
	readonly currentBattles: ICurrentTournamentBattle[] = [];
	finalBattle: boolean = false;
	generator: number = 1;
	readonly info: ITournamentUpdateJson & ITournamentEndJson = {
		bracketData: {type: ''},
		challengeBys: [],
		challenged: '',
		challenges: [],
		challenging: '',
		format: '',
		generator: '',
		isJoined: false,
		isStarted: false,
		playerCap: 0,
		results: [],
		teambuilderFormat: '',
	};
	isRoundRobin: boolean = false;
	isSingleElimination: boolean = false;
	manuallyNamed: boolean = false;
	manuallyEnabledPoints: boolean | undefined = undefined;
	originalFormat: string = '';
	playerBattleRooms = new Map<Player, Room>();
	playerLosses = new Map<Player, number>();
	playerOpponents = new Map<Player, Player>();
	runAutoDqTime: number = 0;
	runAutoDqTimeout: NodeJS.Timer | null = null;
	official: boolean = false;
	totalPlayers: number = 0;
	updates: Partial<ITournamentUpdateJson> = {};

	readonly joinBattles: boolean;

	battleRoomGame?: ScriptedGame;

	// set in initialize()
	format!: IFormat;
	playerCap!: number;
	declare readonly room: Room;

	constructor(room: Room, pmRoom?: Room) {
		super(room, pmRoom);

		this.joinBattles = Config.trackTournamentBattleScores && Config.trackTournamentBattleScores.includes(room.id) ? true : false;
	}

	initialize(format: IFormat, generator: string, playerCap: number, name?: string): void {
		this.format = format;
		this.playerCap = playerCap;
		this.name = name || format.name;
		this.originalFormat = format.name;
		this.id = format.id;
		this.uhtmlBaseName = 'tournament-' + this.id;

		if (name) this.manuallyNamed = true;
		this.setGenerator(generator);
	}

	setGenerator(generator: string): void {
		const generatorName = generator.split(" ")[0];
		if (generatorName in GENERATORS) {
			this.generator = GENERATORS[generatorName];
		} else {
			const generatorNumber = parseInt(generator.split("-tuple")[0]);
			if (!isNaN(generatorNumber)) this.generator = generatorNumber;
		}

		this.isRoundRobin = Tools.toId(generator).includes('roundrobin');
		this.isSingleElimination = !this.isRoundRobin && this.generator === 1;
	}

	setCustomFormatName(): void {
		if (this.manuallyNamed) return;

		const previousName = this.name;
		this.name = Dex.getCustomFormatName(this.format);
		if (this.name !== previousName) this.room.nameTournament(this.name);
	}

	formatAwardsPoints(): boolean {
		if (Config.manualRankedTournaments && Config.manualRankedTournaments.includes(this.room.id) && !this.manuallyEnabledPoints) {
			return false;
		}

		if (this.format.customRules) {
			if (!Config.rankedCustomTournaments || !Config.rankedCustomTournaments.includes(this.room.id)) return false;
		} else {
			if (!Config.rankedTournaments || !Config.rankedTournaments.includes(this.room.id)) return false;
		}

		if (this.format.unranked && !this.official && Config.useDefaultUnrankedTournaments &&
			Config.useDefaultUnrankedTournaments.includes(this.room.id)) {
			return false;
		}

		if (Config.unrankedTournamentFormats && this.room.id in Config.unrankedTournamentFormats &&
			Config.unrankedTournamentFormats[this.room.id].includes(this.format.id)) {
			return false;
		}

		return true;
	}

	willAwardPoints(): boolean {
		if (this.manuallyEnabledPoints !== undefined) return this.manuallyEnabledPoints;
		return this.official || this.formatAwardsPoints();
	}

	adjustCap(cap?: number): void {
		if (!cap) {
			if (this.playerCount && this.playerCount % 8 === 0) {
				this.room.startTournament();
				return;
			}

			let newCap = this.playerCount + 1;
			while (newCap % 8 !== 0) {
				newCap += 1;
			}

			if (this.playerCap && newCap >= this.playerCap) return;
			cap = newCap;
		}

		if (this.adjustCapTimer) clearTimeout(this.adjustCapTimer);

		this.room.setTournamentCap(cap);
		if (!this.playerCap) this.room.autoStartTournament();
		this.say("The tournament's player cap is now **" + cap + "**.");
	}

	setAutoDqMinutes(minutes: number): void {
		this.runAutoDqTime = (minutes * 60 * 1000) - AUTO_DQ_WARNING_TIMEOUT;
		if (this.started) this.setRunAutoDqTimeout();
	}

	setRunAutoDqTimeout(): void {
		if (this.runAutoDqTimeout) clearTimeout(this.runAutoDqTimeout);

		if (this.runAutoDqTime <= 0) return;

		this.runAutoDqTimeout = setTimeout(() => {
			this.runAutoDqTimeout = null;

			if (!this.finalBattle) {
				this.room.runTournamentAutoDq();
				this.setRunAutoDqTimeout();
			}
		}, this.runAutoDqTime);
	}

	deallocate(forceEnd?: boolean): void {
		if (this.adjustCapTimer) {
			clearTimeout(this.adjustCapTimer);
			// @ts-expect-error
			this.adjustCapTimer = undefined;
		}

		if (this.runAutoDqTimeout) {
			clearTimeout(this.runAutoDqTimeout);
			// @ts-expect-error
			this.runAutoDqTimeout = undefined;
		}

		if (this.battleRoomGame && this.battleRoomGame.onTournamentEnd) this.battleRoomGame.onTournamentEnd(forceEnd);

		this.cleanupMisc();
		this.cleanupTimers();
		this.cleanupMessageListeners();
		this.cleanupBattleRooms();

		// @ts-expect-error
		this.room.tournament = undefined;

		this.playerBattleRooms.clear();
		this.playerLosses.clear();
		this.playerOpponents.clear();

		this.destroyPlayers();

		Tools.unrefProperties(this, ["ended", "id", "name"]);
	}

	addPlayer(name: string): void {
		const player = this.createPlayer(name) || this.players[Tools.toId(name)];
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (player) {
			if (this.battleRoomGame && this.battleRoomGame.onTournamentPlayerJoin) {
				this.battleRoomGame.onTournamentPlayerJoin(player);
			}
		}
	}

	removePlayer(name: string): void {
		const player = this.destroyPlayer(name);
		if (player) {
			const opponent = this.playerOpponents.get(player);
			if (opponent) {
				for (let i = 0; i < this.currentBattles.length; i++) {
					if ((this.currentBattles[i].playerA === player && this.currentBattles[i].playerB === opponent) ||
						(this.currentBattles[i].playerA === opponent && this.currentBattles[i].playerB === player)) {
						this.currentBattles.splice(i, 1);
						break;
					}
				}
			}

			const battleRoom = this.playerBattleRooms.get(player);
			if (battleRoom && !this.battleRoomGame) this.leaveBattleRoom(battleRoom);
		}

		if (this.battleRoomGame && this.battleRoomGame.onTournamentPlayerLeave) {
			this.battleRoomGame.onTournamentPlayerLeave(name);
		}
	}

	onRenamePlayer(player: Player, oldId: string): void {
		if (this.battleRoomGame && this.battleRoomGame.onTournamentPlayerRename) {
			this.battleRoomGame.onTournamentPlayerRename(player, oldId);
		}
	}

	start(): void {
		if (this.adjustCapTimer) clearTimeout(this.adjustCapTimer);
		if (this.startTimer) clearTimeout(this.startTimer);
		this.started = true;
		this.startTime = Date.now();
		this.setRunAutoDqTimeout();

		if (this.battleRoomGame && this.battleRoomGame.onTournamentStart) {
			this.battleRoomGame.onTournamentStart(this.players, this.info.isStarted ? this.info.bracketData : undefined);
		}
	}

	onEnd(): void {
		if (!Config.allowTournaments || !Config.allowTournaments.includes(this.room.id)) return;

		const now = Date.now();
		const database = Storage.getDatabase(this.room);
		if (!database.pastTournaments) database.pastTournaments = [];
		database.pastTournaments.unshift({inputTarget: this.format.inputTarget, name: this.format.name, time: now});
		while (database.pastTournaments.length > 8) {
			database.pastTournaments.pop();
		}

		database.lastTournamentTime = now;
		if (!database.lastTournamentFormatTimes) database.lastTournamentFormatTimes = {};
		database.lastTournamentFormatTimes[this.format.id] = now;

		let winners: string[] = [];
		let runnersUp: string[] = [];
		let semiFinalists: string[] = [];
		if (this.info.bracketData.type === 'tree') {
			if (this.info.bracketData.rootNode) {
				const places = Tournaments.getPlacesFromTree(Tournaments.resultsToEliminationNode(this.info.bracketData.rootNode));
				if (places.winner) winners = [places.winner];
				if (places.runnerup) runnersUp = [places.runnerup];
				if (places.semifinalists) semiFinalists = places.semifinalists;
			}
		} else {
			if (this.info.results[0]) winners = this.info.results[0].map(x => Tools.stripHtmlCharacters(x));
			if (this.info.results[1]) runnersUp = this.info.results[1].map(x => Tools.stripHtmlCharacters(x));
			if (this.info.results[2]) semiFinalists = this.info.results[2].map(x => Tools.stripHtmlCharacters(x));
		}

		if (!winners.length || !runnersUp.length || (this.isSingleElimination && semiFinalists.length < 2)) return;

		let awardedPoints = false;
		const pointsSource = this.format.id;
		if (!this.willAwardPoints()) {
			if (!Config.displayUnrankedTournamentResults || !Config.displayUnrankedTournamentResults.includes(this.room.id)) return;

			const text = ["runner" + (runnersUp.length > 1 ? "s" : "") + "-up " + Tools.joinList(runnersUp, '**'),
				"winner" + (winners.length > 1 ? "s" : "") + " " + Tools.joinList(winners, '**')];
			if (semiFinalists.length) {
				text.unshift("semi-finalist" + (semiFinalists.length > 1 ? "s" : "") + " " + Tools.joinList(semiFinalists, '**'));
			}
			this.room.announce('Congratulations to ' + Tools.joinList(text));
		} else {
			awardedPoints = true;

			const multiplier = Tournaments.getCombinedPointMultiplier(this.format, this.totalPlayers, this.official);
			const semiFinalistPoints = Tournaments.getSemiFinalistPoints(multiplier);
			const runnerUpPoints = Tournaments.getRunnerUpPoints(multiplier);
			const winnerPoints = Tournaments.getWinnerPoints(multiplier);

			const semiFinalistPm = 'You were awarded **' + semiFinalistPoints + ' point' + (semiFinalistPoints > 1 ? "s" : "") +
				'** for being ' + (semiFinalists.length > 1 ? 'a' : 'the') + ' semi-finalist in the tournament! To see your total ' +
				'amount, use this command: ``' + Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const semiFinalist of semiFinalists) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, semiFinalist, semiFinalistPoints, pointsSource, true);
				const user = Users.get(semiFinalist);
				if (user) user.say(semiFinalistPm);
			}

			const runnerUpPm = 'You were awarded **' + runnerUpPoints + ' points** for being ' + (runnersUp.length > 1 ? 'a' :
				'the') + ' runner-up in the tournament! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const runnerUp of runnersUp) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, runnerUp, runnerUpPoints, pointsSource, true);
				const user = Users.get(runnerUp);
				if (user) user.say(runnerUpPm);
			}

			const winnerPm = 'You were awarded **' + winnerPoints + ' points** for being ' +
				(winners.length > 1 ? 'a' : 'the') + ' tournament winner! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'rank ' + this.room.title + '``.';
			for (const winner of winners) {
				Storage.addPoints(this.room, Storage.tournamentLeaderboard, winner, winnerPoints, pointsSource, true);
				const user = Users.get(winner);
				if (user) user.say(winnerPm);
			}

			Storage.afterAddPoints(this.room, Storage.tournamentLeaderboard, pointsSource);

			const placesHtml = Tournaments.getPlacesHtml('tournamentLeaderboard', (this.official ? "Official " : "") + this.format.name,
				winners, runnersUp, semiFinalists, winnerPoints, runnerUpPoints, semiFinalistPoints);
			const showTrainerCard = winners.length === 1 && Config.showTournamentTrainerCards &&
				Config.showTournamentTrainerCards.includes(this.room.id);

			if (showTrainerCard) {
				const buttonRoom = this.room.alias || this.room.id;

				const tournamentPointsShop = Tournaments.hasTournamentPointsShopItems(this.room) ? Client.getQuietPmButton(this.room,
					Config.commandCharacter + "tpshop " + buttonRoom, "Visit the points shop") : "";

				Tournaments.displayTrainerCard(this.room, winners[0], "<div class='infobox-limited'><center>" + placesHtml +
					"</center><br />", "<br /><center>" + Client.getQuietPmButton(this.room, Config.commandCharacter + "topprivate " +
					buttonRoom, this.room.title + " leaderboard") + "&nbsp;" +
					Client.getQuietPmButton(this.room, Config.commandCharacter + "topprivate " + buttonRoom + "," + this.format.name,
						this.format.name + " leaderboard") + "&nbsp;" +
					Client.getQuietPmButton(this.room, Config.commandCharacter + "nexttourprivate " + buttonRoom,
						"Next tournament") + "&nbsp;" +
					Client.getQuietPmButton(this.room, Config.commandCharacter + "ttc " + buttonRoom,
						"Customize your profile") + tournamentPointsShop + "</center></div>");
			} else {
				const formatLeaderboard = Tournaments.getFormatLeaderboardHtml(this.room, this.format);

				this.sayHtml("<div class='infobox-limited'>" + placesHtml + (formatLeaderboard ? "<br /><br />" + formatLeaderboard : "") +
					"</div>");
			}
		}

		if (awardedPoints) {
			Storage.tryExportDatabase(this.room.id);
		}
	}

	forceEnd(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.deallocate(true);
	}

	update(json: Partial<ITournamentUpdateJson & ITournamentEndJson>): void {
		Object.assign(this.updates, json);
	}

	updateEnd(): void {
		Object.assign(this.info, this.updates);

		if (this.updates.generator) this.setGenerator(this.updates.generator);

		if (this.updates.bracketData) {
			if (this.info.isStarted) {
				this.updateBracket();
			} else {
				if (this.updates.bracketData.users) {
					for (const user of this.updates.bracketData.users) {
						this.createPlayer(Tools.stripHtmlCharacters(user));
					}
				}
			}
		}

		if (this.updates.format) {
			const format = Dex.getFormat(this.updates.format);
			if (format && format.effectType === 'Format') {
				this.name = format.name;
				if (format.name === this.originalFormat) this.manuallyNamed = false;
			} else {
				this.name = this.updates.format;
				if (this.name !== (this.format.name + Dex.getDefaultCustomRulesName()) &&
					this.name !== Dex.getCustomFormatName(this.format)) {
					this.manuallyNamed = true;
				}
			}
		}

		if (this.battleRoomGame && this.updates.bracketData) {
			if (this.info.isStarted && this.battleRoomGame.onTournamentBracketUpdate) {
				this.battleRoomGame.onTournamentBracketUpdate(this.players, this.info.bracketData, this.info.isStarted);
			} else if (!this.info.isStarted && this.info.bracketData.users && this.battleRoomGame.onTournamentUsersUpdate) {
				this.battleRoomGame.onTournamentUsersUpdate(this.players, this.info.bracketData.users);
			}
		}

		this.updates = {};
	}

	updateBracket(): void {
		const players: Dict<string> = {};
		const losses: Dict<number> = {};
		if (this.info.bracketData.type === 'tree') {
			if (!this.info.bracketData.rootNode) return;
			const queue = [this.info.bracketData.rootNode];
			const allNodes = queue.slice();
			// queue is only unique items due to allNodes
			while (queue.length > 0) {
				const node = queue[0];
				queue.shift();
				if (!node.children) continue;

				let userA;
				let userB;

				if (node.children[0] && node.children[0].team) {
					userA = Tools.toId(node.children[0].team);
					if (!players[userA]) players[userA] = Tools.stripHtmlCharacters(node.children[0].team);
				}

				if (node.children[1] && node.children[1].team) {
					userB = Tools.toId(node.children[1].team);
					if (!players[userB]) players[userB] = Tools.stripHtmlCharacters(node.children[1].team);
				}

				if (userA && userB && node.state === 'finished') {
					if (node.result === 'win') {
						if (!losses[userB]) losses[userB] = 0;
						losses[userB]++;
					} else if (node.result === 'loss') {
						if (!losses[userA]) losses[userA] = 0;
						losses[userA]++;
					}
				}

				node.children.forEach(child => {
					if (!allNodes.includes(child)) {
						queue.push(child);
						allNodes.push(child);
					}
				});
			}
		} else if (this.info.bracketData.type === 'table') {
			if (!this.info.bracketData.tableHeaders || !('cols' in this.info.bracketData.tableHeaders)) return;
			for (const name of this.info.bracketData.tableHeaders.cols) {
				const id = Tools.toId(name);
				if (!players[id]) players[id] = Tools.stripHtmlCharacters(name);
			}
		}

		if (!this.totalPlayers) {
			this.totalPlayers = Object.keys(players).length;
			this.playerCount = this.totalPlayers;
		}

		// clear users who are now guests (currently can't be tracked)
		for (const i in this.players) {
			if (!(i in players)) {
				this.players[i].destroy();
				delete this.players[i];
			}
		}

		for (const i in players) {
			const player = this.createPlayer(players[i]) || this.players[i];
			if (player.eliminated) continue;
			const playerLosses = this.playerLosses.get(player);
			if (losses[i] && losses[i] !== playerLosses) {
				this.playerLosses.set(player, losses[i]);
				if (losses[i] >= this.generator) {
					player.eliminated = true;
				}
			}
		}
	}

	onBattleStart(playerName: string, opponentName: string, roomid: string): void {
		this.setRunAutoDqTimeout();

		const playerId = Tools.toId(playerName);
		const opponentId = Tools.toId(opponentName);
		if (!(playerId in this.players)) {
			throw new Error("Player not found for " + playerName + " in battle " + roomid + " (tournament in " + this.room.title + ")");
		}

		if (!(opponentId in this.players)) {
			throw new Error("Player not found for " + opponentName + " in " + roomid + " (tournament in " + this.room.title + ")");
		}

		const player = this.players[playerId];
		const opponent = this.players[opponentId];

		this.playerOpponents.set(player, opponent);
		this.playerOpponents.set(opponent, player);

		this.currentBattles.push({
			playerA: player,
			playerB: opponent,
			roomid,
		});

		let publicId = roomid;
		const extractedBattleId = Client.extractBattleId(roomid);
		if (extractedBattleId) {
			publicId = extractedBattleId.publicId;
		}
		this.battleRooms.push(publicId);

		if (this.generator === 1 && this.getRemainingPlayerCount() === 2) {
			this.finalBattle = true;

			if (this.totalPlayers >= 4) {
				this.room.announce("Final battle of the " + this.name + " " + this.activityType + ": <<" + roomid + ">>!");
			}
		}

		if (this.joinBattles || this.battleRoomGame) {
			Rooms.addCreateListener(roomid, room => {
				this.playerBattleRooms.set(player, room);
				this.playerBattleRooms.set(opponent, room);

				if (this.joinBattles) room.tournament = this;
				if (this.battleRoomGame) room.game = this.battleRoomGame;
			});
			this.roomCreateListeners.push(roomid);

			Client.joinRoom(roomid);
		}

		if (this.battleRoomGame && this.battleRoomGame.onTournamentBattleStart) {
			this.battleRoomGame.onTournamentBattleStart(player, opponent, roomid);
		}
	}

	onBattleEnd(playerName: string, opponentName: string, score: [string, string], roomid: string): void {
		this.setRunAutoDqTimeout();

		const playerId = Tools.toId(playerName);
		const opponentId = Tools.toId(opponentName);
		if (!(playerId in this.players)) {
			throw new Error("Player not found for " + playerName + " in " + roomid + " (tournament in " + this.room.title + ")");
		}

		if (!(opponentId in this.players)) {
			throw new Error("Player not found for " + opponentName + " in " + roomid + " (tournament in " + this.room.title + ")");
		}

		const player = this.players[playerId];
		const opponent = this.players[opponentId];

		this.playerBattleRooms.delete(player);
		this.playerBattleRooms.delete(opponent);

		this.playerOpponents.delete(player);
		this.playerOpponents.delete(opponent);

		for (let i = 0; i < this.currentBattles.length; i++) {
			if (this.currentBattles[i].playerA === player && this.currentBattles[i].playerB === opponent &&
				this.currentBattles[i].roomid === roomid) {
				this.currentBattles.splice(i, 1);
				break;
			}
		}

		const room = Rooms.get(roomid);
		if (room && !this.battleRoomGame) this.leaveBattleRoom(room);
	}

	onBattlePlayer(room: Room, slot: string, username: string): void {
		const id = Tools.toId(username);
		if (!(id in this.players)) return;

		let battleData = this.battleData.get(room);
		if (!battleData) {
			battleData = this.generateBattleData();
			this.battleData.set(room, battleData);
		}

		battleData.slots.set(this.players[id], slot);
	}

	onBattleTeamSize(room: Room, slot: string, size: number): void {
		const battleData = this.battleData.get(room);
		if (!battleData) return;

		battleData.remainingPokemon[slot] = size;
	}

	onBattleFaint(room: Room, pokemonArgument: string): void {
		const battleData = this.battleData.get(room);
		if (!battleData) return;

		const slot = pokemonArgument.substr(0, 2);
		if (slot in battleData.remainingPokemon) battleData.remainingPokemon[slot]--;
	}
}
