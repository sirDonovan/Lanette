import type { Player, PlayerTeam } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IHexCodeData } from "../types/tools";

type TeamIds = 'red' | 'blue';

const data: {pokemon: string[]} = {
	pokemon: [],
};

const letters = Tools.letters.toUpperCase().split("");
const mapSymbols: {player: string; empty: string} = {
	player: "X",
	empty: "O",
};

const MAX_REMATCHES = 2;
const HIDE_COMMAND = "hide";

class DragapultsDangerZone extends ScriptedGame {
	canFire: boolean = false;
	canHide: boolean = false;
	canSelect: boolean = false;
	columnLetters: string[] = letters;
	currentTeam: TeamIds = 'red';
	gridSize: number = 3;
	lastFiredLocation: string = '';
	matchupPlayers: Player[] = [];
	matchupsWon = new Map<Player, number>();
	maxPlayers = 20;
	minPlayers = 4;
	playerLocations = new Map<Player, string>();
	playerOrders: Dict<Player[]> = {};
	rematchCount: number = 0;
	revealedLocations: string[] = [];
	selectedMatchupPokemon = new Map<Player, IPokemon>();
	soloPlayerOrder: Player[] = [];
	soloRound: number = 0;
	teamBased: boolean = true;
	teamColumnLetters = new Map<PlayerTeam, string[]>();
	teamOrder: [TeamIds, TeamIds] = ['red', 'blue'];
	teamRound: number = 0;
	teams: Dict<PlayerTeam> | null = null;

	static loadData(): void {
		data.pokemon = Games.getPokemonList().map(x => x.name);
	}

	displayMap(): void {
		let html = '<div class="infobox"><table align="center" border="2" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			(25 * ((this.gridSize * 2) + 1)) + 'px"><tr style="height:25px"><td>&nbsp;</td>';

		const lightGray = Tools.getNamedHexCode("Light-Gray");
		for (const letter of this.columnLetters) {
			html += '<td style="background: ' + lightGray.gradient + '">' + letter + '</td>';
		}
		html += '</tr>';

		const playerLocations: Dict<Player> = {};
		for (const i in this.players) {
			const location = this.playerLocations.get(this.players[i]);
			if (location) playerLocations[location] = this.players[i];
		}

		const eliminatedPlayerColor = Tools.getNamedHexCode('Yellow');
		const hexColors: IHexCodeData[] = [Tools.getNamedHexCode('Red'), Tools.getNamedHexCode('Blue'), Tools.getNamedHexCode('Violet')];
		for (let i = 1; i <= this.gridSize; i++) {
			html += '<tr style="height:25px"><td style="background: ' + lightGray.gradient + '">' +
				i + '</td>';

			let currentTeamIndex = this.teamBased ? 0 : 2;
			for (let j = 0; j < this.columnLetters.length; j++) {
				if (this.teamBased) {
					if (j && j % this.gridSize === 0 && hexColors[currentTeamIndex + 1]) currentTeamIndex++;
				}
				const letter = this.columnLetters[j];
				const location = letter + i;
				let locationColor = hexColors[currentTeamIndex].gradient;
				let locationSymbol = '';
				if (this.revealedLocations.includes(location)) {
					if (location in playerLocations) {
						locationSymbol = '<span title="' + playerLocations[location].name + '">' + mapSymbols.player + '</span>';
						if (playerLocations[location].eliminated) {
							locationColor = eliminatedPlayerColor.gradient;
						}
					} else {
						locationSymbol = mapSymbols.empty;
					}
				} else {
					locationSymbol = '&nbsp;';
				}

				html += '<td style="background: ' + locationColor + '">' + locationSymbol + '</td>';
			}
			html += '</tr>';
		}

		html += '</table></div>';

		this.sayUhtml(this.uhtmlBaseName + '-map', html);
	}

	onRemovePlayer(player: Player): void {
		if (!this.started) return;

		this.removePlayerFromOrder(player);

		if (player === this.currentPlayer) {
			this.nextRound();
		} else if (this.matchupPlayers.includes(player)) {
			this.cancelMatchup(player);
		} else {
			const location = this.playerLocations.get(player);
			if (location) this.addRevealedLocation(location);
		}
	}

	onStart(): void {
		if (this.playerCount >= 18) {
			this.gridSize = this.teamBased ? 6 : 5;
		} else if (this.playerCount >= 12) {
			this.gridSize = this.teamBased ? 5 : 4;
		} else if (this.playerCount >= 6) {
			this.gridSize = this.teamBased ? 4 : 3;
		}

		this.columnLetters = letters.slice(0, this.gridSize * 2);

		if (this.teamBased) {
			this.teams = this.generateTeams(2, ['Red', 'Blue']);
			for (const i in this.teams) {
				const team = this.teams[i];
				this.teamColumnLetters.set(team, i === 'red' ? this.columnLetters.slice(0, this.gridSize) :
					this.columnLetters.slice(this.gridSize, this.gridSize * 2));
				for (const player of team.players) {
					player.say("**Your team (" + team.name + ")**: " +
						Tools.joinList(team.players.filter(x => x !== player).map(x => x.name)));
				}
			}

			this.displayMap();

			const text = "Please choose your location on the map in PMs with the command ``" +
				Config.commandCharacter + "hide [location]`` (letter-number)!";
			this.on(text, () => {
				this.canHide = true;
				this.onCommands([HIDE_COMMAND], {max: this.getRemainingPlayerCount(), remainingPlayersMax: true},
					() => this.checkPlayerLocations());
				this.setTimeout(() => this.checkPlayerLocations(), 60 * 1000);
			});
			this.say(text);
		} else {
			const usedLocations: string[] = [];
			for (const i in this.players) {
				let column = this.sampleOne(this.columnLetters);
				let row = this.random(this.gridSize) + 1;
				let location = this.getMapLocation(column + row);
				while (!location || usedLocations.includes(location)) {
					column = this.sampleOne(this.columnLetters);
					row = this.random(this.gridSize) + 1;
					location = this.getMapLocation(column + row);
				}

				const player = this.players[i];
				this.playerLocations.set(player, location);
				player.say("You have been hidden at " + location + "!");
				usedLocations.push(location);
			}

			this.setTimeout(() => this.nextRound(), 5000);
		}
	}

	checkPlayerLocations(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.offCommands([HIDE_COMMAND]);

		this.canHide = false;

		for (const i in this.players) {
			const player = this.players[i];
			if (!this.playerLocations.has(player)) {
				this.eliminatePlayer(player, "You did not choose a location on the map!");
			}
		}

		this.setLargestTeam();
		for (const i in this.teams) {
			if (this.teams[i] === this.largestTeam) continue;
			this.teamOrder = [this.teams[i].id as TeamIds, this.largestTeam!.id as TeamIds];
		}
		this.currentTeam = this.teamOrder[0];

		this.nextRound();
	}

	getDisplayedRoundNumber(): number {
		return this.teamBased ? this.teamRound : this.soloRound;
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			if (!this.currentPlayer.eliminated) {
				this.addRevealedLocation(this.playerLocations.get(this.currentPlayer)!);
				this.say(this.currentPlayer.name + " did not fire anywhere and has been eliminated from the game!");
				this.eliminatePlayer(this.currentPlayer);
			}
			this.currentPlayer = null;
		}

		let fireText = '';
		if (this.teamBased) {
			if (this.getFinalTeam()) {
				return this.end();
			}

			if (this.currentTeam === this.teamOrder[0] && (!(this.teams![this.currentTeam].id in this.playerOrders) ||
				!this.playerOrders[this.teams![this.currentTeam].id].length)) {
				this.setTeamPlayerOrders();

				this.teamRound++;
				const html = this.getRoundHtml(players => this.getTeamsPlayerNames(players));
				const uhtmlName = this.uhtmlBaseName + '-round-html';
				this.onUhtml(uhtmlName, html, () => {
					this.setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.sayUhtml(uhtmlName, html);
				return;
			}

			const team = this.teams![this.currentTeam];
			let player = this.playerOrders[team.id].shift();
			if (!player) {
				this.setTeamPlayerOrder(team);
				player = this.playerOrders[team.id].shift();
			}

			this.currentPlayer = player!;
			fireText = "It is " + player!.name + " of the " + team.name + " Team's turn to fire!";

			this.currentTeam = this.currentTeam === 'red' ? 'blue' : 'red';
		} else {
			if (this.getFinalPlayer()) {
				return this.end();
			}

			if (!this.soloPlayerOrder.length) {
				this.soloPlayerOrder = this.shufflePlayers();

				this.soloRound++;
				const html = this.getRoundHtml(players => this.getPlayerNames(players));
				const uhtmlName = this.uhtmlBaseName + '-round-html';
				this.onUhtml(uhtmlName, html, () => {
					this.setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.sayUhtml(uhtmlName, html);
				return;
			}

			const player = this.soloPlayerOrder[0];
			this.soloPlayerOrder.shift();

			this.currentPlayer = player;

			fireText = "It is " + player.name + "'s turn to fire!";
		}

		this.displayMap();

		this.on(fireText, () => {
			this.canFire = true;
			this.setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.say(fireText);
	}

	onEnd(): void {
		if (this.teamBased) {
			const winningTeam = this.getFinalTeam();
			if (winningTeam) {
				for (const player of winningTeam.players) {
					if (!this.playerLocations.has(player)) continue;
					this.winners.set(player, 1);
					let earnings = 150;
					if (!player.eliminated) earnings *= 2;

					const matchupsWon = this.matchupsWon.get(player);
					if (matchupsWon) earnings += matchupsWon * 50;

					this.addBits(player, earnings);
				}

				const losingTeam = this.teams![winningTeam.id === 'blue' ? 'red' : 'blue'];
				for (const player of losingTeam.players) {
					if (!this.playerLocations.has(player)) continue;
					const matchupsWon = this.matchupsWon.get(player);
					if (matchupsWon) {
						this.addBits(player, matchupsWon * 50);
					}
				}
			}
		} else {
			const winner = this.getFinalPlayer();
			if (winner) {
				this.winners.set(winner, 1);
				this.addBits(winner, 500);
			}

			for (const i in this.players) {
				if (this.players[i] === winner) continue;
				const matchupsWon = this.matchupsWon.get(this.players[i]);
				if (matchupsWon) {
					this.addBits(this.players[i], matchupsWon * 50);
				}
			}
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.matchupsWon.clear();
		this.playerLocations.clear();
		this.selectedMatchupPokemon.clear();
	}

	startMatchup(players: Player[]): void {
		this.selectedMatchupPokemon.clear();
		this.matchupPlayers = players;

		const text = Tools.joinList(players.map(x => x.name)) + " please select a Pokemon in PMs with the command ``" +
			Config.commandCharacter + "select [Pokemon]``!";
		this.on(text, () => {
			this.canSelect = true;
			this.setTimeout(() => this.calculateMatchup(), 30 * 1000);
		});
		this.say(text);
	}

	cancelMatchup(loser: Player): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.canSelect = false;
		this.currentPlayer = null;

		const text = loser.name + " did not select a Pokemon and was eliminated from the game!";
		this.on(text, () => {
			this.setTimeout(() => this.nextRound(), 3 * 1000);
		});
		this.say(text);
	}

	calculateMatchup(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.canSelect = false;

		const attacker = this.matchupPlayers[0];
		const defender = this.matchupPlayers[1];
		const attackerPokemon = this.selectedMatchupPokemon.get(attacker);
		const defenderPokemon = this.selectedMatchupPokemon.get(defender);
		if (!attackerPokemon && !defenderPokemon) {
			const text = "Neither player selected a Pokemon!";
			this.on(text, () => {
				this.currentPlayer = null;
				this.setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.say(text);
			return;
		}

		let attackerWin = false;
		let defenderWin = false;
		if (attackerPokemon && defenderPokemon) {
			const winner = Games.getMatchupWinner(attackerPokemon, defenderPokemon);
			if (winner === attackerPokemon) {
				attackerWin = true;
			} else if (winner === defenderPokemon) {
				defenderWin = true;
			}
		} else {
			if (attackerPokemon) {
				attackerWin = true;
			} else if (defenderPokemon) {
				defenderWin = true;
			}
		}

		let tie = false;
		let text = '';
		if (!attackerWin && !defenderWin) {
			tie = true;
			text = "It was a tie between " + attacker.name + "'s " + attackerPokemon!.name + " and " +
				defender.name + "'s " + defenderPokemon!.name + "!";
		} else {
			if (attackerWin) {
				text = this.handleMatchupResult(attacker, defender, attackerPokemon!, defenderPokemon);
			} else if (defenderWin) {
				text = this.handleMatchupResult(defender, attacker, defenderPokemon!, attackerPokemon);
			}
		}

		if (tie && this.rematchCount < MAX_REMATCHES) {
			this.rematchCount++;
			this.on(text, () => {
				this.setTimeout(() => this.startMatchup(this.matchupPlayers), 3 * 1000);
			});
		} else {
			if (this.rematchCount) this.rematchCount = 0;
			this.currentPlayer = null;

			this.on(text, () => {
				this.setTimeout(() => this.nextRound(), 3 * 1000);
			});
		}

		this.say(text);
	}

	removePlayerFromOrder(player: Player): void {
		if (this.teamBased) {
			if (player.team!.id in this.playerOrders) {
				const index = this.playerOrders[player.team!.id].indexOf(player);
				if (index !== -1) this.playerOrders[player.team!.id].splice(index, 1);
			}
		} else {
			const index = this.soloPlayerOrder.indexOf(player);
			if (index !== -1) this.soloPlayerOrder.splice(index, 1);
		}
	}

	handleMatchupResult(winner: Player, loser: Player, winnerPokemon: IPokemon, loserPokemon?: IPokemon): string {
		const loserEliminated = !loserPokemon || loser !== this.currentPlayer;
		if (loserEliminated) {
			this.eliminatePlayer(loser);
			this.addRevealedLocation(this.playerLocations.get(loser)!);
			this.removePlayerFromOrder(loser);
		}

		const matchupsWon = this.matchupsWon.get(winner) || 0;
		this.matchupsWon.set(winner, matchupsWon + 1);

		if (loserPokemon) {
			return loser.name + "'s " + loserPokemon.name + " was defeated by " + winner.name + "'s " + winnerPokemon.name + "!" +
				(loserEliminated ? " " + loser.name + " has been eliminated from the game!" : "");
		} else {
			return loser.name + " did not select a Pokemon and was eliminated from the game!";
		}
	}

	getMapLocation(target: string, team?: PlayerTeam): string | undefined {
		const parts = Tools.toId(target).split("");
		if (parts.length !== 2) return;

		const letter = parts[0].toUpperCase();
		if (!this.columnLetters.includes(letter) || (team && !this.teamColumnLetters.get(team)!.includes(letter))) return;

		const number = parseInt(parts[1]);
		if (isNaN(number) || number > this.gridSize || number < 1) return;

		return letter + number;
	}

	getTeamColumnLetters(team?: PlayerTeam): string[] {
		if (team) {
			return this.teamColumnLetters.get(team)!;
		} else {
			return this.columnLetters;
		}
	}

	addRevealedLocation(location: string): void {
		if (!this.revealedLocations.includes(location)) this.revealedLocations.push(location);
	}

	fireDreepy(player: Player, locationKey: string): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.canFire = false;
		this.addRevealedLocation(locationKey);

		const text = "The Dreepy was fired to **" + locationKey + "**...";
		let hitPlayer: Player | undefined;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const playerLocation = this.playerLocations.get(this.players[i]);
			if (playerLocation === locationKey) {
				hitPlayer = this.players[i];
				break;
			}
		}

		this.on(text, () => {
			this.setTimeout(() => {
				if (hitPlayer) {
					this.say(hitPlayer.name + " was there!");
					if (hitPlayer.eliminated) {
						this.currentPlayer = null;
						this.nextRound();
					} else {
						this.startMatchup([player, hitPlayer]);
					}
				} else {
					this.say("__Splash__! Nothing happened.");
					this.currentPlayer = null;
					this.nextRound();
				}
			}, 3 * 1000);
		});
		this.say(text);
	}
}

const commands: GameCommandDefinitions<DragapultsDangerZone> = {
	[HIDE_COMMAND]: {
		command(target, room, user) {
			if (!this.canHide) return false;

			const player = this.players[user.id];
			if (this.playerLocations.has(player)) {
				player.say("You have already chosen your location on the map!");
				return false;
			}

			const location = this.getMapLocation(target, player.team);
			if (!location) {
				const columnLetters = this.getTeamColumnLetters(player.team);
				player.say("You must specify a letter (" + columnLetters[0] + "-" +
					columnLetters[columnLetters.length - 1] + ") and number (1-" + this.gridSize + ")");
				return false;
			}

			let usedLocation: boolean | undefined;
			this.playerLocations.forEach((otherLocation, otherPlayer) => {
				if (!usedLocation && otherLocation === location) {
					usedLocation = true;
					player.say(otherPlayer.name + " is already hiding at " + location + "!");
				}
			});
			if (usedLocation) return false;

			player.say("You have hid at " + location + "!");
			this.playerLocations.set(player, location);
			return true;
		},
		pmOnly: true,
	},
	fire: {
		command(target, room, user) {
			if (!this.canFire || this.players[user.id] !== this.currentPlayer) return false;

			const player = this.players[user.id];
			let opposingTeam: PlayerTeam | undefined;
			if (this.teamBased) opposingTeam = this.teams![this.currentTeam];

			const location = this.getMapLocation(target, opposingTeam);
			if (!location) {
				const columnLetters = this.getTeamColumnLetters(opposingTeam);
				player.say("You must specify a letter (" + columnLetters[0] + "-" +
					columnLetters[columnLetters.length - 1] + ") and number (1-" + this.gridSize + ")");
				return false;
			}

			if (!this.teamBased) {
				if (location === this.playerLocations.get(player)) {
					player.say("You cannot fire at yourself!");
					return false;
				}
				if (location === this.lastFiredLocation && this.getRemainingPlayerCount() > 2) {
					player.say("The same location cannot be fired twice in a row!");
					return false;
				}

				this.lastFiredLocation = location;
			}

			this.fireDreepy(player, location);
			return true;
		},
	},
	select: {
		command(target, room, user) {
			if (!this.canSelect || !this.matchupPlayers.includes(this.players[user.id]) ||
				this.selectedMatchupPokemon.has(this.players[user.id])) {
				return false;
			}
			const player = this.players[user.id];
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				player.say(CommandParser.getErrorText(['invalidPokemon', target]));
				return false;
			}

			if (!data.pokemon.includes(pokemon.name)) {
				player.say(pokemon.name + " cannot be used in this game. Please choose something else!");
				return false;
			}

			player.say("You have selected " + pokemon.name + "!");
			this.selectedMatchupPokemon.set(player, pokemon);
			if (this.selectedMatchupPokemon.size === this.matchupPlayers.length) {
				this.calculateMatchup();
			}
			return true;
		},
		pmOnly: true,
	},
};

export const game: IGameFile<DragapultsDangerZone> = {
	aliases: ["dragapults", "ddz", "dangerzone"],
	category: 'luck',
	commandDescriptions: [Config.commandCharacter + "hide [location]", Config.commandCharacter + "fire [location]",
		Config.commandCharacter + "select [Pokemon]"],
	commands,
	class: DragapultsDangerZone,
	description: "Players are split into teams and attempt to sink the opposing players by firing Dreepy around the grid!",
	name: "Dragapult's Danger Zone",
	mascot: "Dragapult",
	scriptedOnly: true,
	variants: [
		{
			name: "Dragapult's Solo Danger Zone",
			description: "Players attempt to sink the opposing players by firing Dreepy around the grid!",
			aliases: ['dsdz'],
			variantAliases: ['solo'],
			challengeSettings: {
				onevsone: {
					enabled: true,
				},
			},
			commandDescriptions: [Config.commandCharacter + "fire [location]", Config.commandCharacter + "select [Pokemon]"],
			teamBased: false,
		},
	],
};
