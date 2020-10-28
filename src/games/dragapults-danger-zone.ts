import type { Player, PlayerTeam } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { HexColor } from "../types/tools";

type TeamIds = 'red' | 'blue';

const letters = Tools.letters.toUpperCase().split("");
const mapSymbols: {player: string; empty: string} = {
	player: "X",
	empty: "O",
};

class DragapultsDangerZone extends ScriptedGame {
	columnLetters: string[] = letters;
	currentPlayer: Player | null = null;
	currentTeam: TeamIds = 'red';
	gridSize: number = 3;
	matchupPlayers: Player[] = [];
	matchupsWon = new Map<Player, number>();
	minPlayers = 4;
	playerLocations = new Map<Player, string>();
	playerOrders: Dict<Player[]> = {};
	revealedLocations: string[] = [];
	selectedMatchupPokemon = new Map<Player, IPokemon>();
	teamColumnLetters = new Map<PlayerTeam, string[]>();
	teamRound: number = 0;
	teams: Dict<PlayerTeam> = {};

	// set in onStart()
	largestTeam!: PlayerTeam;

	displayMap(): void {
		let html = '<div class="infobox"><table align="center" border="2" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			(25 * ((this.gridSize * 2) + 1)) + 'px"><tr style="height:25px"><td>&nbsp;</td>';

		for (const letter of this.columnLetters) {
			html += '<td style="background: ' + Tools.hexColorCodes["Light Gray"]["background-color"] + '">' + letter + '</td>';
		}
		html += '</tr>';

		const playerLocations: Dict<Player> = {};
		for (const i in this.players) {
			const location = this.playerLocations.get(this.players[i]);
			if (location) playerLocations[location] = this.players[i];
		}

		const hexColors: HexColor[] = ['Red', 'Blue'];
		for (let i = 1; i <= this.gridSize; i++) {
			html += '<tr style="height:25px"><td style="background: ' + Tools.hexColorCodes["Light Gray"]["background-color"] + '">' +
				i + '</td>';
			let currentTeamIndex = 0;
			for (let j = 0; j < this.columnLetters.length; j++) {
				if (j && j % this.gridSize === 0 && hexColors[currentTeamIndex + 1]) currentTeamIndex++;
				const letter = this.columnLetters[j];
				const location = letter + i;
				let locationColor = Tools.hexColorCodes[hexColors[currentTeamIndex]]["background-color"];
				let locationSymbol = '';
				if (this.revealedLocations.includes(location)) {
					if (location in playerLocations) {
						locationSymbol = '<span title="' + playerLocations[location].name + '">' + mapSymbols.player + '</span>';
						if (playerLocations[location].eliminated) {
							locationColor = Tools.hexColorCodes['Yellow']["background-color"];
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
		if (player === this.currentPlayer) {
			this.nextRound();
		}
	}

	onStart(): void {
		if (this.playerCount >= 18) {
			this.gridSize = 6;
		} else if (this.playerCount >= 12) {
			this.gridSize = 5;
		} else if (this.playerCount >= 6) {
			this.gridSize = 4;
		}

		this.columnLetters = letters.slice(0, this.gridSize * 2);

		this.teams = this.generateTeams(2, ['Red', 'Blue']);
		for (const i in this.teams) {
			const team = this.teams[i];
			this.teamColumnLetters.set(team, i === 'red' ? this.columnLetters.slice(0, this.gridSize) :
				this.columnLetters.slice(this.gridSize, this.gridSize * 2));
			for (const player of team.players) {
				player.say("**Your team (" + team.name + ")**: " + Tools.joinList(team.players.filter(x => x !== player).map(x => x.name)));
			}
		}

		this.displayMap();

		const text = "Please choose your location on the map in PMs with the command ``" +
			Config.commandCharacter + "hide [location]`` (letter-number)!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.checkPlayerLocations(), 60 * 1000);
		});
		this.say(text);
	}

	checkPlayerLocations(): void {
		for (const i in this.players) {
			const player = this.players[i];
			if (!this.playerLocations.has(player)) {
				this.eliminatePlayer(player, "You did not choose a location on the map!");
			}
		}

		this.setLargestTeam();
		this.currentTeam = this.largestTeam.id as TeamIds;
		this.nextRound();
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			if (!this.currentPlayer.eliminated) {
				this.say(this.currentPlayer.name + " did not fire anywhere!");
				this.eliminatePlayer(this.currentPlayer, "You did not fire anywhere on the map!");
			}
			this.currentPlayer = null;
		}

		if (this.getFinalTeam()) {
			return this.end();
		}

		if (this.currentTeam === this.largestTeam.id && (!(this.largestTeam.id in this.playerOrders) ||
			!this.playerOrders[this.largestTeam.id].length)) {
			this.setTeamPlayerOrders();

			this.teamRound++;
			const html = this.getRoundHtml(players => this.getTeamPlayerNames(players), undefined, 'Round ' + this.teamRound);
			const uhtmlName = this.uhtmlBaseName + '-round-html';
			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.sayUhtml(uhtmlName, html);
		} else {
			const team = this.teams[this.currentTeam];
			let player = this.playerOrders[team.id].shift();
			if (!player) {
				this.setTeamPlayerOrder(team);
				player = this.playerOrders[team.id].shift()!;
			}

			this.currentTeam = this.currentTeam === 'red' ? 'blue' : 'red';
			this.currentPlayer = player;

			this.displayMap();
			const text = "It is " + player.name + " of the " + team.name + " Team's turn to fire!";
			this.on(text, () => {
				this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
			});
			this.say(text);
		}
	}

	onEnd(): void {
		const winningTeam = this.getFinalTeam();
		if (winningTeam) {
			for (const player of winningTeam.players) {
				if (!this.playerLocations.has(player)) continue;
				this.winners.set(player, 1);
				let earnings = 150;
				if (!player.eliminated) earnings *= 2;

				const matchupsWon = this.matchupsWon.get(player) || 0;
				if (matchupsWon) earnings += matchupsWon * 50;

				this.addBits(player, earnings);
			}
		}

		this.announceWinners();
	}

	startMatchup(players: Player[]): void {
		this.selectedMatchupPokemon.clear();
		this.matchupPlayers = players;

		const text = Tools.joinList(players.map(x => x.name)) + " please select a Pokemon in PMs with the command ``" +
			Config.commandCharacter + "select [Pokemon]``!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.calculateMatchup(), 30 * 1000);
		});
		this.say(text);
	}

	calculateMatchup(): void {
		if (this.timeout) clearTimeout(this.timeout);

		const playerA = this.matchupPlayers[0];
		const playerB = this.matchupPlayers[1];
		const playerAPokemon = this.selectedMatchupPokemon.get(playerA);
		const playerBPokemon = this.selectedMatchupPokemon.get(playerB);
		if (!playerAPokemon && !playerBPokemon) {
			const text = "Neither player selected a Pokemon!";
			this.on(text, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.say(text);
			return;
		}

		let playerAWin = false;
		let playerBWin = false;
		if (playerAPokemon && playerBPokemon) {
			const winner = Games.getMatchupWinner(playerAPokemon, playerBPokemon);
			if (winner === playerAPokemon) {
				playerAWin = true;
			} else if (winner === playerBPokemon) {
				playerBWin = true;
			}
		} else {
			if (playerAPokemon) {
				playerAWin = true;
			} else if (playerBPokemon) {
				playerBWin = true;
			}
		}

		let text = '';
		if (playerAWin) {
			text = this.handleMatchupResult(playerA, playerB, playerAPokemon!, playerBPokemon);
		} else if (playerBWin) {
			text = this.handleMatchupResult(playerB, playerA, playerBPokemon!, playerAPokemon);
		} else {
			text = "It was a tie between " + playerA.name + "'s " + playerAPokemon!.name + " and " +
				playerB.name + "'s " + playerBPokemon!.name + "!";
		}

		if (playerAWin || playerBWin) this.setLargestTeam();

		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 3 * 1000);
		});
		this.say(text);
	}

	handleMatchupResult(winner: Player, loser: Player, winnerPokemon: IPokemon, loserPokemon?: IPokemon): string {
		this.eliminatePlayer(loser, loserPokemon ? "You were defeated by " + winner.name + "!" : "You did not select a Pokemon!");
		this.addRevealedLocation(this.playerLocations.get(loser)!);

		const index = this.playerOrders[loser.team!.id].indexOf(loser);
		if (index !== -1) this.playerOrders[loser.team!.id].splice(index, 1);

		const matchupsWon = this.matchupsWon.get(winner) || 0;
		this.matchupsWon.set(winner, matchupsWon + 1);

		if (loserPokemon) {
			return loser.name + "'s " + loserPokemon.name + " was defeated by " + winner.name + "'s " + winnerPokemon.name + "!";
		} else {
			return loser.name + " did not select a Pokemon and was eliminated from the game!";
		}
	}

	getMapLocation(target: string, team?: PlayerTeam): string | undefined {
		const parts = Tools.toId(target).split("");
		const letter = parts[0].toUpperCase();
		if (!this.columnLetters.includes(letter) || (team && !this.teamColumnLetters.get(team)!.includes(letter))) return;

		const number = parseInt(parts[1]);
		if (isNaN(number) || number > this.gridSize || number < 1) return;

		return letter + number;
	}

	addRevealedLocation(location: string): void {
		if (!this.revealedLocations.includes(location)) this.revealedLocations.push(location);
	}

	fireDreepy(player: Player, locationKey: string): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.currentPlayer = null;
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
			this.timeout = setTimeout(() => {
				if (hitPlayer) {
					this.say(hitPlayer.name + " was there!");
					if (hitPlayer.eliminated) {
						this.nextRound();
					} else {
						this.startMatchup([player, hitPlayer]);
					}
				} else {
					this.say("__Splash__! Nothing happened.");
					this.nextRound();
				}
			}, 3 * 1000);
		});
		this.say(text);
	}
}

const commands: GameCommandDefinitions<DragapultsDangerZone> = {
	hide: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			const player = this.players[user.id];
			if (this.playerLocations.has(player)) {
				player.say("You have already chosen your location on the map!");
				return false;
			}

			const location = this.getMapLocation(target, player.team);
			if (!location) {
				const teamColumnLetters = this.teamColumnLetters.get(player.team!)!;
				player.say("You must specify a letter (" + teamColumnLetters[0] + "-" +
					teamColumnLetters[teamColumnLetters.length - 1] + ") and number (1-" + this.gridSize + ")");
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
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.players[user.id] !== this.currentPlayer) return false;

			const player = this.players[user.id];
			const opposingTeam = this.teams[this.currentTeam];
			const location = this.getMapLocation(target, opposingTeam);
			if (!location) {
				const teamColumnLetters = this.teamColumnLetters.get(opposingTeam)!;
				player.say("You must specify a letter (" + teamColumnLetters[0] + "-" +
					teamColumnLetters[teamColumnLetters.length - 1] + ") and number (1-" + this.gridSize + ")");
				return false;
			}

			this.fireDreepy(player, location);
			return true;
		},
	},
	select: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.matchupPlayers.includes(this.players[user.id]) || this.selectedMatchupPokemon.has(this.players[user.id])) {
				return false;
			}
			const player = this.players[user.id];
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				player.say(CommandParser.getErrorText(['invalidPokemon', target]));
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
	category: 'strategy',
	commandDescriptions: [Config.commandCharacter + "hide [location]", Config.commandCharacter + "fire [location]",
		Config.commandCharacter + "select [Pokemon]"],
	commands,
	class: DragapultsDangerZone,
	description: "Players are split into teams and attempt to sink the opposing players by firing Dreepy around the grid!",
	name: "Dragapult's Danger Zone",
	mascot: "Dragapult",
	noOneVsOne: true,
	scriptedOnly: true,
};
