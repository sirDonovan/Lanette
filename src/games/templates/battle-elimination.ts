import { EliminationNode } from "../../lib/elimination-node";
import { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import { addPlayers, assert, assertStrictEqual } from "../../test/test-tools";
import type { IGetPossibleTeamsOptions } from "../../types/dex";
import type {
	GameCategory, GameCommandDefinitions, GameFileTests, IBattleGameData, IGameInputProperties, IGameTemplateFile
} from "../../types/games";
import type { GameType, IFormat, IPokemon } from "../../types/pokemon-showdown";
import type { User } from "../../users";

interface IEliminationTree<T> {
	root: EliminationNode<T>;
	currentLayerLeafNodes?: EliminationNode<T>[];
	nextLayerLeafNodes?: EliminationNode<T>[];
}

interface ITeamChange {
	additions: number;
	choices: string[];
	drops: number;
	evolutions: number;
}

const REROLL_COMMAND = "reroll";
const REROLL_START_DELAY = 30 * 1000;
const UPDATE_HTML_PAGE_DELAY = 5 * 1000;
const CHECK_CHALLENGES_INACTIVE_DELAY = 30 * 1000;
const ADVERTISEMENT_TIME = 5 * 60 * 1000;
const POTENTIAL_MAX_PLAYERS: number[] = [12, 16, 24, 32, 48, 64];

export abstract class BattleElimination extends ScriptedGame {
	abstract baseHtmlPageGameName: string;

	activityDQTimeout: number = 2 * 60 * 1000;
	activityTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	activityWarnTimeout: number = 3 * 60 * 1000;
	additionsPerRound: number = 0;
	advertisementInterval: NodeJS.Timer | null = null;
	allowsFormes: boolean = true;
	allowsScouting: boolean = false;
	availableMatchNodes: EliminationNode<Player>[] = [];
	banlist: string[] = [];
	battleFormatId: string = 'ou';
	battleFormatType: GameType = 'singles';
	readonly battleData = new Map<Room, IBattleGameData>();
	readonly battleRooms: string[] = [];
	bracketHtml: string = '';
	canChangeFormat: boolean = false;
	canRejoin: boolean = false;
	canReroll: boolean = false;
	checkedBattleRooms: string[] = [];
	checkChallengesTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	checkChallengesInactiveTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	color: string | null = null;
	disqualifiedOpponents = new Map<Player, Player>();
	disqualifiedPlayers = new Map<Player, string>();
	dontAutoCloseHtmlPages: boolean = true;
	dropsPerRound: number = 0;
	eliminationPlayers = new Set<Player>();
	eliminationEnded: boolean = false;
	eliminationStarted: boolean = false;
	evolutionsPerRound: number = 0;
	firstRoundByes = new Set<Player>();
	firstRoundByeAdditions = new Map<Player, string[]>();
	firstRoundExtraTime: number = 0;
	firstRoundTime: number = 0;
	fullyEvolved: boolean = false;
	gen: number | null = null;
	givenFirstRoundExtraTime = new Set<Player>();
	hasSpeciesClause: boolean = false;
	htmlPageGameDescription: string = '';
	htmlPageGameName: string = '';
	internalGame = true;
	maxPlayers: number = POTENTIAL_MAX_PLAYERS[POTENTIAL_MAX_PLAYERS.length - 1];
	minPlayers: number = 4;
	monoColor: boolean = false;
	monoRegion: boolean = false;
	monoType: boolean = false;
	playerBattleRooms = new Map<Player, Room>();
	playerCap: number = 0;
	playerOpponents = new Map<Player, Player>();
	playerRequiredPokemon = new Map<Player, readonly string[][]>();
	pokedex: string[] = [];
	possibleTeams = new Map<Player, readonly string[][]>();
	requiredAddition: boolean = false;
	requiredDrop: boolean = false;
	requiredEvolution: boolean = false;
	requiresAutoconfirmed: boolean = true;
	rerolls = new Map<Player, boolean>();
	rerollStartDelay: number = REROLL_START_DELAY;
	requiredTier: string | null = null;
	sharedTeams: boolean = false;
	spectatorPlayers = new Set<Player>();
	spectatorUsers = new Set<string>();
	starterPokemon = new Map<Player, readonly string[]>();
	startingTeamsLength: number = 6;
	teamChanges = new Map<Player, ITeamChange[]>();
	totalAdvertisementTime: number = 0;
	totalRounds: number = 0;
	tournamentDisqualifiedPlayers: Player[] = [];
	treeRoot: EliminationNode<Player> | null = null;
	type: string | null = null;
	usesCloakedPokemon: boolean = false;
	usesHtmlPage = true;
	updateHtmlPagesTimeout: NodeJS.Timer | null = null;
	validateTeams: boolean = true;

	// set in onInitialize
	battleFormat!: IFormat;

	declare readonly room: Room;

	validateInputProperties(inputProperties: IGameInputProperties): boolean {
		if (inputProperties.options.format) {
			if (!this.canChangeFormat) {
				this.say("You cannot change the format for " + this.format.nameWithOptions + ".");
				return false;
			}

			const battleFormat = Dex.getFormat(inputProperties.options.format);
			if (!battleFormat || battleFormat.effectType !== 'Format') {
				this.say(CommandParser.getErrorText(['invalidFormat', inputProperties.options.format]));
				return false;
			}

			const ruleTable = Dex.getRuleTable(battleFormat);
			if (!ruleTable.has("teampreview")) {
				this.say("You can only change the format to one that has Team Preview.");
				return false;
			}

			if (battleFormat.gameType !== this.battleFormatType) {
				this.say("You can only change the format to another " + this.battleFormatType + " format.");
				return false;
			}

			const oneVsOne = this.startingTeamsLength === 1 && !this.additionsPerRound;
			const twoVsTwo = this.startingTeamsLength === 2 && !this.additionsPerRound;

			if (ruleTable.minTeamSize > this.startingTeamsLength) {
				this.say("You can only change the format to one that allows bringing only " + this.startingTeamsLength + " Pokemon.");
				return false;
			}

			if (twoVsTwo) {
				if (ruleTable.maxTeamSize < 2) {
					this.say("You can only change the format to one that allows bringing 2 or more Pokemon.");
					return false;
				}
			} else if (!oneVsOne) {
				if (ruleTable.maxTeamSize < 6) {
					this.say("You can only change the format to one that allows bringing 6 or more Pokemon.");
					return false;
				}
			}

			if (oneVsOne) {
				if (ruleTable.pickedTeamSize && ruleTable.pickedTeamSize !== 1) {
					this.say("You can only change the format to one that requires battling with 1 Pokemon.");
					return false;
				}
			} else if (twoVsTwo) {
				if (ruleTable.pickedTeamSize && ruleTable.pickedTeamSize !== 2) {
					this.say("You can only change the format to one that requires battling with 2 Pokemon.");
					return false;
				}
			} else {
				if (ruleTable.pickedTeamSize) {
					this.say("You can only change the format to one that allows battling with a variable number of Pokemon.");
					return false;
				}
			}

			if (battleFormat.team) {
				this.say("You cannot change the format to one that uses generated teams.");
				return false;
			}

			this.battleFormatId = battleFormat.inputTarget;
			try {
				this.setFormat();
				this.generatePokedex();
			} catch (e) {
				this.say("Unable to generate valid Pokemon for the format " + battleFormat.name + ".");
				return false;
			}

			this.format.nameWithOptions += ": " + battleFormat.nameWithoutGen;
		}

		return true;
	}

	setFormat(): void {
		this.battleFormat = Dex.getExistingFormat(this.battleFormatId);
		this.battleFormat.usablePokemon = Dex.getUsablePokemon(this.battleFormat);
		this.hasSpeciesClause = Dex.getRuleTable(this.battleFormat).has('speciesclause');
	}

	afterInitialize(): void {
		this.setFormat();
		this.firstRoundTime = this.activityWarnTimeout + this.activityDQTimeout + this.firstRoundExtraTime;
	}

	getNumberOfRounds(players: number): number {
		return Math.ceil(Math.log(players) / Math.log(2));
	}

	getMinimumPokedexSizeForPlayers(players: number): number {
		if (this.sharedTeams) {
			return this.startingTeamsLength;
		} else if (this.additionsPerRound) {
			const rounds = this.getNumberOfRounds(players);
			if (Math.pow(2, rounds) > players) {
				const maxSecondRoundPlayers = Math.pow(2, rounds - 1) - 1;
				return (players * this.startingTeamsLength) + (maxSecondRoundPlayers * this.additionsPerRound);
			}
		}

		return players * this.startingTeamsLength;
	}

	getMaxPlayers(availablePokemon: number): number {
		let maxPlayers = 0;
		for (const players of POTENTIAL_MAX_PLAYERS) {
			if (this.getMinimumPokedexSizeForPlayers(players - 1) > availablePokemon ||
				this.getMinimumPokedexSizeForPlayers(players) > availablePokemon) {
				break;
			}
			maxPlayers = players;
		}

		return maxPlayers;
	}

	getCustomRules(): string[] {
		const customRules = this.battleFormat.customRules ? this.battleFormat.customRules.slice() : [];
		const allPokemon: string[] = [];
		for (const name of this.pokedex) {
			const pokemon = Dex.getExistingPokemon(name);

			const formes = this.allowsFormes ? Dex.getFormes(pokemon, true) : [];
			const usableFormes: string[] = [];
			for (const forme of formes) {
				if (this.battleFormat.usablePokemon!.includes(forme)) usableFormes.push(forme);
			}

			if (this.evolutionsPerRound) {
				const evolutionLines = Dex.getEvolutionLines(pokemon, usableFormes);
				for (const line of evolutionLines) {
					for (const stage of line) {
						if (this.battleFormat.usablePokemon!.includes(stage) && !allPokemon.includes(stage)) allPokemon.push(stage);
					}
				}
			} else {
				if (!allPokemon.includes(pokemon.name)) allPokemon.push(pokemon.name);

				for (const forme of usableFormes) {
					if (!allPokemon.includes(forme)) allPokemon.push(forme);
				}
			}
		}

		const pokemonListRules = Dex.getCustomRulesForPokemonList(allPokemon);
		for (const rule of pokemonListRules) {
			if (!customRules.includes(rule)) customRules.push(rule);
		}

		return customRules;
	}

	meetsPokemonCriteria(pokemon: IPokemon, type: 'starter' | 'evolution', bannedFormes: readonly string[]): boolean {
		if (pokemon.battleOnly || !this.battleFormat.usablePokemon!.includes(pokemon.name) || this.banlist.includes(pokemon.name) ||
			(this.type && !pokemon.types.includes(this.type)) || bannedFormes.includes(pokemon.name) ||
			(pokemon.forme && bannedFormes.includes(pokemon.baseSpecies)) || (pokemon.forme && !this.allowsFormes)) {
			return false;
		}

		if (type === 'starter') {
			if (this.meetsStarterCriteria && !this.meetsStarterCriteria(pokemon)) {
				return false;
			}
		} else {
			if (this.meetsEvolutionCriteria && !this.meetsEvolutionCriteria(pokemon)) {
				return false;
			}
		}

		return true;
	}

	createPokedex(): string[] {
		const teamPreviewHiddenFormes = Dex.getTeamPreviewHiddenFormes();
		const fullyEvolved = this.fullyEvolved || (this.evolutionsPerRound < 1 && !this.usesCloakedPokemon);
		const checkEvolutions = this.evolutionsPerRound !== 0;
		const deEvolution = this.evolutionsPerRound < 0;

		const pokedex: IPokemon[] = [];

		outer:
		for (const name of Dex.getData().pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(name);
			if (!this.meetsPokemonCriteria(pokemon, 'starter', teamPreviewHiddenFormes)) continue;

			if (this.gen && pokemon.gen !== this.gen) continue;
			if (this.color && pokemon.color !== this.color) continue;

			if (this.requiredTier) {
				if (pokemon.tier !== this.requiredTier) continue;
			} else if (fullyEvolved) {
				if (!pokemon.prevo || pokemon.nfe) continue;
			} else {
				if (pokemon.prevo || !pokemon.nfe) continue;
			}

			if (checkEvolutions) {
				// filter out formes such as battleOnly that don't have a prevo and give an advantage
				if (deEvolution && pokemon.prevo) {
					const formes = Dex.getFormes(pokemon, true);
					for (const forme of formes) {
						if (!Dex.getExistingPokemon(forme).prevo) continue outer;
					}
				}

				const evolutionLines = Dex.getEvolutionLines(pokemon);
				let validEvolutionLines = evolutionLines.length;
				for (const line of evolutionLines) {
					let validLine = true;
					for (const stage of line) {
						const evolution = Dex.getExistingPokemon(stage);
						if (evolution === pokemon) continue;
						if (!this.meetsPokemonCriteria(evolution, 'evolution', teamPreviewHiddenFormes)) {
							validEvolutionLines--;
							validLine = false;
							break;
						}
					}

					if (validLine) break;
				}

				if (!validEvolutionLines) continue;
			}

			pokedex.push(pokemon);
		}

		return pokedex.filter(x => !(x.forme && pokedex.includes(Dex.getExistingPokemon(x.baseSpecies)))).map(x => x.name);
	}

	generateBracket(players?: Player[]): void {
		let tree: IEliminationTree<Player> | null = null;

		if (!players) players = this.shufflePlayers();
		for (const player of players) {
			if (!tree) {
				tree = {
					root: new EliminationNode<Player>({user: player}),
					currentLayerLeafNodes: [],
					nextLayerLeafNodes: [],
				};
				tree.currentLayerLeafNodes!.push(tree.root);
				continue;
			}

			const targetNode = tree.currentLayerLeafNodes!.shift()!;
			const newLeftChild = new EliminationNode<Player>({user: targetNode.user});
			tree.nextLayerLeafNodes!.push(newLeftChild);

			const newRightChild = new EliminationNode<Player>({user: player});
			tree.nextLayerLeafNodes!.push(newRightChild);
			targetNode.setChildren([newLeftChild, newRightChild]);

			targetNode.user = null;

			if (tree.currentLayerLeafNodes!.length === 0) {
				tree.currentLayerLeafNodes = tree.nextLayerLeafNodes;
				tree.nextLayerLeafNodes = [];
			}
		}

		this.treeRoot = tree!.root;
	}

	afterGenerateBracket(): void {
		this.treeRoot!.traverse(node => {
			if (node.children && node.children[0].user && node.children[1].user) {
				node.state = 'available';
			}
		});

		this.totalRounds = this.getNumberOfRounds(this.playerCount);

		const matchesByRound = this.getMatchesByRound();
		const matchRounds = Object.keys(matchesByRound).sort();
		for (let i = 1; i < matchRounds.length; i++) {
			const round = matchRounds[i];
			for (const match of matchesByRound[round]) {
				for (const child of match.children!) {
					if (child.user) this.firstRoundByes.add(child.user);
				}
			}
		}

		this.firstRoundByes.forEach(player => {
			player.round!++;
			if (this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound) {
				const dropsThisRound = Math.min(this.dropsPerRound, this.startingTeamsLength - (this.additionsPerRound ? 0 : 1));
				const additionsThisRound = Math.min(this.additionsPerRound, 6 - (this.startingTeamsLength - dropsThisRound));

				const pokemon: string[] = [];
				for (let i = 0; i < additionsThisRound; i++) {
					const mon = this.pokedex.shift();
					if (!mon) throw new Error("Not enough Pokemon for first round bye (" + player.name + ")");
					pokemon.push(mon);
				}

				const teamChange: ITeamChange = {
					additions: additionsThisRound,
					choices: pokemon,
					drops: dropsThisRound,
					evolutions: this.evolutionsPerRound,
				};
				this.teamChanges.set(player, (this.teamChanges.get(player) || []).concat([teamChange]));

				this.firstRoundByeAdditions.set(player, pokemon);
				this.updatePossibleTeams(player, pokemon);

				if (!player.eliminated) {
					player.say("You were given a first round bye so check the tournament page for additional team changes!");
					if (this.subRoom) this.updatePlayerHtmlPage(player);
				}
			}
		});

		this.updateMatches(true);
	}

	updateBracketHtml(): void {
		const matchesByRound = this.getMatchesByRound();
		const matchRounds = Object.keys(matchesByRound).sort();

		const tableWidth = this.totalRounds * 180;
		let html = '<table style="border-collapse: collapse;border: none;table-layout: fixed;width: ' + tableWidth + 'px">';

		html += '<tr style="height: 32px">';
		for (let i = 1; i <= this.totalRounds - 2; i++) {
			html += '<th style="text-align:center;">Round ' + i + '</th>';
		}
		html += '<th style="text-align:center;">Semifinals</th>';
		html += '<th style="text-align:center;">Finals</th>';
		html += '</tr>';

		const placeholderName = "(undecided)";
		const playerNamesByRound: Dict<string[]> = {};
		const winnersByRound: Dict<string[]> = {};
		for (let i = 0; i < matchRounds.length; i++) {
			const round = matchRounds[i];
			playerNamesByRound[round] = [];
			winnersByRound[round] = [];
			for (const match of matchesByRound[round]) {
				if (!match.children) continue;
				let playerA = placeholderName;
				let playerB = placeholderName;
				if (match.children[0].user) playerA = match.children[0].user.name;
				if (match.children[1].user) playerB = match.children[1].user.name;

				if (match.user) winnersByRound[round].push(match.user.name);

				playerNamesByRound[round].push(playerA);

				for (let j = 0; j < (Math.pow(2, i) - 1); j++) {
					playerNamesByRound[round].push("");
				}

				playerNamesByRound[round].push(playerB);

				for (let j = 0; j < (Math.pow(2, i) - 1); j++) {
					playerNamesByRound[round].push("");
				}
			}
		}

		const eliminatedPlayers: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) eliminatedPlayers.push(this.players[i].name);
		}

		const fullFirstRoundPlayers = Math.pow(2, this.totalRounds);
		for (let i = 0; i < fullFirstRoundPlayers; i++) {
			html += '<tr style="height: 32px">';

			for (let j = 0; j < matchRounds.length; j++) {
				const round = matchRounds[j];
				if (!playerNamesByRound[round].length) {
					if (j === 0) {
						html += "<td>&nbsp;</td>";
					}
					continue;
				}

				if (playerNamesByRound[round][0]) {
					html += '<td' + (j > 0 ? ' rowspan="' + Math.pow(2, j) + '"' : '') + ' style="margin: 0;padding: 5px;">' +
						'<p style="border-bottom: solid 1px;margin: 0;padding: 1px;">';
					const playerName = playerNamesByRound[round][0];
					if (playerName === placeholderName) {
						html += playerName;
					} else {
						const winner = winnersByRound[round].includes(playerName);
						if (winner) html += '<i>';
						html += '<strong class="username">';
						if (eliminatedPlayers.includes(playerName)) {
							html += '<span style="color: #999999">' + playerName + '</span>';
						} else {
							html += '<username>' + playerName + '</username>';
						}
						html += '</strong>';
						if (winner) html += '</i>';
					}
					html += '</p></td>';
				}

				playerNamesByRound[round].shift();
			}

			html += '</tr>';
		}

		html += '</table>';

		this.bracketHtml = html;
	}

	getMatchesByRound(): Dict<EliminationNode<Player>[]> {
		if (!this.treeRoot) throw new Error("getMatchesByRound() called before bracket generated");

		const matchesByRound: Dict<EliminationNode<Player>[]> = {};
		for (let i = 1; i <= this.totalRounds; i++) {
			matchesByRound[i] = [];
		}

		const queue: {node: EliminationNode<Player>, round: number}[] = [{node: this.treeRoot, round: this.totalRounds}];
		let item;
		while (queue.length) {
			item = queue.shift();
			if (!item || !item.node.children) continue;

			matchesByRound[item.round].push(item.node);

			queue.push({node: item.node.children[0], round: item.round - 1});
			queue.push({node: item.node.children[1], round: item.round - 1});
		}

		return matchesByRound;
	}

	getDisqualifyReasonText(reason: string): string {
		return "You have been disqualified from the " + this.name + " tournament " + reason + ".";
	}

	disqualifyPlayers(playersAndReasons: Map<Player, string>): void {
		if (!this.treeRoot) throw new Error("disqualifyPlayers() called before bracket generated");

		const players = Array.from(playersAndReasons.keys());
		const winners: Player[] = [];
		for (const player of players) {
			player.eliminated = true;
			this.disqualifiedPlayers.set(player, playersAndReasons.get(player)!);
			this.playerOpponents.delete(player);

			const battleRoom = this.playerBattleRooms.get(player);
			if (battleRoom) battleRoom.leave();

			if (this.subRoom && !this.tournamentDisqualifiedPlayers.includes(player)) {
				this.tournamentDisqualifiedPlayers.push(player);
				this.subRoom.disqualifyFromTournament(player.name);
			}

			/**
			 * The user either has a single available battle or no available battles
			 */
			const found: {match: [Player, Player], result: 'win' | 'loss', score: [number, number]} | undefined = this.treeRoot.
				find(node => {
				if (node.state === 'available') {
					if (!node.children) {
						throw new Error("Match node state is not available in disqualifyPlayers(" +
							players.map(x => x.name).join(", ") + ")");
					}
					if (node.children[0].user === player) {
						return {
							match: [player, node.children[1].user!],
							result: 'loss',
							score: [0, 1],
						};
					} else if (node.children[1].user === player) {
						return {
							match: [node.children[0].user!, player],
							result: 'win',
							score: [1, 0],
						};
					}
				}
				return undefined;
			});

			if (found) {
				let winner: Player;
				if (found.match[0] === player) {
					winner = found.match[1];
				} else {
					winner = found.match[0];
				}

				this.disqualifiedOpponents.set(winner, player);

				const teamChanges = this.setMatchResult(found.match, found.result, found.score);
				if (this.ended) break;

				if (!players.includes(winner)) {
					this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));

					if (!winners.includes(winner)) winners.push(winner);
				}
			}
		}

		if (!this.ended) {
			if (this.subRoom) {
				for (const winner of winners) {
					this.updatePlayerHtmlPage(winner);
				}

				for (const player of players) {
					this.updatePlayerHtmlPage(player);
				}
			}

			this.updateMatches();
		}
	}

	eliminateInactivePlayers(player: Player, opponent: Player, inactivePlayers: Player[]): void {
		const node = this.findAvailableMatchNode(player, opponent);
		if (node) this.clearNodeTimers(node);

		const playerReason = this.getDisqualifyReasonText("for failing to battle " + opponent.name + " in time");
		const opponentReason = this.getDisqualifyReasonText("for failing to battle " + player.name + " in time");

		const playersAndReasons = new Map<Player, string>();
		if (inactivePlayers.includes(player)) {
			player.say(playerReason);
			playersAndReasons.set(player, playerReason);
		}

		if (inactivePlayers.includes(opponent)) {
			opponent.say(opponentReason);
			playersAndReasons.set(opponent, opponentReason);
		}

		this.disqualifyPlayers(playersAndReasons);
	}

	getAvailableMatchNodes(): EliminationNode<Player>[] {
		if (!this.treeRoot) throw new Error("getAvailableMatchNodes() called before bracket generated");

		const nodes: EliminationNode<Player>[] = [];
		this.treeRoot.traverse(node => {
			if (node.state === 'available' && node.children![0].user && node.children![1].user) {
				nodes.push(node);
			}
		});

		return nodes;
	}

	setMatchResult(players: [Player, Player], result: 'win' | 'loss', score: [number, number], loserTeam?: string[]): ITeamChange[] {
		if (!this.treeRoot) {
			throw new Error("setMatchResult() called before bracket generated ([" + players.map(x => x.name).join(', ') + "], " +
				result + ")");
		}

		const p1 = players[0];
		const p2 = players[1];

		const targetNode = this.treeRoot.find(node => {
			if (node.state === 'available' && node.children![0].user === p1 && node.children![1].user === p2) {
				return node;
			}
			return undefined;
		});

		if (!targetNode) {
			throw new Error("Match node not found in setMatchResult([" + players.map(x => x.name).join(', ') + "], " + result + ")");
		}
		if (!targetNode.children) {
			throw new Error("Match node state is not available in setMatchResult([" + players.map(x => x.name).join(', ') + "], " +
				result + ")");
		}

		this.clearNodeTimers(targetNode);

		this.playerOpponents.delete(p1);
		this.playerOpponents.delete(p2);

		this.playerBattleRooms.delete(p1);
		this.playerBattleRooms.delete(p2);

		targetNode.state = 'finished';
		targetNode.result = result;
		targetNode.score = score.slice();

		const winner = targetNode.children[result === 'win' ? 0 : 1].user!;
		const loser = targetNode.children[result === 'loss' ? 0 : 1].user!;
		targetNode.user = winner;

		loser.eliminated = true;

		let winnerTeamChanges: ITeamChange[] = [];
		if (this.getRemainingPlayerCount() > 1 && (this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound)) {
			let currentTeamLength: number;
			const roundTeamLengthChange = this.additionsPerRound + this.dropsPerRound;
			const addingPokemon = roundTeamLengthChange > 0;
			const droppingPokemon = roundTeamLengthChange < 0;
			const previousRounds = winner.round! - 1;
			if (addingPokemon) {
				currentTeamLength = Math.min(6, this.startingTeamsLength + (previousRounds * roundTeamLengthChange));
			} else if (droppingPokemon) {
				currentTeamLength = Math.max(1, this.startingTeamsLength - (previousRounds * roundTeamLengthChange));
			} else {
				currentTeamLength = this.startingTeamsLength;
			}

			const dropsThisRound = Math.min(this.dropsPerRound, currentTeamLength - (this.additionsPerRound ? 0 : 1));
			const additionsThisRound = Math.min(this.additionsPerRound, 6 - (currentTeamLength - dropsThisRound));

			if (additionsThisRound || dropsThisRound || this.evolutionsPerRound) {
				if (!loserTeam) {
					loserTeam = this.getRandomTeam(loser);
				} else {
					if ((addingPokemon || droppingPokemon) && loserTeam.length < currentTeamLength) {
						loserTeam = this.getRandomTeamIncluding(loser, loserTeam);
					}
				}

				winnerTeamChanges.push({
					additions: additionsThisRound,
					choices: loserTeam,
					drops: dropsThisRound,
					evolutions: this.evolutionsPerRound,
				});

				this.updatePossibleTeams(winner, loserTeam);
			}
		}

		winner.round!++;

		if (targetNode.parent) {
			const userA = targetNode.parent.children![0].user;
			const userB = targetNode.parent.children![1].user;
			if (userA && userB) {
				targetNode.parent.state = 'available';

				if (userA.eliminated) {
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult([userA, userB], 'loss', [0, 1]));
				} else if (userB.eliminated) {
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult([userA, userB], 'win', [1, 0]));
				}
			}
		}

		if (!this.ended && this.getRemainingPlayerCount() < 2) {
			this.eliminationEnded = true;
			this.end();
		}

		return winnerTeamChanges;
	}

	updateMatches(onStart?: boolean): void {
		const nodes = this.getAvailableMatchNodes();
		for (const node of nodes) {
			if (this.availableMatchNodes.includes(node)) continue;
			this.availableMatchNodes.push(node);

			const player = node.children![0].user!;
			const opponent = node.children![1].user!;

			this.playerOpponents.set(player, opponent);
			this.playerOpponents.set(opponent, player);

			if (!onStart) {
				const notificationTitle = "New " + this.name + " opponent!";
				if (!player.eliminated) player.sendHighlight(notificationTitle);
				if (!opponent.eliminated) opponent.sendHighlight(notificationTitle);
			}

			if (this.subRoom) {
				if (!player.eliminated) this.updatePlayerHtmlPage(player);
				if (!opponent.eliminated) this.updatePlayerHtmlPage(opponent);
			} else {
				let activityWarning = this.activityWarnTimeout;
				if (!this.givenFirstRoundExtraTime.has(player) && !this.givenFirstRoundExtraTime.has(opponent)) {
					if (this.firstRoundExtraTime) activityWarning += this.firstRoundExtraTime;
				}
				this.givenFirstRoundExtraTime.add(player);
				this.givenFirstRoundExtraTime.add(opponent);
				const warningTimeout = setTimeout(() => {
					const reminderPM = "You still need to battle your new opponent for the " + this.name + " tournament in " +
						this.room.title + "! Please send me the link to the battle or leave your pending challenge up. Make sure " +
						"you have challenged in the **" + this.battleFormat.name + "** format!";

					player.say(reminderPM);
					opponent.say(reminderPM);

					const dqTimeout = setTimeout(() => {
						const inactivePlayers = this.checkInactivePlayers(player, opponent);
						if (inactivePlayers.length) {
							this.eliminateInactivePlayers(player, opponent, inactivePlayers);
						} else {
							this.checkChallenges(node, player, opponent);
						}
					}, this.activityDQTimeout + UPDATE_HTML_PAGE_DELAY);
					this.activityTimers.set(node, dqTimeout);
				}, activityWarning + UPDATE_HTML_PAGE_DELAY);
				this.activityTimers.set(node, warningTimeout);
			}
		}

		for (const i in this.players) {
			const player = this.players[i];
			if (!player.eliminated && this.disqualifiedOpponents.has(player)) {
				if (!this.playerOpponents.has(player)) {
					player.say("Your previous opponent " + this.disqualifiedOpponents.get(player)!.name + " was disqualified! Check " +
						"the tournament page for possible team changes.");
				}

				this.disqualifiedOpponents.delete(player);
			}
		}

		if (!this.subRoom) {
			const oldBracketHtml = this.bracketHtml;
			this.updateBracketHtml();
			if (this.bracketHtml !== oldBracketHtml) {
				this.updateHtmlPages();
			}
		}
	}

	getPokemonIcons(pokemon: readonly string[]): string[] {
		return pokemon.map(x => Dex.getPokemonIcon(Dex.getExistingPokemon(x)) + x);
	}

	getRulesHtml(): string {
		let html = "<h3><u>Rules</u></h3><ul>";
		html += "<li>Battles must be played in <b>" + this.battleFormat.name + "</b> (all Pokemon, moves, abilities, and items " +
			"not banned can be used).</li>";
		html += "<li>You can change Pokemon between formes and regional variants at any time.</li>";
		if (!this.allowsScouting && !this.subRoom) html += "<li>Do not join other tournament battles!</li>";
		if (!this.usesCloakedPokemon && !this.sharedTeams) {
			html += "<li>Do not reveal your or your opponents' " + (this.startingTeamsLength === 1 ? "starters" : "teams") + " in " +
				"the chat!</li>";
		}
		html += "</ul>";

		return html;
	}

	getBracketHtml(): string {
		return "<h3><u>" + (this.eliminationEnded ? "Final bracket" : "Bracket") + "</u></h3>" +
			(this.bracketHtml || "The bracket will be created once the tournament starts.");
	}

	getPlayerHtmlPage(player: Player, staffView?: boolean): string {
		let html = "";

		if (staffView) html += "<b>" + player.name + "'s view of the tournament:</b><br /><br />";

		if (this.eliminationEnded) {
			if (player === this.getFinalPlayer()) {
				html += "<h3>Congratulations! You won the tournament.</h3>";
			} else {
				html += "<h3>The tournament has ended!</h3>";
			}
			html += "<br />";
		} else {
			html += this.getRulesHtml();
		}

		if (this.started && !this.eliminationEnded) {
			if (player.eliminated) {
				html += "<h3><u>Updates</u></h3>";

				if (this.disqualifiedPlayers.has(player)) {
					html += this.disqualifiedPlayers.get(player) + "<br /><br />";
				} else {
					html += "You were eliminated! ";
				}

				if (this.spectatorPlayers.has(player)) {
					html += "You are currently still receiving updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
				} else {
					html += "You will no longer receive updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
				}
			} else {
				html += "<h3><u>Opponent</u></h3>";
				const opponent = this.playerOpponents.get(player);
				if (opponent) {
					html += "Your round " + player.round + " opponent is <strong class='username'><username>" + opponent.name +
						"</username></strong>!<br /><br />";
					if (!this.subRoom) {
						html += "To challenge them, click their username, click \"Challenge\", select " +
							this.battleFormat.name + " as the format, and select the team you built for this tournament. Once the " +
							"battle starts, send <strong class='username'><username>" + Users.self.name + "</username></strong> the " +
							"link or type <code>/invite " + Users.self.name + "</code> into the battle chat!<br /><br />";
					}
					html += "If " + opponent.name + " is offline or not accepting your challenge, you will be " +
						"advanced automatically after some time!";
				} else {
					html += "Your next opponent has not been decided yet!";
				}
			}
			html += "<br />";
		}

		html += "<h3><u>Your Team</u></h3>";
		const pastTense = this.eliminationEnded || player.eliminated;
		const starterPokemon = this.starterPokemon.get(player);
		if (starterPokemon) {
			if (this.usesCloakedPokemon) {
				html += "<b>The Pokemon to protect in battle ";
				if (pastTense) {
					html += starterPokemon.length === 1 ? "was" : "were";
				} else {
					html += starterPokemon.length === 1 ? "is" : "are";
				}
				html += "</b>:<br />" + this.getPokemonIcons(starterPokemon).join("");
				if (!this.eliminationEnded && starterPokemon.length < 6) {
					html += "<br />You may add any Pokemon to fill your team as long as they are usable in " + this.battleFormat.name + ".";
				}
			} else {
				html += (this.sharedTeams ? "The" : "Your") + " " +
					(this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound ? "starting " : "") +
					(this.startingTeamsLength === 1 ? "Pokemon" : "team") + " " + (pastTense ? "was" : "is") + ":";
				html += "<br />" + this.getPokemonIcons(starterPokemon).join("");
				if (this.canReroll && !this.rerolls.has(player)) {
					html += "<br /><br />If you are not satisfied, you have 1 chance to reroll but you must keep whatever you receive! " +
						Client.getPmSelfButton(Config.commandCharacter + "reroll", "Reroll Pokemon");
				}
			}
		}

		const teamChanges = this.teamChanges.get(player);
		if (teamChanges) {
			const rounds: string[] = [];
			for (let i = 0; i < teamChanges.length; i++) {
				const teamChange = teamChanges[i];
				let roundChanges = '';
				if (teamChange.drops) {
					roundChanges += "<li>" + (pastTense ? "Removed" : "Remove") + " " + teamChange.drops + " " +
						"member" + (teamChange.drops > 1 ? "s" : "") + " from your team</li>";
				}

				if (teamChange.additions) {
					roundChanges += "<li>";
					const addAll = teamChange.choices.length <= teamChange.additions;
					if (addAll) {
						roundChanges += (pastTense ? "Added" : "Add") + " the following to your team:";
					} else {
						roundChanges += (pastTense ? "Chose" : "Choose") + " " + teamChange.additions + " of the following " +
							"to add to your team:";
					}
					roundChanges += "<br />" + Tools.joinList(this.getPokemonIcons(teamChange.choices), undefined, undefined,
						addAll ? "and" : "or") + "</li>";
				}

				if (teamChange.evolutions) {
					const amount = Math.abs(teamChange.evolutions);
					roundChanges += "<li>" + (pastTense ? "Chose" : "Choose") + " " + amount + " " +
						"member" + (amount > 1 ? "s" : "") + " of your " + (teamChange.additions || teamChange.drops ? "updated " : "") +
						"team to " + (teamChange.evolutions >= 1 ? "evolve" : "de-volve") + "</li>";
				}

				if (roundChanges) {
					rounds.push("Round " + (i + 1) + " result:<ul>" + roundChanges + "</ul>");
				}
			}

			if (rounds.length) {
				html += "<br /><br />";
				if (!player.eliminated && !this.eliminationEnded && player.round === 2 && this.firstRoundByes.has(player)) {
					html += "<b>NOTE</b>: you were given a first round bye so you must follow the team changes below for your first " +
						"battle!<br /><br />";
				}
				html += rounds.join("");

				if (!this.eliminationEnded) {
					html += "<br /><b>Example valid team</b>:<br />" + Tools.joinList(this.getPokemonIcons(this.getRandomTeam(player)));
				}
			}
		}

		if (!this.subRoom) html += "<br />" + this.getBracketHtml();

		return html;
	}

	updatePlayerHtmlPage(player: Player): void {
		player.sendHtmlPage(this.getPlayerHtmlPage(player));
	}

	getSpectatorHtmlPage(user: User): string {
		let html = "";

		if (this.eliminationEnded) {
			html += "<h3>The tournament has ended!</h3><hr />";
		} else {
			html += this.getRulesHtml();
		}

		if (this.started && !this.eliminationEnded) {
			html += "<h3><u>Updates</u></h3>";
			if (this.spectatorUsers.has(user.id)) {
				html += "You are currently receiving updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
			} else {
				html += "You will no longer receive updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
			}
			html += "<br />";
		}

		html += this.getBracketHtml();

		return html;
	}

	updateSpectatorHtmlPage(user: User): void {
		this.room.sendHtmlPage(user, this.baseHtmlPageId, this.getHtmlPageWithHeader(this.getSpectatorHtmlPage(user)));
	}

	updateHtmlPages(): void {
		if (this.updateHtmlPagesTimeout) clearTimeout(this.updateHtmlPagesTimeout);

		this.updateHtmlPagesTimeout = setTimeout(() => {
			for (const i in this.players) {
				if (this.players[i].eliminated && !this.spectatorPlayers.has(this.players[i])) continue;
				this.updatePlayerHtmlPage(this.players[i]);
			}

			const users = Array.from(this.spectatorUsers.keys());
			for (const id of users) {
				if (id in this.players) continue;
				const user = Users.get(id);
				if (user) this.updateSpectatorHtmlPage(user);
			}
		}, UPDATE_HTML_PAGE_DELAY);
	}

	checkInactivePlayers(player: Player, opponent: Player): Player[] {
		const room = this.subRoom || this.room;
		const inactivePlayers: Player[] = [];

		const userA = Users.get(player.name);
		if (!userA || !userA.rooms.has(room)) inactivePlayers.push(player);
		const userB = Users.get(opponent.name);
		if (!userB || !userB.rooms.has(room)) inactivePlayers.push(opponent);

		return inactivePlayers;
	}

	getCheckChallengesPlayerHtml(player: Player, opponent: Player): string {
		return '<div class="infobox">' + player.name + ' is challenging ' + opponent.name + ' in ' + this.battleFormat.name + '.</div>';
	}

	getCheckChallengesOpponentHtml(player: Player, opponent: Player): string {
		return '<div class="infobox">' + opponent.name + ' is challenging ' + player.name + ' in ' + this.battleFormat.name + '.</div>';
	}

	getCheckChallengesNeitherHtml(player: Player, opponent: Player): [string, string] {
		return [
			'<div class="infobox">' + player.name + ' and ' + opponent.name + ' are not challenging each other.</div>',
			'<div class="infobox">' + opponent.name + ' and ' + player.name + ' are not challenging each other.</div>',
		];
	}

	setCheckChallengesInactiveTimeout(node: EliminationNode<Player>, player: Player, opponent: Player, inactive: Player[]): void {
		const timeout = setTimeout(() => this.eliminateInactivePlayers(player, opponent, inactive), CHECK_CHALLENGES_INACTIVE_DELAY);
		this.checkChallengesInactiveTimers.set(node, timeout);
	}

	setCheckChallengesListeners(node: EliminationNode<Player>, player: Player, opponent: Player): void {
		this.onHtml(this.getCheckChallengesPlayerHtml(player, opponent), () => {
			this.removeCheckChallengesListeners(player, opponent);
			this.setCheckChallengesInactiveTimeout(node, player, opponent, [opponent]);
		}, true);

		this.onHtml(this.getCheckChallengesOpponentHtml(player, opponent), () => {
			this.removeCheckChallengesListeners(player, opponent);
			this.setCheckChallengesInactiveTimeout(node, player, opponent, [player]);
		}, true);

		const neitherHtml = this.getCheckChallengesNeitherHtml(player, opponent);
		for (const html of neitherHtml) {
			this.onHtml(html, () => {
				this.removeCheckChallengesListeners(player, opponent);
				this.setCheckChallengesInactiveTimeout(node, player, opponent, [player, opponent]);
			}, true);
		}
	}

	removeCheckChallengesListeners(player: Player, opponent: Player): void {
		this.offHtml(this.getCheckChallengesPlayerHtml(player, opponent), true);
		this.offHtml(this.getCheckChallengesOpponentHtml(player, opponent), true);
		const neitherHtml = this.getCheckChallengesNeitherHtml(player, opponent);
		for (const html of neitherHtml) {
			this.offHtml(html, true);
		}
	}

	checkChallenges(node: EliminationNode<Player>, player: Player, opponent: Player): void {
		this.setCheckChallengesListeners(node, player, opponent);

		const text = "!checkchallenges " + player.name + ", " + opponent.name;
		this.on(text, () => {
			// backup timer in case a player is challenging in the wrong format
			const timeout = setTimeout(() => {
				this.removeCheckChallengesListeners(player, opponent);
				this.eliminateInactivePlayers(player, opponent, [player, opponent]);
			}, CHECK_CHALLENGES_INACTIVE_DELAY * 2);

			this.checkChallengesTimers.set(node, timeout);
		});

		this.say(text, {
			filterSend: () => {
				const inactivePlayers = this.checkInactivePlayers(player, opponent);
				if (inactivePlayers.length) {
					this.eliminateInactivePlayers(player, opponent, inactivePlayers);
					return false;
				} else {
					return true;
				}
			},
		});
	}

	getStartingTeam(): readonly string[] {
		const team: string[] = [];
		for (let i = 0; i < this.startingTeamsLength; i++) {
			const pokemon = this.pokedex.shift();
			if (!pokemon) break;
			team.push(pokemon);
		}
		return team;
	}

	giveStartingTeam(player: Player): void {
		const team = this.getStartingTeam().filter(x => !!x);
		if (team.length < this.startingTeamsLength) throw new Error("Out of Pokemon to give (" + player.name + ")");

		const formeCombinations = Dex.getFormeCombinations(team, this.battleFormat.usablePokemon);

		if (this.usesCloakedPokemon) {
			this.playerRequiredPokemon.set(player, formeCombinations);
		} else {
			this.possibleTeams.set(player, formeCombinations);

			if (this.firstRoundByeAdditions.has(player)) {
				this.updatePossibleTeams(player, this.firstRoundByeAdditions.get(player)!);
			}
		}

		this.starterPokemon.set(player, team);

		this.updatePlayerHtmlPage(player);
	}

	getPossibleTeamsOptions(): IGetPossibleTeamsOptions {
		return {
			allowFormes: this.allowsFormes,
			additions: this.additionsPerRound,
			drops: this.dropsPerRound,
			evolutions: this.evolutionsPerRound,
			requiredAddition: this.requiredAddition,
			requiredDrop: this.requiredDrop,
			requiredEvolution: this.requiredEvolution,
			speciesClause: this.hasSpeciesClause,
			usablePokemon: this.battleFormat.usablePokemon,
		};
	}

	updatePossibleTeams(player: Player, additions: string[]): void {
		this.possibleTeams.set(player, Dex.getPossibleTeams(this.possibleTeams.get(player)!, additions, this.getPossibleTeamsOptions()));
	}

	getSignupsHtml(): string {
		let html = "<div class='infobox'><b>" + Users.self.name + " is hosting a " + this.name + " tournament!</b>";
		if (this.htmlPageGameDescription) html += "<br />" + this.htmlPageGameDescription;
		html += "<br /><br />";
		if (this.started) {
			html += "(the tournament has started)";
		} else if (this.subRoom) {
			html += Client.getCommandButton("/join " + this.subRoom.id, "-> Go to the " +
				(this.subRoom.groupchat ? "groupchat" : "subroom") + " (" + (this.playerCap - this.playerCount) + "/" + this.playerCap +
				" slots remaining)");
		} else {
			html += Client.getPmSelfButton(Config.commandCharacter + "joingame " + this.room.title, "Join tournament") +
				Client.getPmSelfButton(Config.commandCharacter + "leavegame " + this.room.title, "Leave tournament") +
				" (" + (this.playerCap - this.playerCount) + "/" + this.playerCap + " slots remaining)";
		}
		html += "</div>";
		return html;
	}

	postSignups(): void {
		this.sayUhtmlAuto(this.uhtmlBaseName + '-signups', this.getSignupsHtml());
		if (this.subRoom) {
			this.subRoom.sayUhtml(this.uhtmlBaseName + "-join-tournament", "<b>You must join the tournament in this room to play! Click " +
				"at the top of the chat or below</b><br /><br />" + Client.getCommandButton("/tour join", "Join tournament"));
		}
	}

	generatePokedex(): void {
		const minimumPlayers = POTENTIAL_MAX_PLAYERS[0];
		const minimumPokemon = Math.max(this.getMinimumPokedexSizeForPlayers(minimumPlayers - 1),
			this.getMinimumPokedexSizeForPlayers(minimumPlayers));

		let pokedex: string[];
		if (this.monoColor) {
			const colors = Dex.getData().colors;
			const colorKeys = this.shuffle(Object.keys(colors));
			this.color = colors[colorKeys[0]];
			colorKeys.shift();
			pokedex = this.createPokedex();
			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!colorKeys.length) throw new Error("No color has at least " + minimumPokemon + " Pokemon");
				this.color = colors[colorKeys[0]];
				colorKeys.shift();
				pokedex = this.createPokedex();
			}
			this.htmlPageGameName = "Mono-" + this.color + " " + this.baseHtmlPageGameName;
		} else if (this.monoType) {
			const types = this.shuffle(Dex.getData().typeKeys);
			this.type = Dex.getExistingType(types[0]).name;
			types.shift();
			pokedex = this.createPokedex();
			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!types.length) throw new Error("No type has at least " + minimumPokemon + " Pokemon");
				this.type = Dex.getExistingType(types[0]).name;
				types.shift();
				pokedex = this.createPokedex();
			}
			this.htmlPageGameName = "Mono-" + this.type + " " + this.baseHtmlPageGameName;
		} else if (this.monoRegion) {
			const currentGen = Dex.getGen();
			let gens: number[] = [];
			for (let i = 1; i <= currentGen; i++) {
				gens.push(i);
			}
			gens = this.shuffle(gens);

			this.gen = gens[0];
			gens.shift();
			pokedex = this.createPokedex();
			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!gens.length) throw new Error("No gen has at least " + minimumPokemon + " Pokemon");
				this.gen = gens[0];
				gens.shift();
				pokedex = this.createPokedex();
			}

			let region;
			if (this.gen === 1) {
				region = 'Kanto';
			} else if (this.gen === 2) {
				region = 'Johto';
			} else if (this.gen === 3) {
				region = 'Hoenn';
			} else if (this.gen === 4) {
				region = 'Sinnoh';
			} else if (this.gen === 5) {
				region = 'Unova';
			} else if (this.gen === 6) {
				region = 'Kalos';
			} else if (this.gen === 7) {
				region = 'Alola';
			} else if (this.gen === 8) {
				region = 'Galar';
			}

			this.htmlPageGameName = "Mono-" + region + " " + this.baseHtmlPageGameName;
		} else {
			pokedex = this.createPokedex();
			if (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				throw new Error(this.battleFormat.name + " does not have at least " + minimumPokemon + " Pokemon");
			}
			this.htmlPageGameName = this.format.nameWithOptions || this.format.name;
		}

		this.pokedex = this.shuffle(pokedex);

		// limit pokedex size for custom rules
		const maxPokemon = Math.max(this.getMinimumPokedexSizeForPlayers(this.maxPlayers - 1),
			this.getMinimumPokedexSizeForPlayers(this.maxPlayers));
		if (this.pokedex.length > maxPokemon) this.pokedex = this.pokedex.slice(0, maxPokemon);
	}

	onSignups(): void {
		this.generatePokedex();
		this.htmlPageHeader = "<h2>" + this.room.title + "'s " + this.htmlPageGameName + "</h2><hr />";

		const maxPlayers = this.getMaxPlayers(this.pokedex.length);
		if (maxPlayers < this.maxPlayers) this.maxPlayers = maxPlayers;

		this.playerCap = this.maxPlayers;

		this.startAdvertisements();
		this.room.notifyRank("all", this.room.title + " " + Users.self.name + " tournament", this.name,
			Users.self.name + " is hosting a tournament");
	}

	startAdvertisements(): void {
		this.postSignups();
		const intervalTime = 60 * 1000;
		const halfAdvertisementTime = ADVERTISEMENT_TIME / 2;
		this.advertisementInterval = setInterval(() => {
			this.totalAdvertisementTime += intervalTime;
			if (this.totalAdvertisementTime === halfAdvertisementTime) {
				let closestCap = 0;
				for (const players of POTENTIAL_MAX_PLAYERS) {
					if (this.playerCount <= players) {
						closestCap = players;
						break;
					}
				}

				if (this.playerCount >= closestCap) {
					return this.endAdvertisements();
				} else {
					this.playerCap = closestCap;
					if (this.subRoom) this.subRoom.setTournamentCap(closestCap);
				}
			} else if (this.totalAdvertisementTime >= ADVERTISEMENT_TIME) {
				return this.endAdvertisements();
			}

			this.postSignups();
		}, intervalTime);
	}

	endAdvertisements(): void {
		if (this.advertisementInterval) clearInterval(this.advertisementInterval);
		if (this.playerCount < this.minPlayers) {
			this.sayUhtmlAuto(this.uhtmlBaseName + '-signups', "<b>The " + this.name + " tournament is cancelled due to a lack of players" +
				"</b>");
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				this.players[i].sendHtmlPage("<h3>The tournament was cancelled due to a lack of players!</h3>");
			}
			this.deallocate(true);
			return;
		}

		if (!this.started) {
			if (this.subRoom) {
				this.subRoom.startTournament();
			} else {
				this.start();
			}
		}
	}

	onStart(): void {
		if (this.advertisementInterval) clearInterval(this.advertisementInterval);

		this.canRejoin = false; // disable rejoins to prevent remainingPlayers from being wrong

		const uhtmlName = this.uhtmlBaseName + '-signups';
		const html = this.getSignupsHtml();
		this.onUhtml(uhtmlName, html, () => {
			if (this.canReroll) {
				let text = "";
				if (!this.subRoom) {
					text += "The " + this.name + " tournament is about to start! ";
				}
				text += "There are " + Tools.toDurationString(REROLL_START_DELAY) + " left to PM me the command ``" +
					Config.commandCharacter + REROLL_COMMAND + "`` to get a new " +
					(this.startingTeamsLength === 1 ? "starter" : "team") + " (cannot be undone).";

				if (this.subRoom) {
					this.subRoom.say(text);
				} else {
					this.say(text);
				}

				if (this.subRoom) {
					this.startElimination();

					this.timeout = setTimeout(() => {
						this.canReroll = false;
					}, REROLL_START_DELAY);
				} else {
					this.timeout = setTimeout(() => this.startElimination(), REROLL_START_DELAY);
				}
			} else {
				this.startElimination();
			}
		});

		this.sayUhtmlChange(uhtmlName, html);
	}

	startElimination(): void {
		this.eliminationStarted = true;

		let html = Users.self.name + "'s " + this.name + " tournament has started! You have " +
			Tools.toDurationString(this.firstRoundTime) + " to build your team and start the first battle.";
		if (!this.subRoom) {
			this.canReroll = false;

			html += " Please refer to the tournament page on the left for your opponents.";
			html += "<br /><br /><b>Remember that you must PM " + Users.self.name + " the link to each battle</b>! If you cannot copy " +
			"the link, type <code>/invite " + Users.self.name + "</code> into the battle chat.";
		}

		if (this.subRoom) {
			this.subRoom.sayHtml(html);
		} else {
			this.sayHtml(html);
		}

		if (!this.subRoom) this.generateBracket();
		this.afterGenerateBracket();
	}

	onAddPlayer(player: Player): boolean {
		if (!this.subRoom) {
			const database = Storage.getDatabase(this.room);
			if (database.tournamentGameBanlist && player.id in database.tournamentGameBanlist) {
				if (database.tournamentGameBanlist[player.id].expirationTime <= Date.now()) {
					delete database.tournamentGameBanlist[player.id];
				} else {
					player.say("You are currently banned from participating in tournament games.");
					return false;
				}
			}

			if (Client.checkFilters(player.name, this.room)) {
				player.say("You cannot participate in the tournament with your current username.");
				return false;
			}
		}

		if (this.eliminationPlayers.has(player) && !this.canRejoin) {
			let text = "You cannot re-join the tournament after leaving it.";
			if (this.subRoom) {
				player.eliminated = true;
				text += " You will be disqualified at the start of the tournament.";
			}
			player.say(text);

			if (!this.subRoom) return false;
		}

		if (!player.eliminated) {
			player.round = 1;
			this.eliminationPlayers.add(player);

			if (!this.joinNotices.has(player.id)) {
				player.say("Thanks for joining the " + this.name + " tournament! If you would like to leave the tournament at any " +
					"time, you may use the command ``" + (this.subRoom ? "/tour leave" :
					Config.commandCharacter + "leavegame " + this.room.title) + "``.");
				this.joinNotices.add(player.id);
			}

			if (!this.started && !this.signupsHtmlTimeout) {
				this.sayUhtmlChange(this.uhtmlBaseName + '-signups', this.getSignupsHtml());
				this.signupsHtmlTimeout = setTimeout(() => {
					this.signupsHtmlTimeout = null;
				}, this.getSignupsUpdateDelay());
			}

			this.giveStartingTeam(player);

			if (this.canReroll && this.playerCap && this.playerCount >= this.playerCap) {
				player.say("You have " + Tools.toDurationString(REROLL_START_DELAY) + " to decide whether you want to use ``" +
					Config.commandCharacter + REROLL_COMMAND + "`` or keep your team!");
			}
		}

		return true;
	}

	onAddExistingPlayer(player: Player): void {
		if (!this.started) this.updatePlayerHtmlPage(player);
	}

	onRemovePlayer(player: Player, notAutoconfirmed?: boolean): void {
		// allow rejoining on an autoconfirmed account
		if (notAutoconfirmed) this.eliminationPlayers.delete(player);

		if (!this.started) {
			if (!this.sharedTeams) {
				const starterPokemon = this.starterPokemon.get(player);
				if (starterPokemon) {
					for (const pokemon of starterPokemon) {
						this.pokedex.push(pokemon);
					}
				}
			}

			if (!this.signupsHtmlTimeout) {
				this.sayUhtmlChange(this.uhtmlBaseName + '-signups', this.getSignupsHtml());
				this.signupsHtmlTimeout = setTimeout(() => {
					this.signupsHtmlTimeout = null;
				}, this.getSignupsUpdateDelay());
			}

			return;
		}

		if (this.eliminationStarted) {
			const playerAndReason = new Map<Player, string>();
			playerAndReason.set(player, "You left the " + this.name + " tournament.");
			this.disqualifyPlayers(playerAndReason);
		}
	}

	sendNotAutoconfirmed(player: Player): void {
		player.say("You must be autoconfirmed to participate in the " + this.name + " tournament.");
	}

	getTeamEvolutionScore(team: string[]): number {
		if (!this.evolutionsPerRound) return 0;

		let score = 0;
		for (const pokemon of team) {
			let evolution = Dex.getExistingPokemon(pokemon);
			while (evolution.nfe) {
				score++;
				evolution = Dex.getExistingPokemon(evolution.evos[0]);
			}
		}

		return score;
	}

	getRandomTeam(player: Player): string[] {
		const possibleTeams = this.possibleTeams.get(player)!.slice();
		possibleTeams.sort((a, b) => b.length - a.length);

		const largestSize = possibleTeams[0].length;
		const largestTeams: string[][] = [];
		for (const team of possibleTeams) {
			if (team.length < largestSize) break;
			largestTeams.push(team);
		}

		if (largestTeams.length === 1) return largestTeams[0];

		const evolutionScores = new Map<string[], number>();
		for (const team of largestTeams) {
			evolutionScores.set(team, this.getTeamEvolutionScore(team));
		}
		largestTeams.sort((a, b) => evolutionScores.get(a)! - evolutionScores.get(b)!);

		const mostEvolvedTeams: string[][] = [largestTeams[0]];
		const bestScore = evolutionScores.get(largestTeams[0])!;
		for (const team of largestTeams) {
			const score = evolutionScores.get(team)!;
			if (score > bestScore) break;
			mostEvolvedTeams.push(team);
		}

		return this.sampleOne(mostEvolvedTeams);
	}

	getRandomTeamIncluding(player: Player, pokemonList: string[]): string[] {
		const possibleTeams = this.possibleTeams.get(player)!.slice();
		possibleTeams.sort((a, b) => b.length - a.length);

		let team: string[] | undefined;
		for (const possibleTeam of possibleTeams) {
			let includes = true;
			for (const pokemon of pokemonList) {
				if (!possibleTeam.includes(pokemon)) {
					includes = false;
					break;
				}
			}
			if (includes) {
				team = possibleTeam;
				break;
			}
		}

		if (!team) return pokemonList;
		return team;
	}

	findAvailableMatchNode(player: Player, opponent: Player): EliminationNode<Player> | null {
		for (const availableMatchNode of this.availableMatchNodes) {
			const playerA = availableMatchNode.children![0].user!;
			const playerB = availableMatchNode.children![1].user!;
			if ((playerA === player && playerB === opponent) || (playerA === opponent && playerB === player)) {
				return availableMatchNode;
			}
		}

		return null;
	}

	onUserJoinRoom(room: Room, user: User): void {
		if (this.allowsScouting || !(user.id in this.players) || this.players[user.id].eliminated) return;

		const players = this.getPlayersFromBattleData(room);
		if (players && !players.includes(this.players[user.id])) {
			this.players[user.id].say("You have been disqualified for scouting another " + this.name + " battle.");
			this.removePlayer(user, true);
		}
	}

	getPlayersFromBattleData(room: Room): [Player, Player] | null {
		const battleData = this.battleData.get(room);
		if (!battleData || battleData.slots.size < 2) return null;

		const players = battleData.slots.keys();
		const p1 = players.next().value as Player;
		const p2 = players.next().value as Player;
		if (this.playerOpponents.get(p1) !== p2 || this.playerOpponents.get(p2) !== p1) return null;

		return [p1, p2];
	}

	onBattlePlayer(room: Room, slot: string, username: string): void {
		const id = Tools.toId(username);
		if (!id) return;

		let battleData = this.battleData.get(room);

		// non-tournament battle, a player left the battle, or /addplayer was used
		if (!(id in this.players) || (battleData && this.getPlayersFromBattleData(room))) {
			if (battleData) {
				let originalPlayer: Player | undefined;
				battleData.slots.forEach((storedSlot, player) => {
					if (storedSlot === slot) originalPlayer = player;
				});

				if (originalPlayer && originalPlayer.id !== id) {
					const reason = this.getDisqualifyReasonText("for leaving your battle");
					originalPlayer.say(reason);

					const playerAndReason = new Map<Player, string>();
					playerAndReason.set(originalPlayer, reason);

					this.disqualifyPlayers(playerAndReason);
					this.leaveBattleRoom(room);
				}
			}
			return;
		}

		if (!battleData) {
			battleData = this.generateBattleData();
			this.battleData.set(room, battleData);
		}

		const player = this.players[id];
		battleData.slots.set(player, slot);

		const players = this.getPlayersFromBattleData(room);
		if (players) {
			const node = this.findAvailableMatchNode(players[0], players[1]);
			if (!node) throw new Error(this.name + ": no available match for " + players[0].name + " and " + players[1].name);
			this.clearNodeTimers(node);
		}
	}

	onBattlePokemon(room: Room, slot: string, details: string): boolean {
		const battleData = this.battleData.get(room);
		if (!battleData) return false;

		if (!(slot in battleData.remainingPokemon)) battleData.remainingPokemon[slot] = 0;
		battleData.remainingPokemon[slot]++;
		const pokemon = Dex.getPokemon(details.split(',')[0]);
		if (!pokemon) return false;

		if (!(slot in battleData.pokemon)) battleData.pokemon[slot] = [];
		battleData.pokemon[slot].push(pokemon.name);
		return true;
	}

	onBattleTeamPreview(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		this.playerBattleRooms.set(players[0], room);
		this.playerBattleRooms.set(players[1], room);

		const playersAndReasons = new Map<Player, string>();
		const reason = this.getDisqualifyReasonText("for using an incorrect team");

		let winner: Player | undefined;
		let loser: Player | undefined;
		let winnerIncorrectTeam = false;
		if (this.validateTeams) {
			const battleData = this.battleData.get(room)!;
			battleData.slots.forEach((slot, player) => {
				if (!(slot in battleData.pokemon)) {
					throw new Error(player.name + " (" + slot + ") does not have a team in " + room.id);
				}

				const team = battleData.pokemon[slot];

				let incorrectTeam = false;
				const requiredPokemon = this.playerRequiredPokemon.get(player);
				if (requiredPokemon) {
					incorrectTeam = !Dex.includesPokemonFormes(team, requiredPokemon);
				} else {
					const possibleTeams = this.possibleTeams.get(player);
					if (!possibleTeams) throw new Error(player.name + " (" + slot + ") does not have possible teams");
					incorrectTeam = !Dex.isPossibleTeam(team, possibleTeams);
					if (incorrectTeam) {
						const summary = Dex.getClosestPossibleTeamSummary(team, possibleTeams, this.getPossibleTeamsOptions());
						if (summary) {
							room.say(player.name + ": " + summary);
							playersAndReasons.set(player, reason + " " + summary);
						}
					}
				}

				if (incorrectTeam) {
					if (!loser) {
						loser = player;
					} else {
						winner = player;
						winnerIncorrectTeam = true;
					}
				} else {
					winner = player;
				}
			});
		}

		if (!this.battleRooms.includes(room.publicId)) this.battleRooms.push(room.publicId);

		if (winner && loser) {
			loser.say(reason);
			if (!playersAndReasons.has(loser)) playersAndReasons.set(loser, reason);

			if (winnerIncorrectTeam) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				winner.say(reason);
				if (!playersAndReasons.has(winner)) playersAndReasons.set(winner, reason);
			}

			this.disqualifyPlayers(playersAndReasons);
			return false;
		}

		return true;
	}

	onBattleStart(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		if (!this.battleRooms.includes(room.publicId)) this.battleRooms.push(room.publicId);

		if (!room.inviteOnlyBattle && this.getRemainingPlayerCount() === 2) {
			this.say("**Final battle of the " + this.name + " tournament:** <<" + room.id + ">>");
		}

		return true;
	}

	onBattleSwitch(room: Room, pokemon: string, details: string): boolean {
		const battleData = this.battleData.get(room);
		if (!battleData) return false;

		const slot = pokemon.substr(0, 2);
		const name = pokemon.substr(5).trim();
		if (!Dex.getPokemon(name)) {
			if (!(slot in battleData.nicknames)) battleData.nicknames[slot] = {};
			battleData.nicknames[slot][name] = details.split(',')[0];
		}

		return true;
	}

	onBattleFaint(room: Room, pokemonArgument: string): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		if (!this.usesCloakedPokemon) return true;

		const battleData = this.battleData.get(room)!;
		const slot = pokemonArgument.substr(0, 2);
		const name = pokemonArgument.substr(5).trim();

		let pokemon: IPokemon | undefined;
		if (slot in battleData.nicknames && name in battleData.nicknames[slot]) {
			pokemon = Dex.getPokemon(battleData.nicknames[slot][name]);
		} else {
			pokemon = Dex.getPokemon(name);
		}

		if (pokemon) {
			let player: Player;
			let opponent: Player;
			if (battleData.slots.get(players[0]) === slot) {
				player = players[0];
				opponent = players[1];
			} else {
				player = players[1];
				opponent = players[0];
			}

			const cloakedPokemon = this.starterPokemon.get(player)!;
			if (cloakedPokemon.includes(pokemon.name) || cloakedPokemon.includes(pokemon.baseSpecies)) {
				if (!(slot in battleData.faintedCloakedPokemon)) battleData.faintedCloakedPokemon[slot] = 0;
				battleData.faintedCloakedPokemon[slot]++;
				if (battleData.faintedCloakedPokemon[slot] === cloakedPokemon.length) {
					room.say(player.name + " your cloaked Pokemon " + (cloakedPokemon.length > 1 ? "have" : "has") + " fainted!");

					if (this.subRoom) {
						const playersAndReasons = new Map<Player, string>();
						playersAndReasons.set(player, "You lost your cloaked Pokemon");
						this.disqualifyPlayers(playersAndReasons);
					} else {
						this.onBattleWin(room, opponent.name);
					}

					return false;
				}
			}
		}

		return true;
	}

	onBattleWin(room: Room, username: string): void {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return;

		const winner = this.players[Tools.toId(username)];
		if (!players.includes(winner)) return;

		this.checkedBattleRooms.push(room.publicId);

		const battleData = this.battleData.get(room)!;
		const loser = players[0] === winner ? players[1] : players[0];
		const loserSlot = battleData.slots.get(loser);
		if (!loserSlot || !(loserSlot in battleData.pokemon)) {
			throw new Error(loser.name + " (" + battleData.slots.get(loser) + ") does not have a team in " + room.id);
		}

		const loserTeam = battleData.pokemon[loserSlot];
		const node = this.findAvailableMatchNode(winner, loser);
		if (!node) throw new Error("No available match for " + winner.name + " and " + loser.name);

		const result: 'win' | 'loss' = node.children![0].user === winner ? 'win' : 'loss';
		const win = result === 'win';

		const teamChanges = this.setMatchResult([node.children![0].user!, node.children![1].user!], result, win ? [1, 0] : [0, 1],
			loserTeam);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this.ended) {
			this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));
			if (this.subRoom) {
				this.updatePlayerHtmlPage(winner);
				this.updatePlayerHtmlPage(loser);
			}

			this.updateMatches();
		}
	}

	onBattleExpire(room: Room): void {
		this.checkedBattleRooms.push(room.publicId);

		const players = this.getPlayersFromBattleData(room);
		if (players) {
			const reason = this.getDisqualifyReasonText("for letting your battle expire");
			const playersAndReasons = new Map<Player, string>();
			playersAndReasons.set(players[0], reason);
			playersAndReasons.set(players[1], reason);
			this.disqualifyPlayers(playersAndReasons);
		}
	}

	onBattleTie(room: Room): void {
		this.checkedBattleRooms.push(room.publicId);
	}

	clearNodeTimers(node: EliminationNode<Player>): void {
		const activityTimer = this.activityTimers.get(node);
		if (activityTimer) {
			clearTimeout(activityTimer);
			this.activityTimers.delete(node);
		}

		const checkChallengesTimer = this.checkChallengesTimers.get(node);
		if (checkChallengesTimer) {
			clearTimeout(checkChallengesTimer);
			this.checkChallengesTimers.delete(node);
		}

		const checkChallengesInactiveTimer = this.checkChallengesInactiveTimers.get(node);
		if (checkChallengesInactiveTimer) {
			clearTimeout(checkChallengesInactiveTimer);
			this.checkChallengesInactiveTimers.delete(node);
		}
	}

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.advertisementInterval) {
			clearInterval(this.advertisementInterval);
			// @ts-expect-error
			this.advertisementInterval = undefined;
		}

		if (this.updateHtmlPagesTimeout) {
			clearTimeout(this.updateHtmlPagesTimeout);
			// @ts-expect-error
			this.updateHtmlPagesTimeout = undefined;
		}

		if (this.treeRoot) {
			this.treeRoot.traverse(node => {
				this.clearNodeTimers(node);
			});
		}
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.disqualifiedOpponents.clear();
		this.disqualifiedPlayers.clear();
		this.firstRoundByeAdditions.clear();
		this.playerBattleRooms.clear();
		this.playerOpponents.clear();
		this.playerRequiredPokemon.clear();
		this.possibleTeams.clear();
		this.rerolls.clear();
		this.starterPokemon.clear();
		this.teamChanges.clear();

		this.eliminationPlayers.clear();
		this.firstRoundByes.clear();
		this.givenFirstRoundExtraTime.clear();
		this.spectatorPlayers.clear();
	}

	cleanupMisc(): void {
		super.cleanupMisc();

		if (this.treeRoot) this.treeRoot.destroy();
	}

	onEnd(): void {
		if (!this.treeRoot || !this.eliminationEnded) return;

		this.updateBracketHtml();
		this.updateHtmlPages();

		const now = Date.now();
		const database = Storage.getDatabase(this.room);
		if (!database.lastGameFormatTimes) database.lastGameFormatTimes = {};
		database.lastGameFormatTimes[this.format.id] = now;
		const idWithOptions = Tools.toId(this.format.nameWithOptions);
		if (idWithOptions !== this.format.id) {
			database.lastGameFormatTimes[idWithOptions] = now;
		}

		const places = Tournaments.getPlacesFromTree(this.treeRoot);
		if (places.winner && places.runnerup && places.semifinalists) {
			const winners: Player[] = [places.winner];
			const runnersUp: Player[] = [places.runnerup];

			const multiplier = Tournaments.getPlayersPointMultiplier(this.playerCount);
			const semiFinalistPoints = Tournaments.getSemiFinalistPoints(multiplier);
			const runnerUpPoints = Tournaments.getRunnerUpPoints(multiplier);
			const winnerPoints = Tournaments.getWinnerPoints(multiplier);

			const semiFinalistPm = 'You were awarded **' + semiFinalistPoints + ' bit' + (semiFinalistPoints > 1 ? "s" : "") +
				'** for being ' + (places.semifinalists.length > 1 ? 'a' : 'the') + ' semi-finalist in the tournament! To see your total ' +
				'amount, use this command: ``' + Config.commandCharacter + 'bits ' + this.room.title + '``.';
			for (const semiFinalist of places.semifinalists) {
				this.addBits(semiFinalist, semiFinalistPoints, true);
				const user = Users.get(semiFinalist.name);
				if (user) user.say(semiFinalistPm);
			}

			const runnerUpPm = 'You were awarded **' + runnerUpPoints + ' bits** for being ' + (runnersUp.length > 1 ? 'a' :
				'the') + ' runner-up in the tournament! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'bits ' + this.room.title + '``.';
			for (const runnerUp of runnersUp) {
				this.addBits(runnerUp, runnerUpPoints);
				const user = Users.get(runnerUp.name);
				if (user) user.say(runnerUpPm);
			}

			const winnerPm = 'You were awarded **' + winnerPoints + ' bits** for being ' + (winners.length > 1 ? 'a' :
				'the') + ' tournament winner! To see your total amount, use this command: ``' +
				Config.commandCharacter + 'bits ' + this.room.title + '``.';
			for (const winner of winners) {
				this.addBits(winner, winnerPoints, true);
				const user = Users.get(winner.name);
				if (user) user.say(winnerPm);
			}

			const placesHtml = Tournaments.getPlacesHtml('gameLeaderboard', this.name, winners.map(x => x.name),
				runnersUp.map(x => x.name), places.semifinalists.map(x => x.name), winnerPoints, runnerUpPoints, semiFinalistPoints);
			this.sayHtml("<div class='infobox-limited'>" + placesHtml + "</div>");

			if (winners.length === 1) {
				Tournaments.showWinnerTrainerCard(this.room, winners[0].name);
			}
		}

		Games.setLastGame(this.room, Date.now());

		if (Config.tournamentGameCooldownTimers && this.room.id in Config.tournamentGameCooldownTimers) {
			this.say("The **" + Config.tournamentGameCooldownTimers[this.room.id] + "-minute cooldown** until the next tournament " +
				"starts now!");
		}

		if (Config.tournamentGameAutoCreateTimers && this.room.id in Config.tournamentGameAutoCreateTimers) {
			let autoCreateTimer = Config.tournamentGameAutoCreateTimers[this.room.id];
			if (Config.tournamentGameCooldownTimers && this.room.id in Config.tournamentGameCooldownTimers) {
				autoCreateTimer += Config.tournamentGameCooldownTimers[this.room.id];
			}
			Games.setAutoCreateTimer(this.room, 'tournament', autoCreateTimer * 60 * 1000);
		}
	}

	meetsStarterCriteria?(pokemon: IPokemon): boolean;
	meetsEvolutionCriteria?(pokemon: IPokemon): boolean;
}

const commands: GameCommandDefinitions<BattleElimination> = {
	check: {
		command(target, room, user) {
			if (this.subRoom) {
				user.say("This command is not necessary in group chat tournaments.");
				return false;
			}

			const player = this.players[user.id];
			if (player.eliminated) {
				if (this.disqualifiedPlayers.has(player)) {
					user.say("You have already been disqualified from the tournament! You must invite " + Users.self.name + " at the " +
						"start of every battle.");
				} else {
					user.say("You have already been eliminated from the tournament.");
				}
				return false;
			}

			if (!target) {
				user.say("You must include the link to the battle.");
				return false;
			}

			if (!this.playerOpponents.has(player)) {
				user.say("You do not have a current opponent.");
				return false;
			}

			const battle = Client.extractBattleId(target);
			if (!battle) {
				user.say("Please specify a valid battle link.");
				return false;
			}

			if (Rooms.get(battle.fullId)) {
				user.say(Users.self.name + " is already in the specified battle.");
				return false;
			}

			if (this.checkedBattleRooms.includes(battle.publicId)) {
				user.say("The specified battle has already been checked.");
				return false;
			}

			if (battle.format !== this.battleFormat.id) {
				user.say("You must battle in " + this.battleFormat.name + ".");
				return false;
			}

			Rooms.addCreateListener(battle.fullId, battleRoom => {
				battleRoom.game = this;
				this.battleData.set(battleRoom, this.generateBattleData());
			});
			this.roomCreateListeners.push(battle.fullId);

			Client.joinRoom(battle.fullId);
			return true;
		},
		eliminatedGameCommand: true,
		pmOnly: true,
	},
	starter: {
		command(target, room, user) {
			if (!(user.id in this.players)) return false;
			const player = this.players[user.id];
			const starterPokemon = this.starterPokemon.get(player);
			if (!starterPokemon) {
				user.say("You have not yet been assigned Pokemon.");
				return false;
			}

			this.updatePlayerHtmlPage(player);
			return true;
		},
		pmOnly: true,
		signupsGameCommand: true,
		aliases: ['team'],
	},
	tournamentpage: {
		command(target, room, user) {
			const id = Tools.toId(target);
			if (id) {
				if (!user.isDeveloper() && !user.hasRank(this.room, 'driver')) return false;
				if (user.id in this.players && !(this.players[user.id].eliminated && user.isDeveloper())) {
					user.say("You cannot use this command while participating in the tournament.");
					return false;
				}

				if (!(id in this.players)) {
					user.say("'" + target.trim() + "' is not a player in the current tournament.");
					return false;
				}

				this.room.sendHtmlPage(user, this.baseHtmlPageId + "-" + id,
					this.getHtmlPageWithHeader(this.getPlayerHtmlPage(this.players[id], true)));
			} else if (user.id in this.players) {
				this.updatePlayerHtmlPage(this.players[user.id]);
			} else {
				if (this.subRoom) {
					user.say("To spectate the current tournament, join <<" + this.subRoom.id + ">>!");
					return false;
				}

				this.spectatorUsers.add(user.id);
				this.updateSpectatorHtmlPage(user);
			}
			return true;
		},
		aliases: ['tourpage', 'tournamenttab', 'tourtab'],
		pmOnly: true,
		eliminatedGameCommand: true,
		spectatorGameCommand: true,
		signupsGameCommand: true,
	},
	[REROLL_COMMAND]: {
		command(target, room, user) {
			if (!this.canReroll || !(user.id in this.players)) return false;
			const player = this.players[user.id];
			if (this.rerolls.has(player) || this.playerBattleRooms.has(player)) return false;

			const starterPokemon = this.starterPokemon.get(player);
			if (!starterPokemon) return false;
			for (const pokemon of starterPokemon) {
				this.pokedex.push(pokemon);
			}

			this.rerolls.set(player, true);
			this.giveStartingTeam(player);
			return true;
		},
		pmOnly: true,
		signupsGameCommand: true,
	},
	resumetournamentupdates: {
		command(target, room, user) {
			if (user.id in this.players) {
				if (!this.players[user.id].eliminated || this.spectatorPlayers.has(this.players[user.id])) return false;
				this.spectatorPlayers.add(this.players[user.id]);
				this.updatePlayerHtmlPage(this.players[user.id]);
			} else {
				if (this.spectatorUsers.has(user.id)) return false;
				this.spectatorUsers.add(user.id);
				this.updateSpectatorHtmlPage(user);
			}
			return true;
		},
		aliases: ['spectatetournament', 'spectatetour'],
		pmOnly: true,
		eliminatedGameCommand: true,
		spectatorGameCommand: true,
	},
	stoptournamentupdates: {
		command(target, room, user) {
			if (user.id in this.players) {
				if (!this.players[user.id].eliminated || !this.spectatorPlayers.has(this.players[user.id])) return false;
				this.spectatorPlayers.delete(this.players[user.id]);
				this.updatePlayerHtmlPage(this.players[user.id]);
			} else {
				if (!this.spectatorUsers.has(user.id)) return false;
				this.spectatorUsers.delete(user.id);
				this.updateSpectatorHtmlPage(user);
			}
			return true;
		},
		aliases: ['unspectatetournament', 'unspectatetour'],
		pmOnly: true,
		eliminatedGameCommand: true,
		spectatorGameCommand: true,
	},
};

const disableTournamentProperties = (game: BattleElimination): void => {
	game.subRoom = null;
	game.usesTournamentStart = false;
	game.usesTournamentJoin = false;
};

const tests: GameFileTests<BattleElimination> = {
	'should use a compatible format': {
		test(game) {
			disableTournamentProperties(game);

			const format = Dex.getExistingFormat(game.battleFormatId);
			assert(!format.team);
			assert(Dex.getRuleTable(format).has("teampreview"));
		},
	},
	'should generate a Pokedex': {
		test(game) {
			disableTournamentProperties(game);

			assert(game.pokedex.length);
			addPlayers(game, game.maxPlayers);
			assert(game.started);
			game.startElimination();
		},
	},
	'should generate a bracket - 4 players': {
		test(game) {
			disableTournamentProperties(game);

			const players: Player[] = [];
			for (let i = 1; i <= 4; i++) {
				players.push(new Player("Mocha Player " + i, game));
			}

			game.generateBracket(players);
			const root = game.treeRoot!;
			assertStrictEqual(root.user, null);
			assert(root.children);
			assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].user, null);
			assertStrictEqual(root.children[1].user, null);
			assert(root.children[0].children);
			assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].user!.name, "Mocha Player 1");
			assertStrictEqual(root.children[0].children[1].user!.name, "Mocha Player 3");
			assert(root.children[1].children);
			assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 2");
			assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 4");
			assert(!root.children[0].children[0].children);
			assert(!root.children[0].children[1].children);
			assert(!root.children[1].children[0].children);
			assert(!root.children[1].children[1].children);
		},
	},
	'should generate a bracket - 5 players': {
		test(game) {
			disableTournamentProperties(game);

			const players: Player[] = [];
			for (let i = 1; i <= 5; i++) {
				players.push(new Player("Mocha Player " + i, game));
			}

			game.generateBracket(players);
			const root = game.treeRoot!;
			assertStrictEqual(root.user, null);
			assert(root.children);
			assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].user, null);
			assertStrictEqual(root.children[1].user, null);
			assert(root.children[0].children);
			assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].user, null);
			assertStrictEqual(root.children[0].children[1].user!.name, "Mocha Player 3");
			assert(root.children[1].children);
			assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 2");
			assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 4");
			assert(root.children[0].children[0].children);
			assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
			assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 5");
			assert(!root.children[0].children[1].children);
			assert(!root.children[1].children[0].children);
			assert(!root.children[1].children[1].children);
		},
	},
	'should generate a bracket - 6 players': {
		test(game) {
			disableTournamentProperties(game);

			const players: Player[] = [];
			for (let i = 1; i <= 6; i++) {
				players.push(new Player("Mocha Player " + i, game));
			}

			game.generateBracket(players);
			const root = game.treeRoot!;
			assertStrictEqual(root.user, null);
			assert(root.children);
			assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].user, null);
			assertStrictEqual(root.children[1].user, null);
			assert(root.children[0].children);
			assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].user, null);
			assertStrictEqual(root.children[0].children[1].user, null);
			assert(root.children[1].children);
			assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 2");
			assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 4");
			assert(root.children[0].children[0].children);
			assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
			assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 5");
			assert(root.children[0].children[1].children);
			assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
			assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 6");
			assert(!root.children[1].children[0].children);
			assert(!root.children[1].children[1].children);
		},
	},
	'should generate a bracket - 7 players': {
		test(game) {
			disableTournamentProperties(game);

			const players: Player[] = [];
			for (let i = 1; i <= 7; i++) {
				players.push(new Player("Mocha Player " + i, game));
			}

			game.generateBracket(players);
			const root = game.treeRoot!;
			assertStrictEqual(root.user, null);
			assert(root.children);
			assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].user, null);
			assertStrictEqual(root.children[1].user, null);
			assert(root.children[0].children);
			assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].user, null);
			assertStrictEqual(root.children[0].children[1].user, null);
			assert(root.children[1].children);
			assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].user, null);
			assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 4");
			assert(root.children[0].children[0].children);
			assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
			assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 5");
			assert(root.children[0].children[1].children);
			assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
			assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 6");
			assert(root.children[1].children[0].children);
			assert(root.children[1].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].children[0].user!.name, "Mocha Player 2");
			assertStrictEqual(root.children[1].children[0].children[1].user!.name, "Mocha Player 7");
			assert(!root.children[1].children[1].children);
		},
	},
	'should generate a bracket - 8 players': {
		test(game) {
			disableTournamentProperties(game);

			const players: Player[] = [];
			for (let i = 1; i <= 8; i++) {
				players.push(new Player("Mocha Player " + i, game));
			}

			game.generateBracket(players);
			const root = game.treeRoot!;
			assertStrictEqual(root.user, null);
			assert(root.children);
			assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].user, null);
			assertStrictEqual(root.children[1].user, null);
			assert(root.children[0].children);
			assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].user, null);
			assertStrictEqual(root.children[0].children[1].user, null);
			assert(root.children[1].children);
			assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].user, null);
			assertStrictEqual(root.children[1].children[1].user, null);
			assert(root.children[0].children[0].children);
			assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
			assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 5");
			assert(root.children[0].children[1].children);
			assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
			assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 6");
			assert(root.children[1].children[0].children);
			assert(root.children[1].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[0].children[0].user!.name, "Mocha Player 2");
			assertStrictEqual(root.children[1].children[0].children[1].user!.name, "Mocha Player 7");
			assert(root.children[1].children[1].children);
			assert(root.children[1].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			assertStrictEqual(root.children[1].children[1].children[0].user!.name, "Mocha Player 4");
			assertStrictEqual(root.children[1].children[1].children[1].user!.name, "Mocha Player 8");
		},
	},
	'should properly list matches by round - 4 players': {
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 4);
			game.start();
			game.startElimination();

			assert(!game.firstRoundByes.size);

			const matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			assertStrictEqual(matchRounds.length, 2);
			assertStrictEqual(matchRounds[0], '1');
			assertStrictEqual(matchRounds[1], '2');
			assertStrictEqual(matchesByRound['1'].length, 2);
			assertStrictEqual(matchesByRound['2'].length, 1);
			for (let i = 0; i < 2; i++) {
				assert(matchesByRound['1'][i].children);
				assert(matchesByRound['1'][i].children![0].user);
				assert(matchesByRound['1'][i].children![1].user);
			}
			assert(matchesByRound['2'][0].children);
			assert(!matchesByRound['2'][0].children[0].user);
			assert(!matchesByRound['2'][0].children[1].user);
		},
	},
	'should properly list matches by round - 5 players': {
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 5);
			game.start();
			game.startElimination();

			assertStrictEqual(game.firstRoundByes.size, 3);
			if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
				game.firstRoundByes.forEach(player => {
					assert(game.possibleTeams.get(player)!.length);
					assertStrictEqual(game.teamChanges.get(player)!.length, 1);
				});
			}

			const matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			assertStrictEqual(matchRounds.length, 3);
			assertStrictEqual(matchRounds[0], '1');
			assertStrictEqual(matchRounds[1], '2');
			assertStrictEqual(matchRounds[2], '3');
			assertStrictEqual(matchesByRound['1'].length, 1);
			assertStrictEqual(matchesByRound['2'].length, 2);
			assertStrictEqual(matchesByRound['3'].length, 1);
			assert(matchesByRound['1'][0].children);
			assert(matchesByRound['1'][0].children[0].user);
			assert(matchesByRound['1'][0].children[1].user);
			assert(matchesByRound['2'][0].children);
			assert(!matchesByRound['2'][0].children[0].user);
			assert(matchesByRound['2'][0].children[1].user);
			assert(matchesByRound['2'][1].children);
			assert(matchesByRound['2'][1].children[0].user);
			assert(matchesByRound['2'][1].children[1].user);
			assert(matchesByRound['3'][0].children);
			assert(!matchesByRound['3'][0].children[0].user);
			assert(!matchesByRound['3'][0].children[1].user);
		},
	},
	'should properly list matches by round - 6 players': {
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 6);
			game.start();
			game.startElimination();

			assertStrictEqual(game.firstRoundByes.size, 2);
			if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
				game.firstRoundByes.forEach(player => {
					assert(game.possibleTeams.get(player)!.length);
					assertStrictEqual(game.teamChanges.get(player)!.length, 1);
				});
			}

			const matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			assertStrictEqual(matchRounds.length, 3);
			assertStrictEqual(matchRounds[0], '1');
			assertStrictEqual(matchRounds[1], '2');
			assertStrictEqual(matchRounds[2], '3');
			assertStrictEqual(matchesByRound['1'].length, 2);
			assertStrictEqual(matchesByRound['2'].length, 2);
			assertStrictEqual(matchesByRound['3'].length, 1);

			for (let i = 0; i < 2; i++) {
				assert(matchesByRound['1'][i].children);
				assert(matchesByRound['1'][i].children![0].user);
				assert(matchesByRound['1'][i].children![1].user);
			}

			assert(matchesByRound['2'][0].children);
			assert(!matchesByRound['2'][0].children[0].user);
			assert(!matchesByRound['2'][0].children[1].user);
			assert(matchesByRound['2'][1].children);
			assert(matchesByRound['2'][1].children[0].user);
			assert(matchesByRound['2'][1].children[1].user);
			assert(matchesByRound['3'][0].children);
			assert(!matchesByRound['3'][0].children[0].user);
			assert(!matchesByRound['3'][0].children[1].user);
		},
	},
	'should properly list matches by round - 7 players': {
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 7);
			game.start();
			game.startElimination();

			assertStrictEqual(game.firstRoundByes.size, 1);
			if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
				game.firstRoundByes.forEach(player => {
					assert(game.possibleTeams.get(player)!.length);
					assertStrictEqual(game.teamChanges.get(player)!.length, 1);
				});
			}

			const matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			assertStrictEqual(matchRounds.length, 3);
			assertStrictEqual(matchRounds[0], '1');
			assertStrictEqual(matchRounds[1], '2');
			assertStrictEqual(matchRounds[2], '3');
			assertStrictEqual(matchesByRound['1'].length, 3);
			assertStrictEqual(matchesByRound['2'].length, 2);
			assertStrictEqual(matchesByRound['3'].length, 1);

			for (let i = 0; i < 3; i++) {
				assert(matchesByRound['1'][i].children);
				assert(matchesByRound['1'][i].children![0].user);
				assert(matchesByRound['1'][i].children![1].user);
			}

			assert(matchesByRound['2'][0].children);
			assert(!matchesByRound['2'][0].children[0].user);
			assert(!matchesByRound['2'][0].children[1].user);
			assert(matchesByRound['2'][1].children);
			assert(!matchesByRound['2'][1].children[0].user);
			assert(matchesByRound['2'][1].children[1].user);
			assert(matchesByRound['3'][0].children);
			assert(!matchesByRound['3'][0].children[0].user);
			assert(!matchesByRound['3'][0].children[1].user);
		},
	},
	'should properly list matches by round - 8 players': {
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 8);
			if (!game.started) game.start();
			game.startElimination();

			assert(!game.firstRoundByes.size);

			const matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			assertStrictEqual(matchRounds.length, 3);
			assertStrictEqual(matchRounds[0], '1');
			assertStrictEqual(matchRounds[1], '2');
			assertStrictEqual(matchRounds[2], '3');
			assertStrictEqual(matchesByRound['1'].length, 4);
			assertStrictEqual(matchesByRound['2'].length, 2);
			assertStrictEqual(matchesByRound['3'].length, 1);

			for (let i = 0; i < 4; i++) {
				assert(matchesByRound['1'][i].children);
				assert(matchesByRound['1'][i].children![0].user);
				assert(matchesByRound['1'][i].children![1].user);
			}

			for (let i = 0; i < 2; i++) {
				assert(matchesByRound['2'][i].children);
				assert(!matchesByRound['2'][i].children![0].user);
				assert(!matchesByRound['2'][i].children![1].user);
			}

			assert(matchesByRound['3'][0].children);
			assert(!matchesByRound['3'][0].children[0].user);
			assert(!matchesByRound['3'][0].children[1].user);
		},
	},
	'should give team changes until players have a full team - additionsPerRound': {
		test(game) {
			this.timeout(15000);
			if (!game.additionsPerRound || game.dropsPerRound || game.maxPlayers < 64) return;

			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 64);
			if (!game.started) game.start();
			game.startElimination();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			for (let i = 1; i <= ((6 - game.startingTeamsLength) / game.additionsPerRound); i++) {
				const round = matchRounds[i - 1];
				if (!round) break;
				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					game.removePlayer(match.children![1].user!.name);
					if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
						assert(game.possibleTeams.get(winner)!.length);
					}
				}

				assertStrictEqual(game.teamChanges.get(player)!.length, i);
				matchesByRound = game.getMatchesByRound();
			}
		},
	},
	'should give team changes until players have a full team - dropsPerRound': {
		test(game) {
			this.timeout(15000);
			if (!game.dropsPerRound || game.additionsPerRound || game.maxPlayers < 64) return;

			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 64);
			if (!game.started) game.start();
			game.startElimination();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			for (let i = 1; i <= ((game.startingTeamsLength - 1) / game.additionsPerRound); i++) {
				const round = matchRounds[i - 1];
				if (!round) break;
				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					game.removePlayer(match.children![1].user!.name);
					if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
						assert(game.possibleTeams.get(winner)!.length);
					}
				}

				assertStrictEqual(game.teamChanges.get(player)!.length, i);
				matchesByRound = game.getMatchesByRound();
			}
		},
	},
};

export const game: IGameTemplateFile<BattleElimination> = {
	category: 'battle-elimination' as GameCategory,
	commandDescriptions: [Config.commandCharacter + 'check [battle link]'],
	commands,
	tests,
	tournamentGame: true,
};