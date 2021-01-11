import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import { assert, assertStrictEqual } from "../../test/test-tools";
import type { GameFileTests, IGameTemplateFile, PlayerList } from "../../types/games";
import type { NamedHexCode } from "../../types/tools";

export class BoardSpace {
	name: string;
	color: NamedHexCode;

	constructor(name: string, color: NamedHexCode) {
		this.name = name;
		this.color = color;
	}
}

export interface IBoard {
	leftColumn: readonly BoardSpace[];
	rightColumn: readonly BoardSpace[];
	topRow: readonly BoardSpace[];
	bottomRow: readonly BoardSpace[];
}

export type BoardSide = keyof IBoard;

export interface IBoardLocation {
	side: BoardSide;
	space: number;
}

export interface IMovedBoardLocation extends IBoardLocation {
	passedSpaces: BoardSpace[];
}

export type BoardActionCard<T extends BoardGame = BoardGame> = (this: T, player: Player) => void;

// needs to be in order for getLocationAfterMovement
const boardSides: readonly BoardSide[] = ['leftColumn', 'topRow', 'rightColumn', 'bottomRow'];

export abstract class BoardGame extends ScriptedGame {
	abstract board: IBoard;
	abstract numberOfDice: number;
	abstract startingBoardSide: BoardSide;
	abstract startingBoardSideSpace: number;

	boardRound: number = 0;
	currentPlayer: Player | null = null;
	dice: number[] = [];
	doubleRolls: number = 0;
	maxPlayers: number = 25;
	playerLocations = new Map<Player, IBoardLocation>();
	playerList: Player[] = [];
	playerLetters = new Map<Player, string>();
	playerOrder: Player[] = [];
	currentPlayerReRoll: boolean = false;

	abstract getSpaceHtml(side: BoardSide, space: number, playerLocations: KeyedDict<BoardSide, Dict<Player[]>>): string;
	abstract onNextPlayer(player: Player): void;
	abstract onSpaceLanding(player: Player, spacesMoved: number, location: IMovedBoardLocation, teleported?: boolean): void;

	displayBoard(): void {
		const playerLocations: KeyedDict<BoardSide, Dict<Player[]>> = {
			leftColumn: {},
			rightColumn: {},
			topRow: {},
			bottomRow: {},
		};

		for (const id in this.players) {
			const player = this.players[id];
			if (!player.eliminated) {
				const location = this.playerLocations.get(player)!;
				if (!(location.space in playerLocations[location.side])) playerLocations[location.side][location.space] = [];
				playerLocations[location.side][location.space].push(player);
			}
		}

		const topCorner = this.board.leftColumn.length - 1;
		const rightColumnOffset = this.board.rightColumn.length - 1;

		let html = '<div class="infobox"><table align="center" border="2" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			(25 * (this.board.topRow.length + 2)) + 'px">';
		for (let i = this.board.leftColumn.length - 1; i >= 0; i--) {
			html += "<tr style='height:25px'>";
			html += this.getSpaceHtml('leftColumn', i, playerLocations);
			if (i === topCorner) {
				for (let j = 0; j < this.board.topRow.length; j++) {
					html += this.getSpaceHtml('topRow', j, playerLocations);
				}
			} else if (i === 0) {
				for (let j = this.board.bottomRow.length - 1; j >= 0; j--) {
					html += this.getSpaceHtml('bottomRow', j, playerLocations);
				}
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				for (const space of this.board.bottomRow) {
					html += "<td>&nbsp;</td>";
				}
			}
			html += this.getSpaceHtml('rightColumn', rightColumnOffset - i, playerLocations);
			html += "</tr>";
		}
		html += "</table></div>";

		this.sayUhtml(this.uhtmlBaseName + '-board', html);
	}

	onStart(): void {
		const letters = Tools.letters.toUpperCase().split("");
		this.playerOrder = this.shufflePlayers();
		for (const player of this.playerOrder) {
			this.playerLocations.set(player, {side: this.startingBoardSide, space: this.startingBoardSideSpace});
			const playerLetter = letters[0];
			letters.shift();
			this.playerLetters.set(player, playerLetter);
			player.say("You will play as **" + playerLetter + "** for " + this.name + "!");
		}

		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		if (this.getRemainingPlayerCount() < 2) return this.end();
		if (!this.playerList.length) {
			this.boardRound++;
			this.playerList = this.playerOrder.slice();
			const uhtmlName = this.uhtmlBaseName + '-round';
			const html = this.getRoundHtml(players => this.getPlayerLetters(players), this.getRemainingPlayers(this.playerOrder),
				"Round " + this.boardRound);
			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
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

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.addBits(this.players[i], 500);
			this.winners.set(this.players[i], 1);
		}

		this.announceWinners();
	}

	getSpaceLocation(space: BoardSpace): IBoardLocation | null {
		for (const side of boardSides) {
			for (let i = 0; i < this.board[side].length; i++) {
				if (this.board[side][i] === space) return {side, space: i};
			}
		}

		return null;
	}

	getLocationAfterMovement(startingLocation: IBoardLocation, spacesMoved: number): IMovedBoardLocation {
		let side: BoardSide = startingLocation.side;
		let space: number = startingLocation.space;
		const forward = spacesMoved > 0;
		if (spacesMoved < 0) spacesMoved *= -1;
		const passedSpaces: BoardSpace[] = [];
		for (let i = 0; i < spacesMoved; i++) {
			passedSpaces.push(this.board[side][space]);

			let changeSides = false;
			if (forward) {
				space++;
				changeSides = space >= this.board[side].length;
			} else {
				space--;
				changeSides = space < 0;
			}

			if (changeSides) {
				const sideIndex = boardSides.indexOf(side);
				let nextSideIndex = forward ? sideIndex + 1 : sideIndex - 1;
				if (nextSideIndex === boardSides.length) {
					nextSideIndex = 0;
				} else if (nextSideIndex < 0) {
					nextSideIndex = boardSides.length - 1;
				}

				side = boardSides[nextSideIndex];
				if (forward) {
					space = 0;
				} else {
					space = this.board[side].length - 1;
				}
			}
		}

		return {side, space, passedSpaces};
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
		location.side = locationAfterMovement.side;
		location.space = locationAfterMovement.space;

		this.displayBoard();

		this.onSpaceLanding(player, rollAmount, locationAfterMovement);
	}

	getPlayerLetters(players?: PlayerList): string {
		return this.getPlayerAttributes(player => player.name + " (" + this.playerLetters.get(player) + ")", players).join(', ');
	}

	onPlayerRoll?(player: Player): boolean;
}

const tests: GameFileTests<BoardGame> = {
	'it should have equal size columns and rows': {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		test(game): void {
			assertStrictEqual(game.board.leftColumn.length, game.board.rightColumn.length);
			assertStrictEqual(game.board.topRow.length, game.board.bottomRow.length);
		},
	},
	'it should properly determine space order in getLocationAfterMovement': {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		test(game): void {
			// forward movement
			let locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: 0}, 1);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: 0}, 2);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 2);

			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: game.board['leftColumn'].length - 1}, 1);
			assertStrictEqual(locationAfterMovement.side, 'topRow');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: game.board['leftColumn'].length - 1},
				game.board['topRow'].length + 1);
			assertStrictEqual(locationAfterMovement.side, 'rightColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'topRow', space: 0}, 1);
			assertStrictEqual(locationAfterMovement.side, 'topRow');
			assertStrictEqual(locationAfterMovement.space, 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'topRow', space: game.board['topRow'].length - 1}, 1);
			assertStrictEqual(locationAfterMovement.side, 'rightColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'topRow', space: game.board['topRow'].length - 1},
				game.board['rightColumn'].length + 1);
			assertStrictEqual(locationAfterMovement.side, 'bottomRow');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'rightColumn', space: 0}, 1);
			assertStrictEqual(locationAfterMovement.side, 'rightColumn');
			assertStrictEqual(locationAfterMovement.space, 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'rightColumn', space: game.board['rightColumn'].length - 1}, 1);
			assertStrictEqual(locationAfterMovement.side, 'bottomRow');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'rightColumn', space: game.board['rightColumn'].length - 1},
				game.board['bottomRow'].length + 1);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'bottomRow', space: 0}, 1);
			assertStrictEqual(locationAfterMovement.side, 'bottomRow');
			assertStrictEqual(locationAfterMovement.space, 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'bottomRow', space: game.board['bottomRow'].length - 1}, 1);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'bottomRow', space: game.board['bottomRow'].length - 1},
				game.board['leftColumn'].length + 1);
			assertStrictEqual(locationAfterMovement.side, 'topRow');
			assertStrictEqual(locationAfterMovement.space, 0);

			// backward movement
			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: 1}, -1);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: 2}, -2);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, 0);

			locationAfterMovement = game.getLocationAfterMovement({side: 'topRow', space: 0}, -1);
			assertStrictEqual(locationAfterMovement.side, 'leftColumn');
			assertStrictEqual(locationAfterMovement.space, game.board['leftColumn'].length - 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'rightColumn', space: 0}, -1);
			assertStrictEqual(locationAfterMovement.side, 'topRow');
			assertStrictEqual(locationAfterMovement.space, game.board['topRow'].length - 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'bottomRow', space: 0}, -1);
			assertStrictEqual(locationAfterMovement.side, 'rightColumn');
			assertStrictEqual(locationAfterMovement.space, game.board['rightColumn'].length - 1);

			locationAfterMovement = game.getLocationAfterMovement({side: 'leftColumn', space: 0}, -1);
			assertStrictEqual(locationAfterMovement.side, 'bottomRow');
			assertStrictEqual(locationAfterMovement.space, game.board['bottomRow'].length - 1);
		},
	},
	'it should have properly initialized board spaces': {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		test(game): void {
			let location: IMovedBoardLocation = {side: 'leftColumn', space: 0, passedSpaces: []};
			let spaceId = location.side + ": " + location.space;
			let space = game.board[location.side][location.space];
			const totalSpaces = (game.board.leftColumn.length * 2) + (game.board.topRow.length * 2);
			for (let i = 0; i < totalSpaces; i++) {
				location = game.getLocationAfterMovement(location, 1);
				spaceId = location.side + ": " + location.space;
				space = game.board[location.side][location.space];
				assert(space, spaceId);
				assert(space.name, spaceId);
				assert(space.color, spaceId);
			}
		},
	},
};

export const game: IGameTemplateFile<BoardGame> = {
	category: 'board',
	scriptedOnly: true,
	tests,
};
