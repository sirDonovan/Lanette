import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, assertStrictEqual } from "../../test/test-tools";
import type { GameFileTests, IGameTemplateFile, PlayerList } from "../../types/games";
import type { NamedHexCode } from "../../types/tools";

// Board designs
export type BoardType = 'square' | 'circle';

export type BoardSpaceDirection = 'left' | 'right' | 'up' | 'down';

interface ISpace {
	name: string;
	color: NamedHexCode;
	forwardDirection: BoardSpaceDirection;
	backwardDirection: BoardSpaceDirection;
	cost?: number;
	chance?: number;
	icon?: string;
	startSpace?: boolean;
	effect?: 'action' | 'random' | 'jail';
}

interface IRow {
	row: number;
}

export type BoardData = IRow | ISpace | null;

// In-game board types
export class BoardSpace {
	name: string;
	color: NamedHexCode;
	forwardDirection: BoardSpaceDirection;
	backwardDirection: BoardSpaceDirection;
	icon?: string;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection) {
		this.name = name;
		this.color = color;
		this.forwardDirection = forwardDirection;
		this.backwardDirection = backwardDirection;
	}
}

export interface IBoardLocation {
	x: number;
	y: number;
}

export interface IMovedBoardLocation extends IBoardLocation {
	passedSpaces: BoardSpace[];
}

export type BoardActionCard<T extends BoardGame = BoardGame> = (this: T, player: Player) => void;

export abstract class BoardGame extends ScriptedGame {
	abstract board: (BoardSpace | null)[][];
	abstract numberOfDice: number;
	abstract startingBoardLocation: IBoardLocation;
	abstract startingSpace: BoardSpace;

	boardRound: number = 0;
	boardType: BoardType = 'square';
	dice: number[] = [];
	doubleRolls: number = 0;
	maxPlayers: number = 25;
	lettersList: string[] = Tools.letters.toUpperCase().split("");
	playerLocations = new Map<Player, IBoardLocation>();
	playerList: Player[] = [];
	playerLetters = new Map<Player, string>();
	playerOrder: Player[] = [];
	currentPlayerReRoll: boolean = false;
	reverseDirections: boolean = false;

	abstract getSpaceHtml(x: number, y: number, playerLocations: Player[][][]): string;
	abstract onNextPlayer(player: Player): void;
	abstract onSpaceLanding(player: Player, spacesMoved: number, location: IMovedBoardLocation, teleported?: boolean): void;

	displayBoard(): void {
		const playerLocations: Player[][][] = [];

		for (const id in this.players) {
			const player = this.players[id];
			if (!player.eliminated) {
				const location = this.playerLocations.get(player)!;
				if (!playerLocations[location.y]) playerLocations[location.y] = [];
				if (!playerLocations[location.y][location.x]) playerLocations[location.y][location.x] = [];
				playerLocations[location.y][location.x].push(player);
			}
		}

		let html = '<div class="infobox"><table align="center" border="2" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			(25 * (this.board.length + 2)) + 'px">';
		for (let i = 0; i < this.board.length; i++) {
			html += "<tr style='height:25px'>";
			for (let j = 0; j < this.board[i].length; j++) {
				html += this.getSpaceHtml(j, i, playerLocations);
			}
			html += "</tr>";
		}
		html += "</table></div>";

		this.sayUhtml(this.uhtmlBaseName + '-board', html);
	}

	placePlayerOnStart(player: Player): void {
		this.playerLocations.set(player, {x: this.startingBoardLocation.x, y: this.startingBoardLocation.y});
		const playerLetter = this.lettersList[0];
		this.lettersList.shift();
		this.playerLetters.set(player, playerLetter);
		player.say("You will play as **" + playerLetter + "** for " + this.name + "!");
	}

	onStart(): void {
		this.playerOrder = this.shufflePlayers();
		for (const player of this.playerOrder) {
			this.placePlayerOnStart(player);
		}

		this.setTimeout(() => this.nextRound(), 5 * 1000);
	}

	getDisplayedRoundNumber(): number {
		return this.boardRound;
	}

	onNextRound(): void {
		if (this.getRemainingPlayerCount() < 2) return this.end();
		if (!this.playerList.length) {
			this.boardRound++;
			if (this.canLateJoin && this.boardRound > 1) this.canLateJoin = false;

			this.playerList = this.playerOrder.slice();
			const uhtmlName = this.uhtmlBaseName + '-round';
			const html = this.getRoundHtml(players => this.getPlayerLetters(players), this.getRemainingPlayers(this.playerOrder));
			this.onUhtml(uhtmlName, html, () => {
				this.setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.sayUhtml(uhtmlName, html);
			return;
		}

		let player = this.playerList.shift();
		while (player && player.eliminated) {
			player = this.playerList.shift();
		}

		if (!player) {
			this.nextRound();
			return;
		}

		this.doubleRolls = 1;
		this.currentPlayer = player;
		this.onNextPlayer(player);
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerLocations.clear();
		this.playerLetters.clear();
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.addBits(this.players[i], 500);
			this.winners.set(this.players[i], 1);
		}

		this.announceWinners();
	}

	getSpaceLocation(space: BoardSpace): IBoardLocation | null {
		for (let i = 0; i < this.board.length; i++) {
			for (let j = 0; j < this.board[i].length; j++) {
				if (this.board[i][j] === space) return {x: j, y: i};
			}
		}

		return null;
	}

	getLocationAfterMovement(startingLocation: IBoardLocation, spacesMoved: number): IMovedBoardLocation {
		const forward = this.reverseDirections ? spacesMoved < 0 : spacesMoved > 0;
		if (spacesMoved < 0) spacesMoved *= -1;
		let x = startingLocation.x;
		let y = startingLocation.y;

		const passedSpaces: BoardSpace[] = [];
		for (let i = 0; i < spacesMoved; i++) {
			if (!this.board[y][x]) {
				throw new Error("Landed in the void moving " + spacesMoved + " spaces from (" + startingLocation.x + ", " +
					startingLocation.y + ") ");
			}

			passedSpaces.push(this.board[y][x]!);

			const direction = forward ? 'forwardDirection' : 'backwardDirection';
			if (this.board[y][x]![direction] === 'up') {
				y--;
			} else if (this.board[y][x]![direction] === 'down') {
				y++;
			} else if (this.board[y][x]![direction] === 'left') {
				x--;
			} else if (this.board[y][x]![direction] === 'right') {
				x++;
			}
		}

		return {x, y, passedSpaces};
	}

	rollDice(player: Player): void {
		this.dice = [];
		for (let i = 0; i < this.numberOfDice; i++) {
			this.dice.push(this.random(6) + 1);
		}

		if (this.onPlayerRoll && !this.onPlayerRoll(player)) return;

		let rollAmount = 0;
		for (const roll of this.dice) {
			rollAmount += roll;
		}

		this.currentPlayerReRoll = rollAmount / this.dice.length === this.dice[0];
		if (!this.currentPlayerReRoll) this.doubleRolls = 1;

		const location = this.playerLocations.get(player)!;
		const locationAfterMovement = this.getLocationAfterMovement(location, rollAmount);
		location.x = locationAfterMovement.x;
		location.y = locationAfterMovement.y;

		this.displayBoard();

		this.onSpaceLanding(player, rollAmount, locationAfterMovement);
	}

	getPlayerLetters(players?: PlayerList): string {
		return this.getPlayerAttributes(player => this.getPlayerUsernameHtml(player.name) + " (" + this.playerLetters.get(player) + ")",
			players).join(', ');
	}

	onPlayerRoll?(player: Player): boolean;
}

const tests: GameFileTests<BoardGame> = {
	'it should properly determine space order in getLocationAfterMovement': {
		test(game): void {
			if (game.reverseDirections || game.boardType !== 'square') return;

			const rows = game.board.length - 1;
			const columns = game.board[0].length - 1;

			// forward movement

			// top left
			let locationAfterMovement = game.getLocationAfterMovement({x: 0, y: 0}, 1);
			assertStrictEqual(locationAfterMovement.x, 1);
			assertStrictEqual(locationAfterMovement.y, 0);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: 0}, 2);
			assertStrictEqual(locationAfterMovement.x, 2);
			assertStrictEqual(locationAfterMovement.y, 0);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: 1}, 3);
			assertStrictEqual(locationAfterMovement.x, 2);
			assertStrictEqual(locationAfterMovement.y, 0);

			// bottom left
			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: rows}, 1);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, rows - 1);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: rows}, 2);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, rows - 2);

			locationAfterMovement = game.getLocationAfterMovement({x: 1, y: rows}, 3);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, rows - 2);

			// top right
			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: 0}, 1);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, 1);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: 0}, 2);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, 2);

			locationAfterMovement = game.getLocationAfterMovement({x: columns - 1, y: 0}, 3);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, 2);

			// bottom right
			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: rows}, 1);
			assertStrictEqual(locationAfterMovement.x, columns - 1);
			assertStrictEqual(locationAfterMovement.y, rows);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: rows}, 2);
			assertStrictEqual(locationAfterMovement.x, columns - 2);
			assertStrictEqual(locationAfterMovement.y, rows);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: rows - 1}, 3);
			assertStrictEqual(locationAfterMovement.x, columns - 2);
			assertStrictEqual(locationAfterMovement.y, rows);

			// backward movement

			// top left
			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: 0}, -1);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, 1);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: 0}, -2);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, 2);

			locationAfterMovement = game.getLocationAfterMovement({x: 1, y: 0}, -3);
			assertStrictEqual(locationAfterMovement.x, 0);
			assertStrictEqual(locationAfterMovement.y, 2);

			// bottom left
			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: rows}, -1);
			assertStrictEqual(locationAfterMovement.x, 1);
			assertStrictEqual(locationAfterMovement.y, rows);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: rows}, -2);
			assertStrictEqual(locationAfterMovement.x, 2);
			assertStrictEqual(locationAfterMovement.y, rows);

			locationAfterMovement = game.getLocationAfterMovement({x: 0, y: rows - 1}, -3);
			assertStrictEqual(locationAfterMovement.x, 2);
			assertStrictEqual(locationAfterMovement.y, rows);

			// top right
			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: 0}, -1);
			assertStrictEqual(locationAfterMovement.x, columns - 1);
			assertStrictEqual(locationAfterMovement.y, 0);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: 0}, -2);
			assertStrictEqual(locationAfterMovement.x, columns - 2);
			assertStrictEqual(locationAfterMovement.y, 0);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: 1}, -3);
			assertStrictEqual(locationAfterMovement.x, columns - 2);
			assertStrictEqual(locationAfterMovement.y, 0);

			// bottom right
			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: rows}, -1);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, rows - 1);

			locationAfterMovement = game.getLocationAfterMovement({x: columns, y: rows}, -2);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, rows - 2);

			locationAfterMovement = game.getLocationAfterMovement({x: columns - 1, y: rows}, -3);
			assertStrictEqual(locationAfterMovement.x, columns);
			assertStrictEqual(locationAfterMovement.y, rows - 2);
		},
	},
	'it should have properly initialized board spaces': {
		test(game): void {
			if (game.boardType !== 'square') return;

			addPlayers(game, 4);
			if (!game.started) game.start();

			let location: IMovedBoardLocation = {x: game.startingBoardLocation.x, y: game.startingBoardLocation.x, passedSpaces: []};
			let spaceId = location.x + ", " + location.y;
			let space = game.board[location.y][location.x];
			const totalSpaces = (game.board.length * 2) + (game.board[0].length * 2);
			for (let i = 0; i < totalSpaces; i++) {
				location = game.getLocationAfterMovement(location, 1);
				spaceId = location.x + ", " + location.y;
				space = game.board[location.y][location.x];
				assert(space, spaceId);
				assert(space.name, spaceId);
				assert(space.color, spaceId);
			}
		},
	},
};

export const game: IGameTemplateFile<BoardGame> = {
	category: 'tabletop',
	scriptedOnly: true,
	tests,
};
