import type { Player } from "../../room-activity";
import { Game } from "../../room-game";
import type { IFormat, IPokemon } from "../../types/dex";
import type { User } from "../../users";
import type { Room } from "../../rooms";
import type { GameCategory, IGameTemplateFile, GameCommandDefinitions, IBattleGameData } from "../../types/games";

const SIGNUPS_HTML_DELAY = 2 * 1000;
const ADVERTISEMENT_TIME = 20 * 60 * 1000;

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

interface IEliminationTree<T> {
	root: EliminationNode<T>;
	currentLayerLeafNodes: EliminationNode<T>[];
	nextLayerLeafNodes: EliminationNode<T>[];
}

interface ITeamChange {
	additions: number;
	choices: string[];
	evolutions: number;
}

export abstract class EliminationTournament extends Game {
	abstract baseTournamentName: string;

	activityDQTimeout: number = 2 * 60 * 1000;
	activityTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	activityWarnTimeout: number = 3 * 60 * 1000;
	additionsPerRound: number = 0;
	advertisementInterval: NodeJS.Timer | null = null;
	allowsScouting: boolean = false;
	availableMatchNodes: EliminationNode<Player>[] = [];
	banlist: string[] = [];
	readonly battleData: Dict<IBattleGameData> = {};
	readonly battleRooms: string[] = [];
	bracketGenerated: boolean = false;
	bracketHtml: string = '';
	canRejoin: boolean = false;
	canReroll: boolean = false;
	checkChallengesTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	cloakedPokemon: string[] | null = null;
	color: string | null = null;
	defaultTier: string = 'ou';
	disqualifiedPlayers = new Set<Player>();
	evolutionsPerRound: number = 0;
	firstRoundByes = new Set<Player>();
	firstRoundExtraTime: number = 0;
	firstRoundTime: number = 0;
	fullyEvolved: boolean = false;
	gen: number | null = null;
	givenFirstRoundExtraTime = new Set<Player>();
	internalGame = true;
	maxPlayers: number = 32;
	minPlayers: number = 4;
	playerCap: number = 0;
	playerOpponents = new Map<Player, Player>();
	pokedex: IPokemon[] = [];
	possibleTeams = new Map<Player, IPokemon[][]>();
	requiredAddition: boolean = false;
	requiredEvolution: boolean = false;
	rerolls = new Map<Player, boolean>();
	requiredTier: string | null = null;
	requiredPokemon: string[] | null = null;
	sharedTeams: boolean = false;
	spectatorPlayers = new Set<Player>();
	spectatorUsers = new Set<string>();
	starterPokemon = new Map<Player, string[]>();
	startingTeamsLength: number = 6;
	teamChanges = new Map<Player, ITeamChange[]>();
	totalAdvertisementTime: number = 0;
	tournamentDescription: string = '';
	tournamentEnded: boolean = false;
	tournamentName: string = '';
	tournamentPlayers = new Set<Player>();
	type: string | null = null;
	usesCloakedPokemon: boolean = false;
	validateTeams: boolean = true;

	// set on start
	battleFormat!: IFormat;
	treeRoot!: EliminationNode<Player>;

	room!: Room;

	onInitialize(): void {
		super.onInitialize();

		let formatName = this.defaultTier;
		if (this.variant && !(this.variant === 'monocolor' || this.variant === 'monoregion')) {
			formatName = this.variant;
		}
		this.battleFormat = Dex.getExistingFormat(formatName);

		this.firstRoundTime = this.activityWarnTimeout + this.activityDQTimeout + this.firstRoundExtraTime;
	}

	getMaxPlayers(pokemon: number): number {
		if (this.additionsPerRound && this.additionsPerRound >= 1) {
			return Math.floor(pokemon / (this.startingTeamsLength + this.additionsPerRound));
		}

		return Math.floor(pokemon / this.startingTeamsLength);
	}

	createPokedex(): IPokemon[] {
		const fullyEvolved = this.fullyEvolved || (this.evolutionsPerRound < 1 && !this.usesCloakedPokemon);
		const checkEvolutions = this.evolutionsPerRound !== 0;
		if (!this.battleFormat.usablePokemon) this.battleFormat.usablePokemon = Dex.getUsablePokemon(this.battleFormat);

		const pokedex: IPokemon[] = [];
		for (const name of Dex.data.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(name);
			if (pokemon.forme || !this.battleFormat.usablePokemon.includes(pokemon.name)) continue;

			// gens and colors only enforced for the first stage
			if (this.gen && pokemon.gen !== this.gen) continue;
			if (this.color && pokemon.color !== this.color) continue;
			if (this.requiredTier) {
				if (pokemon.tier !== this.requiredTier) continue;
			} else if (fullyEvolved) {
				if (!pokemon.prevo || pokemon.nfe) continue;
			} else {
				if (pokemon.prevo || !pokemon.nfe) continue;
			}

			const evolutionLines = checkEvolutions ? Dex.getEvolutionLines(pokemon) : [[pokemon.name]];
			let validEvolutions = evolutionLines.length;
			for (const line of evolutionLines) {
				for (const stage of line) {
					const evolution = Dex.getExistingPokemon(stage);
					if (this.banlist.includes(evolution.name) || !this.battleFormat.usablePokemon.includes(evolution.name) ||
						(this.type && !evolution.types.includes(this.type))) {
						validEvolutions--;
						break;
					}
				}
			}
			if (!validEvolutions) continue;

			pokedex.push(pokemon);
		}
		return pokedex;
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
	}

	getBracketHtml(): string {
		const matchesByDepth = this.getMatchesByDepth();
		const depths = Object.keys(matchesByDepth).reverse();

		const placeholderName = "(undecided)";
		let longestName = placeholderName.length;
		for (const i in this.players) {
			const name = this.players[i].name.length;
			if (name > longestName) longestName = name;
		}

		const nodeWidth = Math.ceil((150 / 18) * longestName);
		const nodeMarginLeft = 10;
		const nodePaddingLeft = 10;
		const nodeBorder = 1;
		const totalNodeWidth = nodeWidth + nodeMarginLeft + nodePaddingLeft + (nodeBorder * 2);
		const nodeHeight = 20;
		const totalNodeHeight = nodeHeight + (nodeBorder * 2);
		const nodePairHeight = totalNodeHeight * 2;
		const nodeMarginTop = 20;

		let html = "<div class='infobox'>";
		html += "<div style='overflow: auto;width: " + ((totalNodeWidth * depths.length) +
			(nodeMarginLeft * (depths.length - 1))) + "px;'>";

		let firstMarginTop = 0;
		let restMarginTop = nodeMarginTop;
		for (let i = 0; i < depths.length; i++) {
			const column = i;
			const matches = matchesByDepth[depths[i]];
			html += "<div style='display: inline-block;vertical-align:top;" + (column ? "margin-left: " + nodeMarginLeft + "px;" : "") +
				"'>";

			if (column) {
				const columnMatches = matches.length;
				const previousColumnMatches = matchesByDepth[depths[column - 1]].length;
				const previousColumnHeight = (previousColumnMatches * nodePairHeight) + ((previousColumnMatches - 1) * restMarginTop);

				firstMarginTop += ((nodePairHeight + restMarginTop) / 2);
				if (previousColumnMatches > columnMatches) {
					restMarginTop = Math.floor((previousColumnHeight - firstMarginTop - (nodePairHeight * (columnMatches - 1))) /
						columnMatches);
				}
			}

			for (let i = 0; i < matches.length; i++) {
				const match = matches[i];
				if (!match.children || !match.children.length) continue;
				let marginTop;
				if (i === 0) {
					marginTop = firstMarginTop;
				} else {
					marginTop = restMarginTop;
				}
				html += "<div style='width: " + totalNodeWidth + "px;" + (marginTop ? "margin-top: " + marginTop + "px;" : "") + "'>";

				html += "<div style='height: " + nodeHeight + "px; width: " + nodeWidth + "px;border: " + nodeBorder +
					"px solid #AAA;padding-left: " + nodePaddingLeft + "px;border-radius: 5px 5px 0 0;'>";

				const playerA = match.children[0].user;
				const playerB = match.children[1].user;
				const winner = match.user;
				if (playerA) {
					const isWinner = winner === playerA;
					if (isWinner) html += "<i>";
					html += "<strong class='username'>" + playerA.name + "</strong>";
					if (isWinner) html += "</i>";
				} else {
					html += !column ? "&nbsp;" : placeholderName;
				}
				html += "</div>";

				html += "<div style='height: " + nodeHeight + "px; width: " + nodeWidth + "px;border: " + nodeBorder +
					"px solid #AAA;padding-left: " + nodePaddingLeft + "px;border-radius: 0 0 5px 5px;'>";

				if (playerB) {
					const isWinner = winner === playerB;
					if (isWinner) html += "<i>";
					html += "<strong class='username'>" + playerB.name + "</strong>";
					if (isWinner) html += "</i>";
				} else {
					html += !column ? "&nbsp;" : placeholderName;
				}

				html += "</div></div>";
			}

			html += "</div>";
		}

		html += "</div></div>";

		return html;
	}

	getMatchesByDepth(): Dict<EliminationNode<Player>[]> {
		const matchesByDepth: Dict<EliminationNode<Player>[]> = {};
		const queue = [{node: this.treeRoot, depth: 0}];
		let item;
		while ((item = queue.shift())) {
			if (!item.node.children) continue;

			if (!matchesByDepth[item.depth]) matchesByDepth[item.depth] = [];
			matchesByDepth[item.depth].push(item.node);

			queue.push({node: item.node.children[0], depth: item.depth + 1});
			queue.push({node: item.node.children[1], depth: item.depth + 1});
		}

		return matchesByDepth;
	}

	disqualifyPlayers(players: Player[]): void {
		if (!this.bracketGenerated) throw new Error("disqualifyUsers() called before bracket generated");

		for (const player of players) {
			player.eliminated = true;
			this.spectatorPlayers.add(player);
			this.disqualifiedPlayers.add(player);

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
			}
		}

		if (!this.ended) this.updateMatches();
	}

	eliminateInactivePlayers(player: Player, opponent: Player, inactivePlayers: Player[]): void {
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

		if (!winner.round) winner.round = 0;
		winner.round++;

		loser.eliminated = true;
		this.spectatorPlayers.add(loser);

		let winnerTeamChanges: ITeamChange[] = [];
		if (this.getRemainingPlayerCount() > 1 && (this.additionsPerRound || this.evolutionsPerRound)) {
			let currentTeamLength: number;
			const addingPokemon = this.additionsPerRound >= 1;
			const droppingPokemon = this.additionsPerRound <= -1;
			if (addingPokemon) {
				currentTeamLength = Math.min(6, this.startingTeamsLength + ((winner.round - 1) * this.additionsPerRound));
			} else if (droppingPokemon) {
				currentTeamLength = Math.min(1, this.startingTeamsLength + ((winner.round - 1) * this.additionsPerRound));
			} else {
				currentTeamLength = this.startingTeamsLength;
			}

			if (!this.additionsPerRound || (addingPokemon && currentTeamLength < 6) || (droppingPokemon && currentTeamLength > 1)) {
				if (!loserTeam) {
					loserTeam = this.getRandomTeam(loser).map(x => x.name);
				} else {
					if ((addingPokemon || droppingPokemon) && loserTeam.length < currentTeamLength) {
						loserTeam = this.getRandomTeamIncluding(loser, loserTeam).map(x => x.name);
					}
				}

				let additions = 0;
				if (addingPokemon) {
					additions = Math.min(6 - currentTeamLength, this.additionsPerRound);
				} else if (droppingPokemon) {
					additions = Math.max(1 - currentTeamLength, this.additionsPerRound);
				}

				winnerTeamChanges.push({
					additions,
					choices: loserTeam,
					evolutions: this.evolutionsPerRound,
				});

				let possibleTeams = this.possibleTeams.get(winner)!;
				possibleTeams = Dex.getPossibleTeams(possibleTeams, loserTeam, additions, this.evolutionsPerRound,
					this.requiredAddition, this.requiredEvolution);
				this.possibleTeams.set(winner, possibleTeams);
			}
		}

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
					this.room.title + "! Please send me the link to the battle or leave your pending challenge up. Activity will be " +
					"checked again in " + Tools.toDurationString(this.activityDQTimeout) + ".";

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

		const bracketHtml = this.getBracketHtml();
		if (bracketHtml !== this.bracketHtml) {
			this.bracketHtml = bracketHtml;
			this.updateHtmlPages();
		}
	}

	getPokemonIcons(pokemon: string[]): string[] {
		return pokemon.map(x => Dex.getPokemonIcon(Dex.getExistingPokemon(x)) + x);
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
			html += "<h3>Rules</h3><ul>";
			html += "<li>All Pokemon (including formes), moves, abilities, and items not banned in " + this.battleFormat.name + " can " +
				"be used</li>";
			if (!this.allowsScouting) html += "<li>Scouting is not allowed</li>";
			html += "</ul><hr />";
		}

		if (this.started && !this.tournamentEnded) {
			if (player.eliminated) {
				html += "<h3>You were eliminated!</h3><div style='margin-left: 15px'>";
				if (this.spectatorPlayers.has(player)) {
					html += "You are currently still receiving updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
				} else {
					html += "You will no longer receive updates for this tournament. " +
						Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
				}
				html += "</div>";
			} else {
				html += "<h3>Opponent (round " + (player.round || 1) + ")</h3><div style='margin-left: 15px'>";
				const opponent = this.playerOpponents.get(player);
				if (opponent) {
					html += "Your next opponent is <strong class='username'>" + opponent.name + "</strong> (click their name and then " +
						"\"Challenge\")! Once the battle starts, send " + Users.self.name + " the link or type <code>/invite " +
						Users.self.name + "</code> into the battle chat.";
				} else {
					html += "Your next opponent has not been decided yet!";
				}
				html += "</div>";
			}
			html += "<hr />";
		}

		html += "<h3>Pokemon</h3><div style='margin-left: 15px'>";
		const starterPokemon = this.starterPokemon.get(player)!;
		if (this.cloakedPokemon) {
			html += "<b>The Pokemon to protect in battle ";
			if (this.tournamentEnded) {
				html += (this.cloakedPokemon.length === 1 ? "was" : "were");
			} else {
				html += (this.cloakedPokemon.length === 1 ? "is" : "are");
			}
			html += "</b>:<br />" + this.getPokemonIcons(this.cloakedPokemon).join("<br />");
			if (!this.tournamentEnded && this.cloakedPokemon.length < 6) {
				html += "<br />You may add any Pokemon to fill your team as long as they are usable in " + this.battleFormat.name + ".";
			}
		} else {
			html += "<b>" + (this.sharedTeams ? "The" : "Your") + " " +
				(this.additionsPerRound || this.evolutionsPerRound ? "starting " : "") +
				(this.startingTeamsLength === 1 ? "Pokemon" : "team") + " " + (this.tournamentEnded ? "was" : "is") + "</b>:";
			html += "<br />" + this.getPokemonIcons(starterPokemon).join("<br />");
			if (this.canReroll && !this.rerolls.has(player)) {
				html += "<br />If you are not satisfied, you have 1 chance to reroll but you must keep what you receive!" +
					Client.getPmSelfButton(Config.commandCharacter + "reroll", "Reroll Pokemon");
			}
		}

		const teamChanges = this.teamChanges.get(player);
		if (teamChanges) {
			const rounds: string[] = [];
			for (let i = 0; i < teamChanges.length; i++) {
				const teamChange = teamChanges[i];
				let roundChanges = '';
				if (teamChange.additions >= 1) {
					roundChanges += "<li>";
					if (teamChange.choices.length <= teamChange.additions) {
						roundChanges += (this.tournamentEnded ? "Added" : "Add") + " the following to your team:";
					} else {
						roundChanges += (this.tournamentEnded ? "Chose" : "Choose") + " " + teamChange.additions + " of the following " +
							"to add to your team:";
					}
					roundChanges += "<br />" + Tools.joinList(this.getPokemonIcons(teamChange.choices), undefined, undefined, "or") +
						"</li>";
				} else if (teamChange.additions <= -1) {
					const amount = teamChange.additions * -1;
					roundChanges += "<li>" + (this.tournamentEnded ? "Removed" : "Remove") + " " + amount + " " +
						"member" + (amount > 1 ? "s" : "") + " from your team</li>";
				}

				if (teamChange.evolutions) {
					const amount = Math.abs(teamChange.evolutions);
					roundChanges += "<li>" + (this.tournamentEnded ? "Chose" : "Choose") + " " + amount + " " +
						"member" + (amount > 1 ? "s" : "") + " of your " + (teamChange.additions ? "updated " : "") + "team to " +
						(teamChange.evolutions >= 1 ? "evolve" : "de-volve") + "</li>";
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
			}
		}
		html += "</div><hr />";

		html += "<h3>" + (this.tournamentEnded ? "Final bracket" : "Bracket") + "</h3><div style='margin-left: 15px'>" +
			(this.bracketHtml || "(TBD)") + "</div>";

		return html;
	}

	updatePlayerHtmlPage(player: Player): void {
		player.sendHtmlPage(this.getPlayerHtmlPage(player));
	}

	updatePlayerHtmlPages(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated && !this.spectatorPlayers.has(this.players[i])) continue;
			this.updatePlayerHtmlPage(this.players[i]);
		}
	}

	getSpectatorHtmlPage(user: User): string {
		let html = "";

		if (this.tournamentEnded) {
			html += "<h3>The tournament has ended!</h3><hr />";
		} else {
			html += "<h3>Rules</h3><ul>";
			html += "<li>All Pokemon (including formes), moves, abilities, and items not banned in " + this.battleFormat.name + " can " +
				"be used</li>";
			if (!this.allowsScouting) html += "<li>Scouting is not allowed</li>";
			html += "</ul><hr />";
		}

		if (this.started && !this.tournamentEnded) {
			html += "<h3>Spectating</h3><div style='margin-left: 15px'>";
			if (this.spectatorUsers.has(user.id)) {
				html += "You are currently receiving updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "stoptournamentupdates", "Stop updates");
			} else {
				html += "You will no longer receive updates for this tournament. " +
					Client.getPmSelfButton(Config.commandCharacter + "resumetournamentupdates", "Resume updates");
			}
			html += "</div><hr />";
		}

		html += "<h3>" + (this.tournamentEnded ? "Final bracket" : "Bracket") + "</h3><div style='margin-left: 15px'>" +
			(this.bracketHtml || "(TBD)") + "</div>";

		return html;
	}

	updateSpectatorHtmlPage(user: User): void {
		this.room.sendHtmlPage(user, this.baseHtmlPageTitle, this.htmlPageHeader + this.getSpectatorHtmlPage(user));
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
		};
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

	getStartingTeam(): IPokemon[] {
		const team: IPokemon[] = [];
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

		this.possibleTeams.set(player, [team]);
		const teamSpecies = team.map(x => x.name);
		this.starterPokemon.set(player, teamSpecies);
		this.updatePlayerHtmlPage(player);
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
		const minimumPlayers = 16;
		let minimumPokemon: number;
		if (this.sharedTeams || this.usesCloakedPokemon) {
			minimumPokemon = this.startingTeamsLength;
		} else {
			minimumPokemon = minimumPlayers * this.startingTeamsLength;
			// potential byes
			if (this.additionsPerRound >= 1) minimumPokemon += ((minimumPlayers - 2) * this.additionsPerRound);
		}

		let pokedex: IPokemon[];
		if (this.variant === 'monocolor') {
			const colors = this.shuffle(Object.keys(Dex.data.colors));
			this.color = colors[0];
			colors.shift();
			pokedex = this.createPokedex();
			while (pokedex.length < minimumPokemon || this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!colors.length) throw new Error("No color has at least " + minimumPokemon + " Pokemon");
				this.color = colors[0];
				colors.shift();
				pokedex = this.createPokedex();
			}
			this.tournamentName = "Mono-" + this.color + " " + this.baseTournamentName;
		} else if (this.variant === 'monotype') {
			const types = this.shuffle(Dex.data.typeKeys);
			this.type = Dex.getExistingType(types[0]).name;
			types.shift();
			pokedex = this.createPokedex();
			while (pokedex.length < minimumPokemon || this.getMaxPlayers(pokedex.length) < minimumPlayers) {
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
			while (pokedex.length < minimumPokemon || this.getMaxPlayers(pokedex.length) < minimumPlayers) {
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
			this.tournamentName = this.format.nameWithOptions || this.format.name;
		}

		this.pokedex = this.shuffle(pokedex);
		this.htmlPageHeader = "<h2>" + this.room.title + "'s " + this.tournamentName + "</h2>";

		if (this.usesCloakedPokemon) {
			this.cloakedPokemon = this.pokedex.slice(0, this.startingTeamsLength).map(x => x.name);
			this.requiredPokemon = this.cloakedPokemon.slice();
		} else {
			const maxPlayers = this.getMaxPlayers(this.pokedex.length);
			if (maxPlayers < this.maxPlayers) this.maxPlayers = maxPlayers;
		}

		this.playerCap = this.maxPlayers;

		this.startAdvertisements();
		this.sayCommand("/notifyrank all, " + this.room.title + " " + Users.self.name + " tournament," + this.name + "," + Users.self.name +
			" is hosting a " + this.name + " tournament");
	}

	startAdvertisements(): void {
		this.postSignups();
		const intervalTime = 60 * 1000;
		const halfAdvertisementTime = ADVERTISEMENT_TIME / 2;
		this.advertisementInterval = setInterval(() => {
			this.totalAdvertisementTime += intervalTime;
			if (this.totalAdvertisementTime === halfAdvertisementTime) {
				const cap = Math.floor(this.playerCap / 2);
				if (this.playerCount >= cap) {
					return this.endAdvertisements();
				} else if (cap >= 8) {
					this.playerCap = cap;
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

		const matchesByDepth = this.getMatchesByDepth();
		const depths = Object.keys(matchesByDepth).reverse();
		for (let i = 1; i < depths.length; i++) {
			const depth = depths[i];
			for (const match of matchesByDepth[depth]) {
				for (const child of match.children!) {
					if (child.user) this.firstRoundByes.add(child.user);
				}
			}
		}

		this.firstRoundByes.forEach(player => {
			player.round!++;
			if (this.additionsPerRound) {
				const pokemon: IPokemon[] = [];
				const additions = Math.abs(this.additionsPerRound);
				for (let i = 0; i < additions; i++) {
					const mon = this.pokedex.shift();
					if (!mon) throw new Error("Not enough Pokemon for first round bye (" + player.name + ")");
					pokemon.push(mon);
				}

				const teamChange: ITeamChange = {
					additions: this.additionsPerRound,
					choices: pokemon.map(x => x.name),
					evolutions: this.evolutionsPerRound,
				};
				this.teamChanges.set(player, (this.teamChanges.get(player) || []).concat(teamChange));

				let possibleTeams = this.possibleTeams.get(player)!;
				possibleTeams = Dex.getPossibleTeams(possibleTeams, pokemon, this.additionsPerRound, this.evolutionsPerRound,
					this.requiredAddition, this.requiredEvolution);
				this.possibleTeams.set(player, possibleTeams);
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

	onRemovePlayer(player: Player): void {
		if (!this.started) {
			const starterPokemon = this.starterPokemon.get(player);
			if (starterPokemon) {
				for (const pokemon of starterPokemon) {
					this.pokedex.push(Dex.getExistingPokemon(pokemon));
				}
			}
			return;
		}

		this.disqualifyPlayers([player]);
	}

	getTeamEvolutionScore(team: IPokemon[]): number {
		let score = 0;
		for (const pokemon of team) {
			let evolution = pokemon;
			while (evolution.nfe) {
				score++;
				evolution = Dex.getExistingPokemon(evolution.evos[0]);
			}
		}

		return score;
	}

	getRandomTeam(player: Player): IPokemon[] {
		const possibleTeams = this.possibleTeams.get(player)!;
		possibleTeams.sort((a, b) => b.length - a.length);

		const largestLen = possibleTeams[0].length;
		let bestTeams: IPokemon[][] = [];
		for (const team of possibleTeams) {
			if (team.length < largestLen) break;
			bestTeams.push(team);
		}

		if (bestTeams.length > 1) {
			const evolutionScores = new Map<IPokemon[], number>();
			for (const team of bestTeams) {
				evolutionScores.set(team, this.getTeamEvolutionScore(team));
			}
			if (this.evolutionsPerRound < 0) {
				bestTeams.sort((a, b) => evolutionScores.get(b)! - evolutionScores.get(a)!);
			} else {
				bestTeams.sort((a, b) => evolutionScores.get(a)! - evolutionScores.get(b)!);
			}

			const teams: IPokemon[][] = [bestTeams[0]];
			const bestScore = evolutionScores.get(bestTeams[0])!;
			for (const team of bestTeams) {
				const score = evolutionScores.get(team)!;
				if (score > bestScore) break;
				teams.push(team);
			}
			bestTeams = teams;
		}
		return this.sampleOne(bestTeams);
	}

	getRandomTeamIncluding(player: Player, pokemonList: string[]): IPokemon[] {
		const possibleTeams = this.possibleTeams.get(player)!;
		possibleTeams.sort((a, b) => b.length - a.length);
		let team: IPokemon[] | undefined;
		for (const possibleTeam of possibleTeams) {
			let includes = true;
			const currentTeam = possibleTeam.map(x => x.name);
			for (const pokemon of pokemonList) {
				if (!currentTeam.includes(pokemon)) {
					includes = false;
					break;
				}
			}
			if (includes) {
				team = possibleTeam;
				break;
			}
		}

		if (!team) return pokemonList.map(x => Dex.getExistingPokemon(x));
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
		if (!(id in this.players)) return;

		const player = this.players[id];
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
		this.battleData[room.id].slots.set(player, slot);
	}

	onBattlePokemon(room: Room, slot: string, details: string, item: boolean): boolean {
		if (!(room.id in this.battleData)) return false;

		if (!(slot in this.battleData[room.id].remainingPokemon)) this.battleData[room.id].remainingPokemon[slot] = 0;
		this.battleData[room.id].remainingPokemon[slot]++;
		const pokemon = Dex.getPokemon(details.split(',')[0]);
		if (!pokemon) return false;

		if (!(slot in this.battleData[room.id].pokemon)) this.battleData[room.id].pokemon[slot] = [];
		this.battleData[room.id].pokemon[slot].push(pokemon.baseSpecies || pokemon.name);
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

		if (!this.battleRooms.includes(room.id)) this.battleRooms.push(room.id);

		return true;
	}

	onBattleStart(room: Room): boolean {
		const players = this.getPlayersFromBattleData(room);
		if (!players) return false;

		const node = this.findAvailableMatchNode(players[0], players[1]);
		if (!node) throw new Error(this.name + ": no available match for " + players[0].name + " and " + players[1].name);

		const activityTimer = this.activityTimers.get(node);
		if (activityTimer) clearTimeout(activityTimer);
		const checkChallengesTimer = this.checkChallengesTimers.get(node);
		if (checkChallengesTimer) clearTimeout(checkChallengesTimer);

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

		if (!this.ended) {
			this.updateMatches();
		}
	}

	onBattleExpire(room: Room): void {
		const players = this.getPlayersFromBattleData(room);
		if (players) this.disqualifyPlayers(players);
	}

	cleanupTimers(): void {
		if (this.advertisementInterval) clearInterval(this.advertisementInterval);

		this.activityTimers.forEach((timeout, match) => {
			clearTimeout(timeout);
		});
	}

	onEnd(): void {
		this.tournamentEnded = true;
		this.bracketHtml = this.getBracketHtml();
		this.updateHtmlPages();

		const winner = this.getFinalPlayer();
		if (winner) {
			this.say("Congratulations to **" + winner.name + "** for winning the " + this.name + " tournament!");
		} else {
			this.say("Both finalists were disqualified so no one wins the " + this.name + " tournament!");
		}
	}

	onForceEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.players[i].sendHtmlPage("<h3>The tournament was forcibly ended!</h3>");
		}
	}
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

			const battle = Tools.getBattleUrl(target);
			if (!battle) {
				user.say("Please specify a valid battle link.");
				return false;
			}
			if (battle in this.battleData) {
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
				this.pokedex.push(Dex.getExistingPokemon(pokemon));
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

export const game: IGameTemplateFile<EliminationTournament> = {
	category: 'elimination-tournament' as GameCategory,
	commandDescriptions: [Config.commandCharacter + 'check [battle link]'],
	commands,
};
