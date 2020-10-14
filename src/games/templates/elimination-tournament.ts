import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import { addPlayers, assert, assertStrictEqual } from "../../test/test-tools";
import type { IFormat, IPokemon } from "../../types/dex";
import type {
	GameCategory, GameCommandDefinitions, GameFileTests, IBattleGameData, IGameFormat, IGameTemplateFile
} from "../../types/games";
import type { User } from "../../users";

interface IEliminationTree<T> {
	root: EliminationNode<T>;
	currentLayerLeafNodes: EliminationNode<T>[];
	nextLayerLeafNodes: EliminationNode<T>[];
}

interface ITeamChange {
	additions: number;
	choices: string[];
	drops: number;
	evolutions: number;
}

const SIGNUPS_HTML_DELAY = 2 * 1000;
const ADVERTISEMENT_TIME = 20 * 60 * 1000;
const POTENTIAL_MAX_PLAYERS: number[] = [12, 16, 24, 32, 48, 64, 80, 96, 112, 128];
const TEAM_PREVIEW_HIDDEN_FORMES: string[] = ['Arceus', 'Gourgeist', 'Genesect', 'Pumpkaboo', 'Silvally', 'Urshifu'];

/**
 * There are two types of elim nodes, player nodes
 * and match nodes.
 *
 * Player nodes are leaf nodes: .children = none
 *
 * Match nodes are non-leaf nodes, and will always have two children.
 */
class EliminationNode<T> {
	children: [EliminationNode<T>, EliminationNode<T>] | null;
	/**
	 * In a player node, the player (null if it's an unfilled loser's bracket node).
	 *
	 * In a match node, the winner if it exists, otherwise null.
	 */
	user: T | null;
	/**
	 * Only relevant to match nodes. (Player nodes are always '')
	 *
	 * 'available' = ready for battles - will have two children, both with users; this.user is null
	 *
	 * 'finished' = battle already over - will have two children, both with users; this.user is winner
	 *
	 * '' = unavailable
	 */
	state: 'available' | 'finished' | '';
	result: 'win' | 'loss' | '';
	score: number[] | null;
	parent: EliminationNode<T> | null;

	constructor(options: Partial<EliminationNode<T>>) {
		this.children = null;
		this.user = options.user || null;
		this.state = options.state || '';
		this.result = options.result || '';
		this.score = options.score || null;
		this.parent = options.parent || null;
	}

	setChildren(children: [EliminationNode<T>, EliminationNode<T>] | null) {
		if (this.children) {
			for (const child of this.children) child.parent = null;
		}
		if (children) {
			for (const child of children) child.parent = this;
		}
		this.children = children;
	}

	traverse(callback: (node: EliminationNode<T>) => void) {
		const queue: EliminationNode<T>[] = [this];
		let node;
		while ((node = queue.shift())) {
			// eslint-disable-next-line callback-return
			callback(node);
			if (node.children) queue.push(...node.children);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	find<U>(callback: (node: EliminationNode<T>) => (U | void)) {
		const queue: EliminationNode<T>[] = [this];
		let node;
		while ((node = queue.shift())) {
			// eslint-disable-next-line callback-return
			const value = callback(node);
			if (value) {
				return value;
			}
			if (node.children) queue.push(...node.children);
		}
		return undefined;
	}
	// eslint-disable-next-line no-restricted-globals
	[Symbol.iterator]() {
		const results: EliminationNode<T>[] = [this];
		for (const result of results) {
			if (result.children) results.push(...result.children);
		}
		// eslint-disable-next-line no-restricted-globals
		return results[Symbol.iterator]();
	}
}

export abstract class EliminationTournament extends ScriptedGame {
	abstract baseTournamentName: string;

	activityDQTimeout: number = 2 * 60 * 1000;
	activityTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	activityWarnTimeout: number = 5 * 60 * 1000;
	additionsPerRound: number = 0;
	advertisementInterval: NodeJS.Timer | null = null;
	allowsFormes: boolean = true;
	allowsScouting: boolean = false;
	autoCloseHtmlPage = false;
	availableMatchNodes: EliminationNode<Player>[] = [];
	awaitingBracketUpdate = new Set<Player>();
	banlist: string[] = [];
	readonly battleData: Dict<IBattleGameData> = {};
	readonly battleRooms: string[] = [];
	bracketGenerated: boolean = false;
	bracketHtml: string = '';
	canRejoin: boolean = false;
	canReroll: boolean = false;
	checkedBattleRooms: string[] = [];
	checkChallengesTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	cloakedPokemon: string[] | null = null;
	color: string | null = null;
	defaultTier: string = 'ou';
	disqualifiedPlayers = new Set<Player>();
	dropsPerRound: number = 0;
	evolutionsPerRound: number = 0;
	firstRoundByes = new Set<Player>();
	firstRoundExtraTime: number = 0;
	firstRoundTime: number = 0;
	fullyEvolved: boolean = false;
	gen: number | null = null;
	givenFirstRoundExtraTime = new Set<Player>();
	internalGame = true;
	maxPlayers: number = POTENTIAL_MAX_PLAYERS[POTENTIAL_MAX_PLAYERS.length - 1];
	minPlayers: number = 4;
	playerCap: number = 0;
	playerOpponents = new Map<Player, Player>();
	pokedex: string[] = [];
	possibleTeams = new Map<Player, readonly string[][]>();
	requiredAddition: boolean = false;
	requiredDrop: boolean = false;
	requiredEvolution: boolean = false;
	rerolls = new Map<Player, boolean>();
	requiredTier: string | null = null;
	requiredPokemon: string[] | null = null;
	sharedTeams: boolean = false;
	spectatorPlayers = new Set<Player>();
	spectatorUsers = new Set<string>();
	starterPokemon = new Map<Player, readonly string[]>();
	startingTeamsLength: number = 6;
	teamChanges = new Map<Player, ITeamChange[]>();
	totalAdvertisementTime: number = 0;
	totalRounds: number = 0;
	tournamentDescription: string = '';
	tournamentEnded: boolean = false;
	tournamentName: string = '';
	tournamentPlayers = new Set<Player>();
	type: string | null = null;
	usesCloakedPokemon: boolean = false;
	usesHtmlPage = true;
	validateTeams: boolean = true;

	// set on start
	battleFormat!: IFormat;
	treeRoot!: EliminationNode<Player>;

	room!: Room;

	onInitialize(format: IGameFormat): void {
		super.onInitialize(format);

		let formatName = this.defaultTier;
		if (this.variant && !(this.variant === 'monocolor' || this.variant === 'monoregion')) {
			formatName = this.variant;
		}

		this.battleFormat = Dex.getExistingFormat(formatName);
		this.battleFormat.usablePokemon = Dex.getUsablePokemon(this.battleFormat);
		this.firstRoundTime = this.activityWarnTimeout + this.activityDQTimeout + this.firstRoundExtraTime;
	}

	getNumberOfRounds(players: number): number {
		return Math.ceil(Math.log(players) / Math.log(2));
	}

	getMinimumPokemonForPlayers(players: number): number {
		if (this.sharedTeams || this.usesCloakedPokemon) {
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

	getMaxPlayers(pokemon: number): number {
		let maxPlayers = 0;
		for (const players of POTENTIAL_MAX_PLAYERS) {
			if (this.getMinimumPokemonForPlayers(players - 1) > pokemon || this.getMinimumPokemonForPlayers(players) > pokemon) {
				break;
			}
			maxPlayers = players;
		}

		return maxPlayers;
	}

	meetsPokemonCriteria(pokemon: IPokemon, type: 'starter' | 'evolution'): boolean {
		if (pokemon.battleOnly || !this.battleFormat.usablePokemon!.includes(pokemon.name) || this.banlist.includes(pokemon.name) ||
			(this.type && !pokemon.types.includes(this.type)) || TEAM_PREVIEW_HIDDEN_FORMES.includes(pokemon.name) ||
			(pokemon.forme && TEAM_PREVIEW_HIDDEN_FORMES.includes(pokemon.baseSpecies))) {
			return false;
		}

		if (type === 'starter') {
			if (this.meetsStarterCriteria && this.meetsStarterCriteria(pokemon) === false) {
				return false;
			}
		} else {
			if (this.meetsEvolutionCriteria && this.meetsEvolutionCriteria(pokemon) === false) {
				return false;
			}
		}

		return true;
	}

	createPokedex(): string[] {
		const fullyEvolved = this.fullyEvolved || (this.evolutionsPerRound < 1 && !this.usesCloakedPokemon);
		const checkEvolutions = this.evolutionsPerRound !== 0;

		const pokedex: IPokemon[] = [];
		for (const name of Dex.data.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(name);
			if (!this.meetsPokemonCriteria(pokemon, 'starter')) continue;

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
				const evolutionLines = Dex.getEvolutionLines(pokemon);
				let validEvolutionLines = evolutionLines.length;
				for (const line of evolutionLines) {
					let validLine = true;
					for (const stage of line) {
						const evolution = Dex.getExistingPokemon(stage);
						if (evolution === pokemon) continue;
						if (!this.meetsPokemonCriteria(evolution, 'evolution')) {
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

	generateBracket(): void {
		let tree: IEliminationTree<Player> = null!;

		const players = this.shufflePlayers();
		for (const player of players) {
			if (!tree) {
				tree = {
					root: new EliminationNode<Player>({user: player}),
					currentLayerLeafNodes: [],
					nextLayerLeafNodes: [],
				};
				tree.currentLayerLeafNodes.push(tree.root);
				continue;
			}

			const targetNode = tree.currentLayerLeafNodes.shift()!;
			const newLeftChild = new EliminationNode<Player>({user: targetNode.user});
			tree.nextLayerLeafNodes.push(newLeftChild);

			const newRightChild = new EliminationNode<Player>({user: player});
			tree.nextLayerLeafNodes.push(newRightChild);
			targetNode.setChildren([newLeftChild, newRightChild]);

			targetNode.user = null;

			if (tree.currentLayerLeafNodes.length === 0) {
				tree.currentLayerLeafNodes = tree.nextLayerLeafNodes;
				tree.nextLayerLeafNodes = [];
			}
		}

		tree.root.traverse(node => {
			if (node.children && node.children[0].user && node.children[1].user) {
				node.state = 'available';
			}
		});

		this.treeRoot = tree.root;
		this.bracketGenerated = true;
		this.totalRounds = this.getNumberOfRounds(players.length);
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
				if (!match.children || !match.children.length) continue;
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

		const fullFirstRoundPlayers = Math.pow(2, this.totalRounds);
		for (let i = 0; i < fullFirstRoundPlayers; i++) {
			html += '<tr style="height: 32px">';

			for (let i = 0; i < matchRounds.length; i++) {
				const round = matchRounds[i];
				if (!playerNamesByRound[round].length) {
					if (i === 0) {
						html += "<td>&nbsp;</td>";
					}
					continue;
				}

				if (playerNamesByRound[round][0]) {
					html += '<td' + (i > 0 ? ' rowspan="' + (Math.pow(2, i)) + '"' : '') + ' style="margin: 0;padding: 5px;">' +
						'<p style="border-bottom: solid 1px;margin: 0;padding: 1px;">';
					const playerName = playerNamesByRound[round][0];
					if (playerName === placeholderName) {
						html += playerName;
					} else {
						const winner = winnersByRound[round].includes(playerName);
						if (winner) html += '<i>';
						html += '<strong class="username">' + playerName + '</strong>';
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

	disqualifyPlayers(players: Player[]): void {
		if (!this.bracketGenerated) throw new Error("disqualifyUsers() called before bracket generated");

		for (const player of players) {
			player.eliminated = true;
			this.disqualifiedPlayers.add(player);
			this.awaitingBracketUpdate.add(player);

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

				const teamChanges = this.setMatchResult(found.match, found.result, found.score);
				this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));

				this.awaitingBracketUpdate.add(winner);
			}
		}

		if (!this.ended) this.updateMatches();
	}

	eliminateInactivePlayers(player: Player, opponent: Player, inactivePlayers: Player[]): void {
		const node = this.findAvailableMatchNode(player, opponent);
		if (node) this.clearNodeTimers(node);

		if (inactivePlayers.includes(player) && inactivePlayers.includes(opponent)) {
			player.say("You have been disqualified from the " + this.name + " tournament for failing " +
				"to battle " + opponent.name + " in time.");
			opponent.say("You have been disqualified from the " + this.name + " tournament for failing " +
				"to battle " + player.name + " in time.");
			this.disqualifyPlayers([player, opponent]);
		} else if (inactivePlayers.includes(player)) {
			player.say("You have been disqualified from the " + this.name + " tournament for failing " +
				"to battle " + opponent.name + " in time.");
			this.disqualifyPlayers([player]);
		} else if (inactivePlayers.includes(opponent)) {
			opponent.say("You have been disqualified from the " + this.name + " tournament for failing " +
				"to battle " + player.name + " in time.");
			this.disqualifyPlayers([opponent]);
		}
	}

	getAvailableMatchNodes(): EliminationNode<Player>[] {
		if (!this.bracketGenerated) throw new Error("getAvailableMatchNodes() called before bracket generated");

		const nodes: EliminationNode<Player>[] = [];
		this.treeRoot.traverse(node => {
			if (node.state === 'available' && node.children![0].user && node.children![1].user) {
				nodes.push(node);
			}
		});

		return nodes;
	}

	setMatchResult(players: [Player, Player], result: 'win' | 'loss', score: [number, number], loserTeam?: string[]): ITeamChange[] {
		if (!this.bracketGenerated) {
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

		const activityTimer = this.activityTimers.get(targetNode);
		if (activityTimer) clearTimeout(activityTimer);
		const checkChallengesTimer = this.checkChallengesTimers.get(targetNode);
		if (checkChallengesTimer) clearTimeout(checkChallengesTimer);

		this.playerOpponents.delete(p1);
		this.playerOpponents.delete(p2);

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

				if (this.disqualifiedPlayers.has(userA)) {
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult([userA, userB], 'loss', [0, 1]));
				} else if (this.disqualifiedPlayers.has(userB)) {
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult([userA, userB], 'win', [1, 0]));
				}
			}
		}

		if (!this.ended && this.getRemainingPlayerCount() < 2) {
			this.end();
		}

		return winnerTeamChanges;
	}

	updateMatches(): void {
		const nodes = this.getAvailableMatchNodes();
		for (const node of nodes) {
			if (this.availableMatchNodes.includes(node)) continue;
			this.availableMatchNodes.push(node);
			const player = node.children![0].user!;
			const opponent = node.children![1].user!;

			this.playerOpponents.set(player, opponent);
			this.playerOpponents.set(opponent, player);
			this.awaitingBracketUpdate.add(player);
			this.awaitingBracketUpdate.add(opponent);

			const newOpponentPM = "You have a new opponent for the " + this.name + " tournament in " + this.room.title + "!";
			player.say(newOpponentPM);
			opponent.say(newOpponentPM);

			let activityWarning = this.activityWarnTimeout;
			if (!this.givenFirstRoundExtraTime.has(player) && !this.givenFirstRoundExtraTime.has(opponent)) {
				if (this.firstRoundExtraTime) activityWarning += this.firstRoundExtraTime;
			}
			this.givenFirstRoundExtraTime.add(player);
			this.givenFirstRoundExtraTime.add(opponent);

			const timeout = setTimeout(() => {
				const reminderPM = "You still need to battle your new opponent for the " + this.name + " tournament in " +
					this.room.title + "! Please send me the link to the battle or leave your pending challenge up.";

				player.say(reminderPM);
				opponent.say(reminderPM);
				const timeout = setTimeout(() => {
					const inactivePlayers: Player[] = [];
					const playerA = Users.get(player.name);
					if (!playerA || !playerA.rooms.has(this.room)) inactivePlayers.push(player);
					const playerB = Users.get(opponent.name);
					if (!playerB || !playerB.rooms.has(this.room)) inactivePlayers.push(opponent);
					if (inactivePlayers.length) {
						this.eliminateInactivePlayers(player, opponent, inactivePlayers);
					} else {
						this.checkChallenges(node, player, opponent);
					}
				}, this.activityDQTimeout);
				this.activityTimers.set(node, timeout);
			}, activityWarning);
			this.activityTimers.set(node, timeout);
		}

		const oldBracketHtml = this.bracketHtml;
		this.updateBracketHtml();
		if (this.bracketHtml !== oldBracketHtml) {
			this.updateHtmlPages();
		}
	}

	getPokemonIcons(pokemon: readonly string[]): string[] {
		return pokemon.map(x => Dex.getPokemonIcon(Dex.getExistingPokemon(x)) + x);
	}

	getRulesHtml(): string {
		let html = "<u><b>Rules</b></u><ul>";
		html += "<li>Battles must be played in <b>" + this.battleFormat.name + "</b></li>";
		html += "<li>All Pokemon (including formes), moves, abilities, and items not banned in " + this.battleFormat.name + " can " +
			"be used</li>";
		if (!this.allowsScouting) html += "<li>Scouting is not allowed</li>";
		if (!this.cloakedPokemon && !this.sharedTeams) {
			html += "<li><b>Do not reveal your or your opponents' " + (this.startingTeamsLength === 1 ? "starters" : "teams") + " in " +
				"the chat!</b></li>";
		}
		html += "</ul>";

		return html;
	}

	getBracketHtml(): string {
		return "<u><b>" + (this.tournamentEnded ? "Final bracket" : "Bracket") + "</b></u><br />" +
			(this.bracketHtml || "<br />The bracket will be created once the tournament starts.");
	}

	getPlayerHtmlPage(player: Player): string {
		let html = "";

		if (this.tournamentEnded) {
			if (player === this.getFinalPlayer()) {
				html += "<h3>Congratulations! You won the final battle of the tournament.</h3><hr />";
			} else {
				html += "<h3>The tournament has ended!</h3><hr />";
			}
		} else {
			html += this.getRulesHtml();
		}

		if (this.started && !this.tournamentEnded) {
			if (player.eliminated) {
				html += "<br /><u><b>You were eliminated!</b></u><br /><br />";
				if (this.spectatorPlayers.has(player)) {
					html += "You are currently still receiving updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
				} else {
					html += "You will no longer receive updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
				}
			} else {
				html += "<br /><u><b>Opponent</b></u> (round " + player.round + ")<br /><br />";
				const opponent = this.playerOpponents.get(player);
				if (opponent) {
					html += "Your next opponent is <strong class='username'>" + opponent.name + "</strong>! To send a challenge, click " +
						"their name, click \"Challenge\", select " + this.battleFormat.name + " as the format, and select your team " +
						"for this tournament. Once the battle starts, send " + Users.self.name + " the link or type <code>/invite " +
						Users.self.name + "</code> into the battle chat!";
					html += "<br /><br /><b>If " + opponent.name + " goes offline or does not accept your challenge, you will be " +
						"advanced automatically after some time!</b>";
				} else {
					html += "Your next opponent has not been decided yet!";
				}
			}
			html += "<br /><br />";
		}

		html += "<br /><u><b>Pokemon</b></u><br /><br />";
		const pastTense = this.tournamentEnded || player.eliminated;
		const starterPokemon = this.starterPokemon.get(player);
		if (starterPokemon) {
			if (this.cloakedPokemon) {
				html += "<b>The Pokemon to protect in battle ";
				if (pastTense) {
					html += (this.cloakedPokemon.length === 1 ? "was" : "were");
				} else {
					html += (this.cloakedPokemon.length === 1 ? "is" : "are");
				}
				html += "</b>:<br />" + this.getPokemonIcons(this.cloakedPokemon).join("");
				if (!this.tournamentEnded && this.cloakedPokemon.length < 6) {
					html += "<br />You may add any Pokemon to fill your team as long as they are usable in " + this.battleFormat.name + ".";
				}
			} else {
				html += "<b>" + (this.sharedTeams ? "The" : "Your") + " " +
					(this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound ? "starting " : "") +
					(this.startingTeamsLength === 1 ? "Pokemon" : "team") + " " + (pastTense ? "was" : "is") + "</b>:";
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
					if (teamChange.choices.length <= teamChange.additions) {
						roundChanges += (pastTense ? "Added" : "Add") + " the following to your team:";
					} else {
						roundChanges += (pastTense ? "Chose" : "Choose") + " " + teamChange.additions + " of the following " +
							"to add to your team:";
					}
					roundChanges += "<br />" + Tools.joinList(this.getPokemonIcons(teamChange.choices), undefined, undefined, "or") +
						"</li>";
				}

				if (teamChange.evolutions) {
					const amount = Math.abs(teamChange.evolutions);
					roundChanges += "<li>" + (pastTense ? "Chose" : "Choose") + " " + amount + " " +
						"member" + (amount > 1 ? "s" : "") + " of your " + (teamChange.additions || teamChange.drops ? "updated " : "") +
						"team to " + (teamChange.evolutions >= 1 ? "evolve" : "de-volve") + "</li>";
				}

				if (roundChanges) {
					rounds.push("<b>Round " + (i + 1) + " changes</b>:<ul>" + roundChanges + "</ul>");
				}
			}

			if (rounds.length) {
				html += "<br /><br />";
				if (!player.eliminated && !this.tournamentEnded && player.round === 2 && this.firstRoundByes.has(player)) {
					html += "<b>NOTE</b>: you were given a first round bye so you must follow the team changes below for your first " +
						"battle!<br /><br />";
				}
				html += rounds.join("");

				html += "<br /><b>Example of a valid team</b>:<br />" + Tools.joinList(this.getPokemonIcons(this.getRandomTeam(player)));
			}
		}

		html += "<br /><br /><br />" + this.getBracketHtml();

		return html;
	}

	updatePlayerHtmlPage(player: Player): void {
		player.sendHtmlPage(this.getPlayerHtmlPage(player));
		this.awaitingBracketUpdate.delete(player);
	}

	updatePlayerHtmlPages(): void {
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) {
				if (!this.spectatorPlayers.has(player)) continue;
			} else {
				if (!this.tournamentEnded && !this.awaitingBracketUpdate.has(player)) continue;
			}

			this.updatePlayerHtmlPage(player);
		}
	}

	getSpectatorHtmlPage(user: User): string {
		let html = "";

		if (this.tournamentEnded) {
			html += "<h3>The tournament has ended!</h3><hr />";
		} else {
			html += this.getRulesHtml();
		}

		if (this.started && !this.tournamentEnded) {
			html += "<br /><u><b>Spectating</b></u><br /><br />";
			if (this.spectatorUsers.has(user.id)) {
				html += "You are currently receiving updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
			} else {
				html += "You will no longer receive updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
			}
			html += "<br /><br />";
		}

		html += "<br />" + this.getBracketHtml();

		return html;
	}

	updateSpectatorHtmlPage(user: User): void {
		this.room.sendHtmlPage(user, this.baseHtmlPageId, this.htmlPageHeader + this.getSpectatorHtmlPage(user));
	}

	updateSpectatorHtmlPages(): void {
		const users = Array.from(this.spectatorUsers.keys());
		for (const id of users) {
			const user = Users.get(id);
			if (!user) {
				this.spectatorUsers.delete(id);
				continue;
			}

			this.updateSpectatorHtmlPage(user);
		}
	}

	updateHtmlPages(): void {
		this.updatePlayerHtmlPages();
		this.updateSpectatorHtmlPages();
	}

	setCheckChallengesListeners(player: Player, opponent: Player): void {
		this.onHtml('<div class="infobox">' + player.name + ' is challenging ' + opponent.name + ' in ' + this.battleFormat.name +
			'.</div>', () => {
			this.eliminateInactivePlayers(player, opponent, [opponent]);
			this.removeCheckChallengesListeners(player, opponent);
		}, true);
		this.onHtml('<div class="infobox">' + opponent.name + ' is challenging ' + player.name + ' in ' + this.battleFormat.name +
			'.</div>', () => {
			this.eliminateInactivePlayers(player, opponent, [player]);
			this.removeCheckChallengesListeners(player, opponent);
		}, true);
		this.onHtml('<div class="infobox">' + player.name + ' and ' + opponent.name + ' are not challenging each other.</div>', () => {
			this.eliminateInactivePlayers(player, opponent, [player, opponent]);
			this.removeCheckChallengesListeners(player, opponent);
		}, true);
		this.onHtml('<div class="infobox">' + opponent.name + ' and ' + player.name + ' are not challenging each other.</div>', () => {
			this.eliminateInactivePlayers(player, opponent, [player, opponent]);
			this.removeCheckChallengesListeners(player, opponent);
		}, true);
	}

	removeCheckChallengesListeners(player: Player, opponent: Player): void {
		this.offHtml('<div class="infobox">' + player.name + ' is challenging ' + opponent.name + ' in ' + this.battleFormat.name +
			'.</div>', true);
		this.offHtml('<div class="infobox">' + opponent.name + ' is challenging ' + player.name + ' in ' + this.battleFormat.name +
			'.</div>', true);
		this.offHtml('<div class="infobox">' + player.name + ' and ' + opponent.name + ' are not challenging each other.</div>', true);
		this.offHtml('<div class="infobox">' + opponent.name + ' and ' + player.name + ' are not challenging each other.</div>', true);
	}

	checkChallenges(node: EliminationNode<Player>, player: Player, opponent: Player): void {
		const timeout = setTimeout(() => this.eliminateInactivePlayers(player, opponent, [player, opponent]), 30 * 1000);
		this.checkChallengesTimers.set(node, timeout);

		this.setCheckChallengesListeners(player, opponent);
		this.say("!checkchallenges " + player.name + ", " + opponent.name);
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
		const team = this.getStartingTeam();
		if (team.length < this.startingTeamsLength) throw new Error("Out of Pokemon to give (" + player.name + ")");

		this.possibleTeams.set(player, Dex.getFormeCombinations(team, this.battleFormat.usablePokemon));
		this.starterPokemon.set(player, team);
		this.updatePlayerHtmlPage(player);
	}

	updatePossibleTeams(player: Player, additions: string[]): void {
		this.possibleTeams.set(player, Dex.getPossibleTeams(this.possibleTeams.get(player)!, additions, {
			additions: this.additionsPerRound,
			drops: this.dropsPerRound,
			evolutions: this.evolutionsPerRound,
			requiredAddition: this.requiredAddition,
			requiredDrop: this.requiredDrop,
			requiredEvolution: this.requiredEvolution,
			allowFormes: this.allowsFormes,
			usablePokemon: this.battleFormat.usablePokemon,
		}));
	}

	getSignupsHtml(): string {
		let html = "<div class='infobox'><b>" + Users.self.name + " is hosting a " + this.name + " tournament!</b>";
		if (this.tournamentDescription) html += "<br />" + this.tournamentDescription;
		html += "<br /><br />";
		if (this.started) {
			html += "(the tournament has started)";
		} else {
			html += Client.getPmSelfButton(Config.commandCharacter + "joingame " + this.room.title, "Join tournament") +
				" (" + (this.playerCap - this.playerCount) + "/" + this.playerCap + " slots remaining)";
		}
		html += "</div>";
		return html;
	}

	postSignups(): void {
		this.sayUhtmlAuto(this.uhtmlBaseName + '-signups', this.getSignupsHtml());
	}

	onSignups(): void {
		const minimumPlayers = POTENTIAL_MAX_PLAYERS[0];
		const minimumPokemon = Math.max(this.getMinimumPokemonForPlayers(minimumPlayers - 1),
			this.getMinimumPokemonForPlayers(minimumPlayers));

		let pokedex: string[];
		if (this.variant === 'monocolor') {
			const colors = this.shuffle(Object.keys(Dex.data.colors));
			this.color = Dex.data.colors[colors[0]];
			colors.shift();
			pokedex = this.createPokedex();
			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!colors.length) throw new Error("No color has at least " + minimumPokemon + " Pokemon");
				this.color = Dex.data.colors[colors[0]];
				colors.shift();
				pokedex = this.createPokedex();
			}
			this.tournamentName = "Mono-" + this.color + " " + this.baseTournamentName;
		} else if (this.variant === 'monotype') {
			const types = this.shuffle(Dex.data.typeKeys);
			this.type = Dex.getExistingType(types[0]).name;
			types.shift();
			pokedex = this.createPokedex();
			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!types.length) throw new Error("No type has at least " + minimumPokemon + " Pokemon");
				this.type = Dex.getExistingType(types[0]).name;
				types.shift();
				pokedex = this.createPokedex();
			}
			this.tournamentName = "Mono-" + this.type + " " + this.baseTournamentName;
		} else if (this.variant === 'monoregion') {
			let gens: number[] = [];
			for (let i = 1; i <= Dex.gen; i++) {
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

			this.tournamentName = "Mono-" + region + " " + this.baseTournamentName;
		} else {
			pokedex = this.createPokedex();
			if (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				throw new Error(this.battleFormat.name + " does not have at least " + minimumPokemon + " Pokemon");
			}
			this.tournamentName = this.format.nameWithOptions || this.format.name;
		}

		this.pokedex = this.shuffle(pokedex);
		this.htmlPageHeader = "<h3>" + this.room.title + "'s " + this.tournamentName + "</h3>";

		if (this.usesCloakedPokemon) {
			this.cloakedPokemon = this.pokedex.slice(0, this.startingTeamsLength);
			this.requiredPokemon = this.cloakedPokemon.slice();
		} else {
			const maxPlayers = this.getMaxPlayers(this.pokedex.length);
			if (maxPlayers < this.maxPlayers) this.maxPlayers = maxPlayers;
		}

		this.playerCap = this.maxPlayers;

		this.startAdvertisements();
		this.sayCommand("/notifyrank all, " + this.room.title + " " + Users.self.name + " tournament," + this.name + "," + Users.self.name +
			" is hosting a tournament");
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
		if (!this.started) this.start();
	}

	onStart(): void {
		if (this.advertisementInterval) clearInterval(this.advertisementInterval);
		this.canReroll = false;
		this.canRejoin = false; // disable rejoins to prevent remainingPlayers from being wrong

		this.sayUhtmlChange(this.uhtmlBaseName + '-signups', this.getSignupsHtml());

		let html = Users.self.name + "'s " + this.name + " tournament has started! You have " +
			Tools.toDurationString(this.firstRoundTime) + " to build your team and start the first battle. Please refer to the " +
			"tournament page on the left for your opponents.";
		html += "<br /><br /><b>Remember that you must PM " + Users.self.name + " the link to each battle</b>! If you cannot copy the " +
			"link, type <code>/invite " + Users.self.name + "</code> into the battle chat.";
		this.sayHtml(html);

		this.generateBracket();

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
			this.awaitingBracketUpdate.add(player);
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

				this.updatePossibleTeams(player, pokemon);
			}
		});

		this.updateMatches();
	}

	onAddPlayer(player: Player): boolean {
		if (this.tournamentPlayers.has(player) && !this.canRejoin) {
			player.say("You cannot re-join the tournament after leaving it.");
			return false;
		}

		player.round = 1;
		this.tournamentPlayers.add(player);

		player.say("Thanks for joining the " + this.name + " tournament! If you would like to leave the tournament at any time, you may " +
			"use the command ``" + Config.commandCharacter + "leavegame " + this.room.title + "``.");

		if (!this.started && !this.signupsHtmlTimeout) {
			this.sayUhtmlChange(this.uhtmlBaseName + '-signups', this.getSignupsHtml());
			this.signupsHtmlTimeout = setTimeout(() => {
				this.signupsHtmlTimeout = null;
			}, SIGNUPS_HTML_DELAY);
		}

		this.giveStartingTeam(player);
		return true;
	}

	onAddExistingPlayer(player: Player): void {
		if (!this.started) this.updatePlayerHtmlPage(player);
	}

	onRemovePlayer(player: Player): void {
		if (!this.started) {
			const starterPokemon = this.starterPokemon.get(player);
			if (starterPokemon) {
				for (const pokemon of starterPokemon) {
					this.pokedex.push(pokemon);
				}
			}
			return;
		}

		this.disqualifyPlayers([player]);
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
		if (user === Users.self) {
			this.checkedBattleRooms.push(room.id);
		}

		if (this.allowsScouting || !(user.id in this.players) || this.players[user.id].eliminated || !(room.id in this.battleData)) return;
		if (this.battleData[room.id].slots.size === 2 && !this.battleData[room.id].slots.has(this.players[user.id])) {
			this.players[user.id].say("You have been disqualified for scouting another " + this.name + " battle.");
			this.removePlayer(user, true);
		}
	}

	getPlayersFromBattleData(room: Room): [Player, Player] | null {
		if (!(room.id in this.battleData) || this.battleData[room.id].slots.size < 2) return null;

		const players = this.battleData[room.id].slots.keys();
		const p1 = players.next().value as Player;
		const p2 = players.next().value as Player;
		if (this.playerOpponents.get(p1) !== p2) return null;

		return [p1, p2];
	}

	onBattlePlayer(room: Room, slot: string, username: string): void {
		const id = Tools.toId(username);
		if (!id) return;

		// non-tournament battle, a player left the battle, or /addplayer was used
		if (!(id in this.players) || (room.id in this.battleData && this.getPlayersFromBattleData(room))) {
			if (room.id in this.battleData) {
				let originalPlayer: Player | undefined;
				this.battleData[room.id].slots.forEach((storedSlot, player) => {
					if (storedSlot === slot) originalPlayer = player;
				});

				if (originalPlayer && originalPlayer.id !== id) {
					originalPlayer.say("You have been disqualified for leaving your battle!");
					this.disqualifyPlayers([originalPlayer]);
					room.say("/leave");
				}
			}
			return;
		}

		if (!(room.id in this.battleData)) {
			this.battleData[room.id] = {
				remainingPokemon: {},
				slots: new Map<Player, string>(),
				pokemonCounts: {},
				pokemon: {},
				pokemonLeft: {},
				nicknames: {},
				wrongTeam: new Map<Player, boolean>(),
				faintedCloakedPokemon: {},
			};
		}

		const player = this.players[id];
		this.battleData[room.id].slots.set(player, slot);

		const players = this.getPlayersFromBattleData(room);
		if (players) {
			const node = this.findAvailableMatchNode(players[0], players[1]);
			if (!node) throw new Error(this.name + ": no available match for " + players[0].name + " and " + players[1].name);
			this.clearNodeTimers(node);
		}
	}

	onBattlePokemon(room: Room, slot: string, details: string, item: boolean): boolean {
		if (!(room.id in this.battleData)) return false;

		if (!(slot in this.battleData[room.id].remainingPokemon)) this.battleData[room.id].remainingPokemon[slot] = 0;
		this.battleData[room.id].remainingPokemon[slot]++;
		const pokemon = Dex.getPokemon(details.split(',')[0]);
		if (!pokemon) return false;

		if (!(slot in this.battleData[room.id].pokemon)) this.battleData[room.id].pokemon[slot] = [];
		this.battleData[room.id].pokemon[slot].push(pokemon.name);
		return true;
	}

	onBattleTeamPreview(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		let winner: Player | undefined;
		let loser: Player | undefined;
		let winnerIllegalTeam = false;
		if (this.validateTeams) {
			this.battleData[room.id].slots.forEach((slot, player) => {
				const team = this.battleData[room.id].pokemon[slot];
				if (!team) throw new Error(player.name + " (" + slot + ") does not have a team in " + room.id);

				let illegalTeam = false;
				if (this.requiredPokemon) {
					illegalTeam = !Dex.includesPokemon(team, this.requiredPokemon);
				} else {
					const possibleTeams = this.possibleTeams.get(player);
					if (!possibleTeams) throw new Error(player.name + " (" + slot + ") does not have possible teams");
					illegalTeam = !Dex.isPossibleTeam(team, possibleTeams);
				}

				if (illegalTeam) {
					if (!loser) {
						loser = player;
					} else {
						winner = player;
						winnerIllegalTeam = true;
					}
				} else {
					winner = player;
				}
			});
		}

		if (!this.battleRooms.includes(room.id)) this.battleRooms.push(room.id);

		if (winner && loser) {
			loser.say("You used an illegal team and have been disqualified.");
			if (winnerIllegalTeam) {
				winner.say("You used an illegal team and have been disqualified.");
				this.disqualifyPlayers([loser, winner]);
			} else {
				this.disqualifyPlayers([loser]);
			}
			return false;
		}

		return true;
	}

	onBattleStart(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		if (!this.battleRooms.includes(room.id)) this.battleRooms.push(room.id);

		if (!room.inviteOnlyBattle && this.getRemainingPlayerCount() === 2) {
			this.say("**Final battle of the " + this.name + " tournament:** <<" + room.id + ">>");
		}

		return true;
	}

	onBattleSwitch(room: Room, pokemon: string, details: string, hpStatus: [string, string]): boolean {
		if (!(room.id in this.battleData)) return false;
		const slot = pokemon.substr(0, 2);
		const name = pokemon.substr(5).trim();
		if (!Dex.getPokemon(name)) {
			if (!(slot in this.battleData[room.id].nicknames)) this.battleData[room.id].nicknames[slot] = {};
			this.battleData[room.id].nicknames[slot][name] = details.split(',')[0];
		}

		return true;
	}

	onBattleFaint(room: Room, pokemonArgument: string): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		if (!this.cloakedPokemon) return true;

		const slot = pokemonArgument.substr(0, 2);
		const name = pokemonArgument.substr(5);
		let pokemon = Dex.getPokemon(name);
		if (!pokemon && slot in this.battleData[room.id].nicknames && name in this.battleData[room.id].nicknames[slot]) {
			pokemon = Dex.getPokemon(this.battleData[room.id].nicknames[slot][name]);
		}

		if (pokemon && this.cloakedPokemon.includes(pokemon.name)) {
			if (!(slot in this.battleData[room.id].faintedCloakedPokemon)) this.battleData[room.id].faintedCloakedPokemon[slot] = 0;
			this.battleData[room.id].faintedCloakedPokemon[slot]++;
			if (this.battleData[room.id].faintedCloakedPokemon[slot] === this.cloakedPokemon.length) {
				let winner: Player;
				let loser: Player;
				if (this.battleData[room.id].slots.get(players[0]) === slot) {
					loser = players[0];
					winner = players[1];
				} else {
					loser = players[1];
					winner = players[0];
				}

				room.say(loser.name + " your cloaked Pokemon " + (this.cloakedPokemon.length > 1 ? "have" : "has") + " fainted!");
				this.onBattleWin(room, winner.name);
				return false;
			}
		}

		return true;
	}

	onBattleWin(room: Room, username: string): void {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return;

		const winner = this.players[Tools.toId(username)];
		if (!players.includes(winner)) return;

		const loser = players[0] === winner ? players[1] : players[0];
		const loserTeam = this.battleData[room.id].pokemon[this.battleData[room.id].slots.get(loser)!];
		if (!loserTeam) {
			throw new Error(loser.name + " (" + this.battleData[room.id].slots.get(loser) + ") does not have a team in " +
				room.id);
		}

		const node = this.findAvailableMatchNode(winner, loser);
		if (!node) throw new Error("No available match for " + winner.name + " and " + loser.name);

		const result: 'win' | 'loss' = node.children![0].user === winner ? 'win' : 'loss';
		const win = result === 'win';

		const teamChanges = this.setMatchResult([node.children![0].user!, node.children![1].user!], result, win ? [1, 0] : [0, 1],
			loserTeam);
		this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));

		this.awaitingBracketUpdate.add(winner);
		this.awaitingBracketUpdate.add(loser);

		if (!this.ended) {
			this.updateMatches();
		}
	}

	onBattleExpire(room: Room): void {
		const players = this.getPlayersFromBattleData(room);
		if (players) this.disqualifyPlayers(players);
	}

	clearNodeTimers(node: EliminationNode<Player>): void {
		const activityTimer = this.activityTimers.get(node);
		if (activityTimer) clearTimeout(activityTimer);

		const checkChallengesTimer = this.checkChallengesTimers.get(node);
		if (checkChallengesTimer) clearTimeout(checkChallengesTimer);
	}

	cleanupTimers(): void {
		if (this.advertisementInterval) clearInterval(this.advertisementInterval);

		this.activityTimers.forEach((timeout, match) => {
			clearTimeout(timeout);
		});
	}

	onEnd(): void {
		this.tournamentEnded = true;
		this.updateBracketHtml();
		this.updateHtmlPages();

		const winner = this.getFinalPlayer();
		if (winner) {
			this.say("Congratulations to **" + winner.name + "** for winning the " + this.name + " tournament!");
		} else {
			this.say("Both finalists were disqualified so no one wins the " + this.name + " tournament!");
		}

		Games.lastGames[this.room.id] = Date.now();

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

const commands: GameCommandDefinitions<EliminationTournament> = {
	/* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
	check: {
		command(target, room, user) {
			if (!this.playerOpponents.has(this.players[user.id])) {
				user.say("You do not have a current opponent.");
				return false;
			}
			if (!target) {
				user.say("You must include the link to the battle.");
				return false;
			}

			const battle = Client.extractBattleId(target);
			if (!battle) {
				user.say("Please specify a valid battle link.");
				return false;
			}
			if (this.checkedBattleRooms.includes(battle)) {
				user.say("The specified battle has already been checked.");
				return false;
			}

			const format = battle.split("-")[1];
			if (format !== this.battleFormat.id) {
				user.say("You must battle in " + this.battleFormat.name + ".");
				return false;
			}

			const battleRoom = Rooms.add(battle);
			battleRoom.game = this;
			this.say('/join ' + battle);
			return true;
		},
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
	reroll: {
		command(target, room, user) {
			if (!this.canReroll || !(user.id in this.players)) return false;
			const player = this.players[user.id];
			if (this.rerolls.has(player)) return false;
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
		pmOnly: true,
		eliminatedGameCommand: true,
		spectatorGameCommand: true,
	}
	/* eslint-enable */
};

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const tests: GameFileTests<EliminationTournament> = {
	'should generate a Pokedex': {
		test(game, format) {
			assert(game.pokedex.length);
			addPlayers(game, game.maxPlayers);
			assert(game.started);
		}
	},
	'should generate an even bracket for 2^n player count': {
		test(game, format) {
			addPlayers(game, 4);
			game.start();
			assert(!game.firstRoundByes.size);
		}
	},
	'should generate a bracket with byes if not 2^n player count': {
		test(game, format) {
			addPlayers(game, 6);
			game.start();
			assertStrictEqual(game.firstRoundByes.size, 2);
			if (game.additionsPerRound || game.dropsPerRound || game.evolutionsPerRound) {
				game.firstRoundByes.forEach(player => {
					assertStrictEqual(game.teamChanges.get(player)!.length, 1);
				});
			}
		}
	},
	'should properly list matches by round - 4 players': {
		test(game, format) {
			addPlayers(game, 4);
			game.start();

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
		}
	},
	'should properly list matches by round - 5 players': {
		test(game, format) {
			addPlayers(game, 5);
			game.start();

			assert(game.firstRoundByes.size);
			game.firstRoundByes.forEach(player => {
				assert(game.possibleTeams.get(player)!.length);
			});

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
		}
	},
	'should properly list matches by round - 6 players': {
		test(game, format) {
			addPlayers(game, 6);
			game.start();

			assert(game.firstRoundByes.size);
			game.firstRoundByes.forEach(player => {
				assert(game.possibleTeams.get(player)!.length);
			});

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
		}
	},
	'should properly list matches by round - 7 players': {
		test(game, format) {
			addPlayers(game, 7);
			game.start();

			assert(game.firstRoundByes.size);
			game.firstRoundByes.forEach(player => {
				assert(game.possibleTeams.get(player)!.length);
			});

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
		}
	},
	'should properly list matches by round - 8 players': {
		test(game, format) {
			addPlayers(game, 8);
			if (!game.started) game.start();

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
		}
	},
	'should give team changes until players have a full team - additionsPerRound': {
		test(game, format) {
			this.timeout(15000);
			if (!game.additionsPerRound || game.dropsPerRound || game.maxPlayers < 64) return;

			addPlayers(game, 64);
			if (!game.started) game.start();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			for (let i = 1; i <= ((6 - game.startingTeamsLength) / game.additionsPerRound); i++) {
				const round = matchRounds[(i - 1)];
				if (!round) break;
				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					game.removePlayer(match.children![1].user!.name);
					assert(game.possibleTeams.get(winner)!.length);
				}

				assertStrictEqual(game.teamChanges.get(player)!.length, i);
				matchesByRound = game.getMatchesByRound();
			}
		}
	},
	'should give team changes until players have a full team - dropsPerRound': {
		test(game, format) {
			this.timeout(15000);
			if (!game.dropsPerRound || game.additionsPerRound || game.maxPlayers < 64) return;

			addPlayers(game, 64);
			if (!game.started) game.start();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			for (let i = 1; i <= ((game.startingTeamsLength - 1) / game.additionsPerRound); i++) {
				const round = matchRounds[(i - 1)];
				if (!round) break;
				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					game.removePlayer(match.children![1].user!.name);
					assert(game.possibleTeams.get(winner)!.length);
				}

				assertStrictEqual(game.teamChanges.get(player)!.length, i);
				matchesByRound = game.getMatchesByRound();
			}
		}
	},
};
/* eslint-enable */

export const game: IGameTemplateFile<EliminationTournament> = {
	category: 'elimination-tournament' as GameCategory,
	commandDescriptions: [Config.commandCharacter + 'check [battle link]'],
	commands,
	noOneVsOne: true,
	tests,
	tournamentGame: true,
};
