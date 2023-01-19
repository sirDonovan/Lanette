import type { BattleEliminationPage } from "../../html-pages/activity-pages/battle-elimination";
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

export interface ITeamChange {
	readonly additions: number;
	readonly choices: readonly string[] | undefined;
	readonly drops: number;
	readonly evolutions: number;
}

export interface IRoundTeamRequirements {
	additionsThisRound: number;
	currentTeamLength: number;
	dropsThisRound: number;
	evolutionsThisRound: number;
}

export const DEFAULT_BATTLE_FORMAT_ID = 'gen9ou';

const REROLL_COMMAND = "reroll";
const TOUR_PAGE_COMMAND = "tourpage";
const HTML_PAGE_COMMAND = "battleeliminationhtmlpage";
const REROLL_START_DELAY = 30 * 1000;
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
	allowsSingleStage: boolean = false;
	availableMatchNodes: EliminationNode<Player>[] = [];
	banlist: string[] = [];
	battleFormatId: string = DEFAULT_BATTLE_FORMAT_ID;
	battleFormatType: GameType = 'singles';
	readonly battleData = new Map<Room, IBattleGameData>();
	readonly battleRooms: string[] = [];
	canChangeFormat: boolean = false;
	canRejoin: boolean = false;
	canReroll: boolean = false;
	checkedBattleRooms: string[] = [];
	checkChallengesTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	checkChallengesInactiveTimers = new Map<EliminationNode<Player>, NodeJS.Timer>();
	color: string | null = null;
	creatingSubRoom: boolean = false;
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
	htmlPages = new Map<Player, BattleEliminationPage>();
	htmlPageCommand: string = HTML_PAGE_COMMAND;
	internalGame = true;
	leftBeforeEliminationStarted: Player[] = [];
	maxPlayers: number = POTENTIAL_MAX_PLAYERS[POTENTIAL_MAX_PLAYERS.length - 1];
	minPlayers: number = 4;
	maxTeamSize: number = 6;
	minTeamSize: number = 1;
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
	requiredDoublesTier: string | null = null;
	rulesHtml: string = "";
	sameRoomSubRoom: boolean = false;
	sharedTeams: boolean = false;
	spectatorPlayers = new Set<Player>();
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
	validateTeams: boolean = true;

	// set in onInitialize
	battleFormat!: IFormat;

	declare readonly room: Room;

	validateInputProperties(inputProperties: IGameInputProperties): boolean {
		const baseFormat = Dex.getExistingFormat(this.battleFormatId);

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

			this.battleFormatId = battleFormat.inputTarget;
			try {
				this.setFormat();
				this.generatePokedex();
			} catch (e) {
				this.say("Unable to generate enough valid Pokemon for the format " + battleFormat.name + ".");
				return false;
			}
		}

		const customRules = this.getGameCustomRules ? this.getGameCustomRules() : [];
		const inputRules: string[] = [];
		const battleFormatIdBeforeRules = this.battleFormatId;

		if (inputProperties.options.rules) {
			if (!this.canChangeFormat) {
				this.say("You cannot change the rules for " + this.format.nameWithOptions + ".");
				return false;
			}

			const resolved = Dex.resolveCustomRuleAliases(inputProperties.options.rules.split("|"));
			for (const rule of resolved) {
				if (!customRules.includes(rule)) {
					customRules.push(rule);
					inputRules.push(rule);
				}
			}

			let formatid = Dex.joinNameAndCustomRules(this.battleFormatId, customRules);
			try {
				formatid = Dex.validateFormat(formatid);
			} catch (e) {
				this.say("Error setting custom rules: " + (e as Error).message);
				return false;
			}

			this.battleFormatId = formatid;
			try {
				this.setFormat();
				this.generatePokedex();
			} catch (e) {
				this.say("Unable to generate enough valid Pokemon for the format " + Dex.getExistingFormat(this.battleFormatId).name +
					" with custom rules.");
				return false;
			}
		} else if (customRules.length) {
			let formatid = Dex.joinNameAndCustomRules(this.battleFormatId, customRules);
			try {
				formatid = Dex.validateFormat(formatid);
			} catch (e) {
				this.say("Error setting custom rules: " + (e as Error).message);
				return false;
			}

			this.battleFormatId = formatid;
		}

		const battleFormat = Dex.getExistingFormat(this.battleFormatId);
		if (battleFormat.gameType !== this.battleFormatType) {
			this.say("You can only change the format to another " + this.battleFormatType + " format.");
			return false;
		}

		if (battleFormat.team) {
			this.say("You cannot change the format to one that uses generated teams.");
			return false;
		}

		const ruleTable = Dex.getRuleTable(battleFormat);
		if (!ruleTable.has("teampreview")) {
			this.say("You can only change the format to one that has Team Preview.");
			return false;
		}

		const oneVsOne = !this.usesCloakedPokemon && this.startingTeamsLength === 1 && !this.additionsPerRound;
		const twoVsTwo = !this.usesCloakedPokemon && this.startingTeamsLength === 2 && !this.additionsPerRound;
		const threeVsThree = !this.usesCloakedPokemon && this.startingTeamsLength === 3 && !this.additionsPerRound;

		if (!this.usesCloakedPokemon && ruleTable.minTeamSize > this.startingTeamsLength) {
			this.say("You can only change the format to one that allows bringing only " + this.startingTeamsLength + " Pokemon.");
			return false;
		}

		if (threeVsThree) {
			if (ruleTable.maxTeamSize < 3) {
				this.say("You can only change the format to one that allows bringing 3 or more Pokemon.");
				return false;
			}
		} else if (twoVsTwo) {
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
		} else if (threeVsThree) {
			if (ruleTable.pickedTeamSize && ruleTable.pickedTeamSize !== 3) {
				this.say("You can only change the format to one that requires battling with 3 Pokemon.");
				return false;
			}
		} else {
			if (ruleTable.pickedTeamSize) {
				this.say("You can only change the format to one that allows battling with a variable number of Pokemon.");
				return false;
			}
		}

		const inputRulesFormat = Dex.getFormat(Dex.joinNameAndCustomRules(battleFormatIdBeforeRules, inputRules));
		if (inputRulesFormat) {
			let baseName = this.format.nameWithOptions;
			if (inputRulesFormat.name !== baseFormat.name) {
				baseName += ": " + (inputRulesFormat.gen && inputRulesFormat.gen !== Dex.getGen() ? "Gen " +
					inputRulesFormat.gen + " " : "") + inputRulesFormat.nameWithoutGen;
			}

			const customFormatName = Dex.getCustomFormatName(inputRulesFormat, false, baseName);
			if (inputRules.length && customFormatName !== inputRulesFormat.name && customFormatName !== inputRulesFormat.customFormatName) {
				this.format.nameWithOptions = customFormatName;
			} else {
				this.format.nameWithOptions = baseName;
			}
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
		this.setRulesHtml();

		this.debugLog("getPossibleTeamsOptions: " + JSON.stringify(this.getPossibleTeamsOptions()));
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

	createBasePokedex(): string[] {
		const dex = Dex.getDex(this.battleFormat.mod);
		const teamPreviewHiddenFormes = Dex.getTeamPreviewHiddenFormes();
		const fullyEvolved = this.fullyEvolved || (this.evolutionsPerRound < 1 && !this.usesCloakedPokemon);
		const checkEvolutions = this.evolutionsPerRound !== 0;
		const deEvolution = this.evolutionsPerRound < 0;

		const pokedex: IPokemon[] = [];

		outer:
		for (const name of dex.getData().pokemonKeys) {
			const pokemon = dex.getExistingPokemon(name);
			if (!this.meetsPokemonCriteria(pokemon, 'starter', teamPreviewHiddenFormes)) continue;

			if (this.gen && pokemon.gen !== this.gen) continue;
			if (this.color && pokemon.color !== this.color) continue;

			if (this.requiredTier) {
				if (pokemon.tier !== this.requiredTier) continue;
			} else if (this.requiredDoublesTier) {
				if (pokemon.doublesTier !== this.requiredDoublesTier) continue;
			} else if (fullyEvolved) {
				if ((!pokemon.prevo && !this.allowsSingleStage) || pokemon.nfe ||
					(pokemon.forme && dex.getExistingPokemon(pokemon.baseSpecies).nfe)) continue;
			} else {
				if (pokemon.prevo || !pokemon.nfe) continue;
			}

			if (checkEvolutions) {
				// filter out formes such as battleOnly that don't have a prevo and give an advantage
				if (deEvolution && pokemon.prevo) {
					const formes = dex.getFormes(pokemon, true);
					for (const forme of formes) {
						if (!dex.getExistingPokemon(forme).prevo) continue outer;
					}
				}

				const evolutionLines = dex.getEvolutionLines(pokemon);
				let validEvolutionLines = evolutionLines.length;
				for (const line of evolutionLines) {
					let validLine = true;
					for (const stage of line) {
						const evolution = dex.getExistingPokemon(stage);
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

		const pokedexNames = pokedex.map(x => x.name);
		return pokedex.filter(x => !(x.forme && pokedexNames.includes(dex.getExistingPokemon(x.baseSpecies).name))).map(x => x.name);
	}

	generateBracket(players?: Player[]): void {
		let tree: IEliminationTree<Player> | null = null;

		if (!players) players = this.shufflePlayers();

		this.debugLog("Generating bracket with the following players (" + players.length + "): " + players.map(x => x.name).join(", "));

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

		const firstRoundByeNames: string[] = [];
		this.firstRoundByes.forEach(player => {
			if (this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound) {
				firstRoundByeNames.push(player.name);

				const requirements = this.getRoundTeamRequirements(player.round!);

				const pokemon: string[] = [];
				for (let i = 0; i < requirements.additionsThisRound; i++) {
					const mon = this.pokedex.shift();
					if (!mon) throw new Error("Not enough Pokemon for first round bye (" + player.name + ")");
					pokemon.push(mon);
				}

				const teamChange: ITeamChange = {
					additions: requirements.additionsThisRound,
					choices: pokemon,
					drops: requirements.dropsThisRound,
					evolutions: requirements.evolutionsThisRound,
				};

				this.debugLog(player.name + " first round bye team changes: " + JSON.stringify(teamChange));
				this.teamChanges.set(player, (this.teamChanges.get(player) || []).concat([teamChange]));

				this.firstRoundByeAdditions.set(player, pokemon);
				this.updatePossibleTeams(player, pokemon);

				player.round!++;
				this.updateTeamChangesHtml(player);

				this.debugLog(player.name + " new possible teams after bye: " +
					JSON.stringify(this.possibleTeams.get(player)!.join(" | ")));

				if (!player.eliminated) {
					player.say("You were given a first round bye so check the tournament page for additional team changes!");
				}
			} else {
				player.round!++;
			}

			const htmlPage = this.getHtmlPage(player);
			htmlPage.syncRound();
			htmlPage.send();
		});

		this.updateMatches(true);

		if (firstRoundByeNames.length) {
			const text = "**First round byes** (check your tournament pages): " + firstRoundByeNames.join(", ");
			if (this.subRoom) {
				this.subRoom.say(text);
			} else {
				this.say(text);
			}
		}
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

		this.htmlPages.forEach(page => {
			page.setBracketHtml(html);
		});
	}

	getMatchesByRound(): Dict<EliminationNode<Player>[]> {
		if (!this.treeRoot) throw new Error("getMatchesByRound() called before bracket generated");

		const matchesByRound: Dict<EliminationNode<Player>[]> = {};
		for (let i = 1; i <= this.totalRounds; i++) {
			matchesByRound[i] = [];
		}

		const allNodes: EliminationNode<Player>[] = [this.treeRoot];
		const queue: {node: EliminationNode<Player>, round: number}[] = [{node: this.treeRoot, round: this.totalRounds}];
		// queue is only unique items due to allNodes
		while (queue.length) {
			const item = queue.shift();
			if (!item || !item.node.children) continue;

			matchesByRound[item.round].push(item.node);

			if (!allNodes.includes(item.node.children[0])) {
				allNodes.push(item.node.children[0]);
				queue.push({node: item.node.children[0], round: item.round - 1});
			}

			if (!allNodes.includes(item.node.children[1])) {
				allNodes.push(item.node.children[1]);
				queue.push({node: item.node.children[1], round: item.round - 1});
			}
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
			const reason = playersAndReasons.get(player)!;
			this.debugLog(player.name + " DQed for: " + reason);

			player.eliminated = true;
			this.disqualifiedPlayers.set(player, reason);
			this.playerOpponents.delete(player);

			const battleRoom = this.playerBattleRooms.get(player);
			if (battleRoom) battleRoom.leave();

			if (this.subRoom && !this.tournamentDisqualifiedPlayers.includes(player)) {
				this.tournamentDisqualifiedPlayers.push(player);
				this.subRoom.disqualifyFromTournament(player.name);
			}

			const node = this.findPlayerMatchNode(player);
			if (node) {
				let winner: Player;
				if (node.children![0].user === player) {
					winner = node.children![1].user!;
				} else {
					winner = node.children![0].user!;
				}

				this.disqualifiedOpponents.set(winner, player);

				this.debugLog(winner.name + " won by DQ against " + player.name);
				const teamChanges = this.setMatchResult(node, winner);
				if (this.ended) break;

				if (!players.includes(winner)) {
					this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));

					if (!winners.includes(winner)) winners.push(winner);
				}
			} else {
				this.debugLog(player.name + " was DQed with no current opponent");
			}
		}

		if (!this.ended) {
			for (const winner of winners) {
				this.updateTeamChangesHtml(winner);

				const htmlPage = this.getHtmlPage(winner);
				htmlPage.syncRound();
				htmlPage.send();
			}

			for (const player of players) {
				this.sendHtmlPage(player);
			}

			this.updateMatches();
		}
	}

	eliminateInactivePlayers(player: Player, opponent: Player, inactivePlayers: Player[]): void {
		const node = this.findPlayerMatchNode(player, opponent);
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

	getRoundTeamRequirements(round: number): IRoundTeamRequirements {
		let currentTeamLength: number;
		const roundTeamLengthChange = this.additionsPerRound - this.dropsPerRound;
		const previousRounds = round - 1;
		if (roundTeamLengthChange > 0) {
			currentTeamLength = Math.min(this.maxTeamSize, this.startingTeamsLength + (previousRounds * roundTeamLengthChange));
		} else if (roundTeamLengthChange < 0) {
			currentTeamLength = Math.max(this.minTeamSize, this.startingTeamsLength - (previousRounds * Math.abs(roundTeamLengthChange)));
		} else {
			currentTeamLength = this.startingTeamsLength;
		}

		let dropsThisRound = this.dropsPerRound;
		let additionsThisRound = this.additionsPerRound;
		while (dropsThisRound && currentTeamLength + additionsThisRound - dropsThisRound < this.minTeamSize) {
			dropsThisRound--;
		}

		while (additionsThisRound && currentTeamLength + additionsThisRound - dropsThisRound > this.maxTeamSize) {
			additionsThisRound--;
		}

		return {
			additionsThisRound,
			currentTeamLength,
			dropsThisRound,
			evolutionsThisRound: this.evolutionsPerRound,
		};
	}

	setMatchResult(node: EliminationNode<Player>, winner: Player, loserTeam?: string[]): ITeamChange[] {
		if (node.state !== 'available' || !node.children || !node.children[0].user || !node.children[1].user) {
			throw new Error("setMatchResult() called with unavailable node");
		}

		const p1 = node.children[0].user;
		const p2 = node.children[1].user;

		const winnerP1 = winner === p1;
		const loser = winnerP1 ? p2 : p1;

		this.clearNodeTimers(node);

		this.playerOpponents.delete(p1);
		this.playerOpponents.delete(p2);

		this.playerBattleRooms.delete(p1);
		this.playerBattleRooms.delete(p2);

		node.state = 'finished';
		node.result = winnerP1 ? 'win' : 'loss';
		node.score = winnerP1 ? [1, 0] : [0, 1];
		node.user = winner;

		loser.eliminated = true;

		let winnerTeamChanges: ITeamChange[] = [];
		if (this.getRemainingPlayerCount() > 1 && (this.additionsPerRound || this.dropsPerRound || this.evolutionsPerRound)) {
			const requirements = this.getRoundTeamRequirements(winner.round!);
			if (requirements.additionsThisRound || requirements.dropsThisRound || requirements.evolutionsThisRound) {
				if (requirements.additionsThisRound) {
					if (!loserTeam) {
						loserTeam = this.getRandomTeam(loser);
						this.debugLog(winner.name + " choices from " + loser.name + "'s team (random): " + loserTeam.join(", "));
					} else {
						if (loserTeam.length < requirements.currentTeamLength) {
							const originalTeam = loserTeam;
							loserTeam = this.getRandomTeamIncluding(loser, loserTeam);

							this.debugLog(winner.name + " choices from " + loser.name + "'s team (random including " +
								originalTeam.join(", ") + "): " + loserTeam.join(", "));
						} else {
							this.debugLog(winner.name + " choices from " + loser.name + "'s team: " + loserTeam.join(", "));
						}
					}
				}

				const teamChanges: ITeamChange = {
					additions: requirements.additionsThisRound,
					choices: loserTeam,
					drops: requirements.dropsThisRound,
					evolutions: requirements.evolutionsThisRound,
				};

				this.debugLog(winner.name + " team changes round " + winner.round + ": " + JSON.stringify(teamChanges));
				winnerTeamChanges.push(teamChanges);

				this.updatePossibleTeams(winner, loserTeam, teamChanges);

				this.debugLog(winner.name + " new possible teams after win : " +
					JSON.stringify(this.possibleTeams.get(winner)!.join(" | ")));
			}
		}

		winner.round!++;

		if (node.parent) {
			const userA = node.parent.children![0].user;
			const userB = node.parent.children![1].user;
			if (userA && userB) {
				node.parent.state = 'available';

				if (userA.eliminated) {
					this.debugLog(userB.name + " automatic win against " + userA.name);
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult(node.parent, userB));
				} else if (userB.eliminated) {
					this.debugLog(userA.name + " automatic win against " + userB.name);
					winnerTeamChanges = winnerTeamChanges.concat(this.setMatchResult(node.parent, userA));
				}
			}
		}

		if (!this.ended && this.getRemainingPlayerCount() < 2) {
			this.eliminationEnded = true;
			this.end();
		}

		if (!this.ended) {
			this.updatePlayerOpponentHtml(winner);
			this.updatePlayerOpponentHtml(loser);
		}

		return winnerTeamChanges;
	}

	updateMatches(onStart?: boolean): void {
		const playersToHighlight: Player[] = [];

		const nodes = this.getAvailableMatchNodes();
		for (const node of nodes) {
			if (this.availableMatchNodes.includes(node)) continue;
			this.availableMatchNodes.push(node);

			const player = node.children![0].user!;
			const opponent = node.children![1].user!;

			this.debugLog("New available match: " + player.name + " VS. " + opponent.name);

			this.playerOpponents.set(player, opponent);
			this.playerOpponents.set(opponent, player);

			this.updatePlayerOpponentHtml(player);
			this.updatePlayerOpponentHtml(opponent);

			if (!this.subRoom) {
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
					}, this.activityDQTimeout);
					this.activityTimers.set(node, dqTimeout);
				}, activityWarning);
				this.activityTimers.set(node, warningTimeout);
			}

			if (!onStart) {
				if (!player.eliminated) playersToHighlight.push(player);
				if (!opponent.eliminated) playersToHighlight.push(opponent);
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
			this.updateBracketHtml();
		}

		this.updateHtmlPages();

		const notificationTitle = "New " + this.name + " opponent!";
		for (const player of playersToHighlight) {
			player.sendHighlight(notificationTitle);
		}
	}

	getPokemonIcons(pokemon: readonly string[]): string[] {
		return pokemon.map(x => Dex.getPokemonIcon(Dex.getExistingPokemon(x)) + x);
	}

	setRulesHtml(): void {
		let html = "<h3>Rules</h3><ul>";
		html += "<li>Battles must be played in <b>" + this.battleFormat.name + "</b> (all Pokemon, moves, abilities, and items " +
			"not banned can be used).</li>";
		html += "<li>You can change Pokemon between formes and regional variants at any time.</li>";
		if (!this.allowsScouting && !this.subRoom) html += "<li>Do not join other tournament battles!</li>";
		if (!this.usesCloakedPokemon && !this.sharedTeams) {
			html += "<li>Do not reveal your or your opponents' " + (this.startingTeamsLength === 1 ? "starters" : "teams") + " in " +
				"the chat!</li>";
		}
		html += "</ul>";

		this.rulesHtml = html;

		this.htmlPages.forEach(page => {
			page.setRulesHtml(html);
		});
	}

	createHtmlPage(player: Player): BattleEliminationPage {
		if (this.htmlPages.has(player)) return this.htmlPages.get(player)!;

		const page = new (CommandParser.getGameHtmlPages().battleElimination)(this, player, this.htmlPageCommand, {
			customBox: this.getPlayerOrPickedCustomBox(player),
			gen: this.battleFormat.gen,
			rerollCommand: REROLL_COMMAND,
			rulesHtml: this.rulesHtml,
			showBracket: !this.subRoom,
			pageName: this.htmlPageGameName,
		});

		this.htmlPages.set(player, page);

		return page;
	}

	getHtmlPage(player: Player): BattleEliminationPage {
		return this.htmlPages.get(player) || this.createHtmlPage(player);
	}

	updateHtmlPages(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated && !this.spectatorPlayers.has(this.players[i])) continue;
			this.sendHtmlPage(this.players[i]);
		}
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

	playerCanReroll(player: Player): boolean {
		if (!this.pokedex.length || this.rerolls.has(player) || !this.starterPokemon.has(player) || this.playerBattleRooms.has(player) ||
			(player.round! > 1 && !(this.firstRoundByes.has(player) && player.round === 2))) return false;

		return true;
	}

	giveStartingTeam(player: Player): void {
		const team: readonly string[] = this.getStartingTeam().filter(x => !!x);
		if (team.length < this.startingTeamsLength) throw new Error("Out of Pokemon to give (" + player.name + ")");

		this.starterPokemon.set(player, team);

		const formeCombinations = Dex.getFormeCombinations(team, this.battleFormat.usablePokemon);

		if (this.usesCloakedPokemon) {
			this.playerRequiredPokemon.set(player, formeCombinations);
			this.debugLog(player.name + " cloaked Pokemon: " + JSON.stringify(formeCombinations.join(" | ")));
		} else {
			this.possibleTeams.set(player, formeCombinations);

			if (this.firstRoundByeAdditions.has(player)) {
				this.updatePossibleTeams(player, this.firstRoundByeAdditions.get(player));
			}

			this.debugLog(player.name + " possible starting teams" + (this.rerolls.has(player) ? " (reroll)" : "") +
				(this.firstRoundByeAdditions.has(player) ? " (with bye)" : "") + ": " +
				JSON.stringify(this.possibleTeams.get(player)!.join(" | ")));
		}

		this.updateTeamChangesHtml(player);

		const htmlPage = this.getHtmlPage(player);
		htmlPage.giveStartingTeam();
		htmlPage.send();
	}

	updatePlayerOpponentHtml(player: Player): void {
		let html = "";
		if (this.started && !this.eliminationEnded) {
			if (player.eliminated) {
				html += "<h3>Updates</h3>";

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
				html += "<h3>Opponent</h3>";
				const opponent = this.playerOpponents.get(player);
				if (opponent) {
					html += "Your round " + player.round + " opponent is <strong class='username'><username>" + opponent.name +
						"</username></strong>!";
					if (!this.subRoom) {
						html += "<br /><br />To challenge them, click their username, click \"Challenge\", select " +
							this.battleFormat.name + " as the format, and select the team you built for this tournament. Once the " +
							"battle starts, send <strong class='username'><username>" + Users.self.name + "</username></strong> the " +
							"link or type <code>/invite " + Users.self.name + "</code> into the battle chat!";
					}
					html += "<br /><br />If " + opponent.name + " is offline or not accepting your challenge, you will be " +
						"advanced automatically after some time!";
				} else {
					html += "Your next opponent has not been decided yet!";
				}
			}
		}

		const htmlPage = this.getHtmlPage(player);
		htmlPage.setOpponentHtml(html);
	}

	updateTeamChangesHtml(player: Player): void {
		let html = "";
		const pastTense = this.eliminationEnded || player.eliminated;
		const starterPokemon = this.starterPokemon.get(player);
		if (starterPokemon) {
			html += "<h3>Your Team</h3>";

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
				if (this.canReroll && this.playerCanReroll(player)) {
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
					roundChanges += "<li>" + (player.eliminated ? "Removed" : "Remove") + " " + teamChange.drops + " " +
						"member" + (teamChange.drops > 1 ? "s" : "") + " from your team</li>";
				}

				if (teamChange.additions) {
					roundChanges += "<li>";
					const addAll = teamChange.choices!.length <= teamChange.additions;
					if (addAll) {
						roundChanges += (player.eliminated ? "Added" : "Add") + " the following to your team:";
					} else {
						roundChanges += (player.eliminated ? "Chose" : "Choose") + " " + teamChange.additions + " of the following " +
							"to add to your team:";
					}
					roundChanges += "<br />" + Tools.joinList(this.getPokemonIcons(teamChange.choices!), undefined, undefined,
						addAll ? "and" : "or") + "</li>";
				}

				if (teamChange.evolutions) {
					const amount = Math.abs(teamChange.evolutions);
					roundChanges += "<li>" + (player.eliminated ? "Chose" : "Choose") + " " + amount + " " +
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

		const htmlPage = this.getHtmlPage(player);
		htmlPage.setAllTeamChangesHtml(html);
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

	updatePossibleTeams(player: Player, pool: string[] | undefined, roundOptions?: Partial<IGetPossibleTeamsOptions>): void {
		const formatDefaultOptions = this.getPossibleTeamsOptions();
		const options = roundOptions ? Object.assign(formatDefaultOptions, roundOptions) : formatDefaultOptions;

		if (!options.additions) options.requiredAddition = false;
		if (!options.drops) options.requiredDrop = false;
		if (!options.evolutions) options.requiredEvolution = false;

		this.possibleTeams.set(player, Dex.getPossibleTeams(this.possibleTeams.get(player)!, pool, options));
	}

	getSignupsHtml(): string {
		let html = "<div class='infobox'><b>" + Users.self.name + " is hosting a " + this.name + " tournament!</b>";
		if (this.htmlPageGameDescription) html += "<br />" + this.htmlPageGameDescription;
		html += "<br /><br />";
		if (this.started) {
			html += "(the tournament has started)";
		} else if (this.subRoom) {
			if (!this.sameRoomSubRoom) {
				html += Client.getCommandButton("/join " + this.subRoom.id, "-> Go to the " +
					(this.subRoom.groupchat ? "groupchat" : "subroom") + " (" + (this.playerCap - this.playerCount) + "/" + this.playerCap +
					" slots remaining)");
			}
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
			pokedex = this.createBasePokedex();

			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!colorKeys.length) throw new Error("No color has at least " + minimumPokemon + " Pokemon");
				this.color = colors[colorKeys[0]];
				colorKeys.shift();
				pokedex = this.createBasePokedex();
			}

			this.htmlPageGameName = "Mono-" + this.color + " " + this.baseHtmlPageGameName;
		} else if (this.monoType) {
			const types = this.shuffle(Dex.getData().typeKeys);
			this.type = Dex.getExistingType(types[0]).name;
			types.shift();
			pokedex = this.createBasePokedex();

			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!types.length) throw new Error("No type has at least " + minimumPokemon + " Pokemon");
				this.type = Dex.getExistingType(types[0]).name;
				types.shift();
				pokedex = this.createBasePokedex();
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
			pokedex = this.createBasePokedex();

			while (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				if (!gens.length) throw new Error("No gen has at least " + minimumPokemon + " Pokemon");
				this.gen = gens[0];
				gens.shift();
				pokedex = this.createBasePokedex();
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
			} else if (this.gen === 9) {
				region = 'Paldea';
			}

			this.htmlPageGameName = "Mono-" + region + " " + this.baseHtmlPageGameName;
		} else {
			pokedex = this.createBasePokedex();
			if (this.getMaxPlayers(pokedex.length) < minimumPlayers) {
				throw new Error(this.battleFormat.name + " does not have at least " + minimumPokemon + " Pokemon");
			}
			this.htmlPageGameName = this.format.nameWithOptions || this.format.name;
		}

		this.pokedex = this.shuffle(pokedex);
	}

	onSignups(): void {
		this.generatePokedex();

		this.htmlPageHeader = "<h2>" + this.room.title + "'s " + this.htmlPageGameName + "</h2><hr />";

		const maxPlayers = this.getMaxPlayers(this.pokedex.length);
		if (maxPlayers < this.maxPlayers) this.maxPlayers = maxPlayers;

		this.playerCap = this.maxPlayers;

		if (!this.creatingSubRoom) this.startAdvertisements();

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
			this.dontAutoCloseHtmlPages = false;
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

		this.sayUhtmlChange(this.uhtmlBaseName + '-signups', this.getSignupsHtml());

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

				this.setTimeout(() => {
					this.canReroll = false;
					this.updateHtmlPages();
				}, REROLL_START_DELAY);
			} else {
				this.setTimeout(() => this.startElimination(), REROLL_START_DELAY);
			}
		} else {
			this.startElimination();
		}
	}

	startElimination(): void {
		this.eliminationStarted = true;

		let html = Users.self.name + "'s " + this.name + " tournament has started! You have " +
			Tools.toDurationString(this.firstRoundTime) + " to build your team and start the first battle.";
		if (!this.subRoom) {
			this.canReroll = false;
			this.updateHtmlPages();

			html += " Please refer to the tournament page on the left for your opponents.";
			html += "<br /><br /><b>Remember that you must PM " + Users.self.name + " the link to each battle</b>! If you cannot copy " +
			"the link, type <code>/invite " + Users.self.name + "</code> into the battle chat.";
		}

		html += "<br /><br />If you accidentally close your tournament page, PM " + Users.self.name + " with the command <code>" +
			Config.commandCharacter + TOUR_PAGE_COMMAND + "</code> to re-open it!";

		if (this.subRoom) {
			this.subRoom.sayHtml(html);
		} else {
			this.sayHtml(html);
		}

		const immediateDqs = new Map<Player, string>();
		for (const i in this.players) {
			if (this.players[i].name.startsWith(Tools.guestUserPrefix) || this.leftBeforeEliminationStarted.includes(this.players[i])) {
				this.players[i].eliminated = true;
				immediateDqs.set(this.players[i], "You left the " + this.name + " tournament.");
			}
		}

		if (!this.subRoom) this.generateBracket();
		this.afterGenerateBracket();

		if (immediateDqs.size) this.disqualifyPlayers(immediateDqs);
	}

	onAddPlayer(player: Player): boolean {
		this.createHtmlPage(player);

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

			this.debugLog("Pokedex before giving " + player.name + " their starting team: " + this.pokedex.join(", "));

			this.giveStartingTeam(player);

			this.debugLog("Pokedex after giving " + player.name + " their starting team: " + this.pokedex.join(", "));

			if (this.canReroll && this.playerCap && this.playerCount >= this.playerCap) {
				player.say("You have " + Tools.toDurationString(REROLL_START_DELAY) + " to decide whether you want to use ``" +
					Config.commandCharacter + REROLL_COMMAND + "`` or keep your team!");
			}
		}

		return true;
	}

	onAddExistingPlayer(player: Player): void {
		if (!this.started) {
			this.sendHtmlPage(player, true);
		}
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
		} else {
			if (!this.leftBeforeEliminationStarted.includes(player)) this.leftBeforeEliminationStarted.push(player);
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

	findPlayerMatchNode(player: Player, opponent?: Player): EliminationNode<Player> | undefined {
		if (!this.treeRoot) throw new Error("findAvailableMatchNode() called before bracket generated");
		if (player === opponent) throw new Error("findAvailableMatchNode() called with duplicate player");

		return this.treeRoot.find(node => {
			if (node.state === 'available') {
				if (!node.children) {
					throw new Error("Node marked available without players");
				}

				if ((node.children[0].user === player || node.children[1].user === player) &&
					(!opponent || node.children[0].user === opponent || node.children[1].user === opponent)) {
					return node;
				}
			}
			return undefined;
		});
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
			const node = this.findPlayerMatchNode(players[0], players[1]);
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

		if (!room.inviteOnlyBattle && this.getRemainingPlayerCount() === 2 && !this.sameRoomSubRoom) {
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
		const node = this.findPlayerMatchNode(winner, loser);
		if (!node) throw new Error("No available match for " + winner.name + " and " + loser.name);

		this.debugLog(winner.name + " won their battle against " + loser.name);
		const teamChanges = this.setMatchResult(node, winner, loserTeam);

		if (!this.ended) {
			this.teamChanges.set(winner, (this.teamChanges.get(winner) || []).concat(teamChanges));
			this.updateTeamChangesHtml(winner);

			const htmlPage = this.getHtmlPage(winner);
			htmlPage.syncRound();
			htmlPage.send();

			this.sendHtmlPage(loser);

			this.updateMatches();
		}
	}

	onBattleExpire(room: Room): void {
		this.checkedBattleRooms.push(room.publicId);

		const players = this.getPlayersFromBattleData(room);
		if (players) {
			this.debugLog("Battle expired for " + players[0].name + " and " + players[1].name);

			const reason = this.getDisqualifyReasonText("for letting your battle expire");
			const playersAndReasons = new Map<Player, string>();
			playersAndReasons.set(players[0], reason);
			playersAndReasons.set(players[1], reason);
			this.disqualifyPlayers(playersAndReasons);
		}
	}

	onBattleTie(room: Room): void {
		const players = this.getPlayersFromBattleData(room);
		if (players) {
			this.debugLog("Battle tied for " + players[0].name + " and " + players[1].name);
		}

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

		if (!this.subRoom) {
			this.updateBracketHtml();
		}

		const now = Date.now();
		const database = Storage.getDatabase(this.room);
		if (!database.lastGameFormatTimes) database.lastGameFormatTimes = {};
		database.lastGameFormatTimes[this.format.id] = now;
		const idWithOptions = Tools.toId(this.format.nameWithOptions);
		if (idWithOptions !== this.format.id) {
			database.lastGameFormatTimes[idWithOptions] = now;
		}

		if (!database.pastTournamentGames) database.pastTournamentGames = [];
		database.pastTournamentGames.unshift({inputTarget: this.format.inputTarget, name: this.format.nameWithOptions, time: now});
		while (database.pastTournamentGames.length > 8) {
			database.pastTournamentGames.pop();
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
				this.addBits(runnerUp, runnerUpPoints, true);
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

			if (winners.length === 1) {
				const buttonRoom = this.room.alias || this.room.id;

				const tournamentPointsShop = Tournaments.hasTournamentPointsShopItems(this.room) ? Client.getQuietPmButton(this.room,
					Config.commandCharacter + "tpshop " + buttonRoom, "Visit the points shop") : "";

				Tournaments.displayTrainerCard(this.room, winners[0].name, "<div class='infobox-limited'><center>" + placesHtml +
				"</center><br />", "<br /><center>" + Client.getQuietPmButton(this.room, Config.commandCharacter + "topbitsprivate " +
				buttonRoom, this.room.title + " leaderboard") + "&nbsp;" +
				Client.getQuietPmButton(this.room, Config.commandCharacter + "topbitsprivate " + buttonRoom + "," + this.format.name,
					this.format.name + " leaderboard") + "&nbsp;" +
				Client.getQuietPmButton(this.room, Config.commandCharacter + "ttc " + buttonRoom,
					"Customize your profile") + tournamentPointsShop + "</center></div>");
			} else {
				this.sayHtml("<div class='infobox-limited'>" + placesHtml + "</div>");
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

	getGameCustomRules?(): string[];
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

			this.sendHtmlPage(player, true);
			return true;
		},
		pmOnly: true,
		signupsGameCommand: true,
		aliases: ['team'],
	},
	[TOUR_PAGE_COMMAND]: {
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

				const htmlPage = this.htmlPages.get(this.players[id]);
				if (!htmlPage) {
					user.say("'" + target.trim() + "' has not received a tournament page yet.");
					return false;
				}

				const showAllTeamChanges = htmlPage.showAllTeamChanges;

				htmlPage.showAllTeamChanges = true;
				htmlPage.staffUserView = true;
				this.getPmRoom().sendHtmlPage(user, this.baseHtmlPageId + "-" + id,
					this.players[id].name + "'s tournament page:<br /><br />" + htmlPage.render());

				htmlPage.showAllTeamChanges = showAllTeamChanges;
				htmlPage.staffUserView = false;
			} else if (user.id in this.players) {
				this.sendHtmlPage(this.players[user.id], true);
			}
			return true;
		},
		aliases: ['tournamentpage', 'tournamenttab', 'tourtab'],
		pmOnly: true,
		eliminatedGameCommand: true,
		spectatorGameCommand: true,
		signupsGameCommand: true,
	},
	[REROLL_COMMAND]: {
		command(target, room, user) {
			if (!(user.id in this.players)) return false;
			if (!this.canReroll) {
				this.debugLog(user.name + " tried to reroll too late");
				return false;
			}

			const player = this.players[user.id];
			if (!this.playerCanReroll(player)) return false;

			const starterPokemon = this.starterPokemon.get(player);
			if (!starterPokemon) return false;

			this.debugLog("Rerolling starter for " + player.name);

			this.debugLog("Pokedex before adding " + player.name + "'s original starting team: " + this.pokedex.join(", "));

			for (const pokemon of starterPokemon) {
				this.pokedex.push(pokemon);
			}

			this.debugLog("Pokedex after adding " + player.name + "'s original starting team: " + this.pokedex.join(", "));

			this.rerolls.set(player, true);
			this.giveStartingTeam(player);

			this.debugLog("Pokedex after giving " + player.name + " their rerolled starting team: " + this.pokedex.join(", "));

			return true;
		},
		pmOnly: true,
		signupsGameCommand: true,
	},
	[HTML_PAGE_COMMAND]: {
		command(target, room, user) {
			this.runHtmlPageCommand(target, user);
			return true;
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
		signupsGameCommand: true,
	},
	resumetournamentupdates: {
		command(target, room, user) {
			if (user.id in this.players) {
				if (!this.players[user.id].eliminated || this.spectatorPlayers.has(this.players[user.id])) return false;
				this.spectatorPlayers.add(this.players[user.id]);
				this.updatePlayerOpponentHtml(this.players[user.id]);
				this.sendHtmlPage(this.players[user.id]);
			}
			return true;
		},
		aliases: ['spectatetournament', 'spectatetour'],
		pmOnly: true,
		eliminatedGameCommand: true,
	},
	stoptournamentupdates: {
		command(target, room, user) {
			if (user.id in this.players) {
				if (!this.players[user.id].eliminated || !this.spectatorPlayers.has(this.players[user.id])) return false;
				this.spectatorPlayers.delete(this.players[user.id]);
				this.updatePlayerOpponentHtml(this.players[user.id]);
				this.sendHtmlPage(this.players[user.id]);
			}
			return true;
		},
		aliases: ['unspectatetournament', 'unspectatetour'],
		pmOnly: true,
		eliminatedGameCommand: true,
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
			if (!game.eliminationStarted) game.startElimination();
		},
	},
	'should generate a bracket - 4 players': {
		config: {
			regressionOnly: true,
		},
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
		config: {
			regressionOnly: true,
		},
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
		config: {
			regressionOnly: true,
		},
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
		config: {
			regressionOnly: true,
		},
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
		config: {
			regressionOnly: true,
		},
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
		config: {
			regressionOnly: true,
		},
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 4);
			game.start();
			if (!game.eliminationStarted) game.startElimination();

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
		config: {
			regressionOnly: true,
		},
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 5);
			game.start();
			if (!game.eliminationStarted) game.startElimination();

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
		config: {
			regressionOnly: true,
		},
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 6);
			game.start();
			if (!game.eliminationStarted) game.startElimination();

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
		config: {
			regressionOnly: true,
		},
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 7);
			game.start();
			if (!game.eliminationStarted) game.startElimination();

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
		config: {
			regressionOnly: true,
		},
		test(game) {
			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, 8);
			if (!game.started) game.start();
			if (!game.eliminationStarted) game.startElimination();

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
		config: {
			regressionOnly: true,
		},
		test(game) {
			this.timeout(15000);
			if (!game.additionsPerRound || game.dropsPerRound || (game.maxPlayers !== 32 && game.maxPlayers !== 64)) return;

			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, game.maxPlayers);
			if (!game.started) game.start();
			if (!game.eliminationStarted) game.startElimination();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			const iterations = ((6 - game.startingTeamsLength) / game.additionsPerRound) + 1;
			for (let i = 1; i <= iterations; i++) {
				const round = matchRounds[i - 1];
				if (!round) break;

				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					let teamChanges = game.teamChanges.get(winner) || [];
					const startIndex = teamChanges.length;

					game.removePlayer(match.children![1].user!.name);
					if (game.ended) break;

					teamChanges = game.teamChanges.get(winner)!;
					for (let j = startIndex; j < teamChanges.length; j++) {
						assert(teamChanges[j].additions >= 0 && teamChanges[j].additions <= game.additionsPerRound);
						assert(teamChanges[j].drops === 0);
					}

					assert(game.possibleTeams.get(winner)!.length);
				}

				if (!game.ended) {
					assertStrictEqual(game.teamChanges.get(player)!.length, i);
					matchesByRound = game.getMatchesByRound();
				}
			}
		},
	},
	'should give team changes until players have a full team - dropsPerRound': {
		config: {
			regressionOnly: true,
		},
		test(game) {
			this.timeout(15000);
			if (!game.dropsPerRound || game.additionsPerRound || (game.maxPlayers !== 32 && game.maxPlayers !== 64)) return;

			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, game.maxPlayers);
			if (!game.started) game.start();
			if (!game.eliminationStarted) game.startElimination();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			const iterations = ((game.startingTeamsLength - 1) / game.dropsPerRound) + 1;
			for (let i = 1; i <= iterations; i++) {
				const round = matchRounds[i - 1];
				if (!round) break;

				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					let teamChanges = game.teamChanges.get(winner) || [];
					const startIndex = teamChanges.length;

					game.removePlayer(match.children![1].user!.name);
					if (game.ended) break;

					teamChanges = game.teamChanges.get(winner)!;
					for (let j = startIndex; j < teamChanges.length; j++) {
						assert(teamChanges[j].drops >= 0 && teamChanges[j].drops <= game.dropsPerRound);
						assert(teamChanges[j].additions === 0);
					}

					assert(game.possibleTeams.get(winner)!.length);
				}

				if (!game.ended) {
					assertStrictEqual(game.teamChanges.get(player)!.length, i);
					matchesByRound = game.getMatchesByRound();
				}
			}
		},
	},
	'should give team changes until players have a full team - additionsPerRound and dropsPerRound': {
		config: {
			regressionOnly: true,
		},
		test(game) {
			this.timeout(15000);
			if (!game.additionsPerRound || !game.dropsPerRound || (game.maxPlayers !== 32 && game.maxPlayers !== 64)) return;

			disableTournamentProperties(game);

			game.canReroll = false;
			addPlayers(game, game.maxPlayers);
			if (!game.started) game.start();
			if (!game.eliminationStarted) game.startElimination();

			assert(!game.firstRoundByes.size);

			let matchesByRound = game.getMatchesByRound();
			const matchRounds = Object.keys(matchesByRound).sort();
			const iterations = ((6 - game.startingTeamsLength) / game.additionsPerRound) + 1;
			for (let i = 1; i <= iterations; i++) {
				const round = matchRounds[i - 1];
				if (!round) break;

				const player = matchesByRound[round][0].children![0].user!;
				for (const match of matchesByRound[round]) {
					const winner = match.children![0].user!;
					let teamChanges = game.teamChanges.get(winner) || [];
					const startIndex = teamChanges.length;

					game.removePlayer(match.children![1].user!.name);
					if (game.ended) break;

					teamChanges = game.teamChanges.get(winner)!;
					for (let j = startIndex; j < teamChanges.length; j++) {
						assert(teamChanges[j].additions >= 0 && teamChanges[j].additions <= game.additionsPerRound);
						assert(teamChanges[j].drops >= 0 && teamChanges[j].drops <= game.dropsPerRound);
					}

					assert(game.possibleTeams.get(winner)!.length);
				}

				if (!game.ended) {
					assertStrictEqual(game.teamChanges.get(player)!.length, i);
					matchesByRound = game.getMatchesByRound();
				}
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