import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assert } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile, PlayerList } from "../types/games";
import type { IHexCodeData, NamedHexCode } from "../types/tools";

class Location {
	hasCandy: boolean = false;
	unlocksDoor: Door | null = null;

	canMoveThrough: boolean;
	color: IHexCodeData;

	constructor(canMoveThrough: boolean, color: NamedHexCode) {
		this.canMoveThrough = canMoveThrough;
		this.color = Tools.getNamedHexCode(color);
	}

	getColor(): IHexCodeData {
		return this.color;
	}

	getText(): string {
		return "";
	}
}

class Door extends Location {
	number: number;

	constructor(number: number) {
		super(false, tileColors.door);

		this.number = number;
	}

	getColor() {
		if (this.canMoveThrough) {
			return Tools.getNamedHexCode(tileColors.unlockedDoor);
		} else {
			return super.getColor();
		}
	}

	getText() {
		return "" + this.number;
	}
}

class Switch extends Location {
	number: number;

	constructor(door: Door) {
		super(true, tileColors.switch);

		this.unlocksDoor = door;
		this.number = door.number;
	}

	getText() {
		return "" + this.number;
	}
}

class CandyLocation extends Location {
	constructor() {
		super(true, tileColors.candy);
	}

	getText() {
		if (this.hasCandy) return "C";
		return "";
	}
}

class Ghost {
	column: number;
	hauntNextTurn: boolean;
	name: string;
	row: number;
	turnMoves: number;

	constructor(name: string, row: number, column: number, turnMovements: number, hauntNextTurn: boolean) {
		this.name = name;
		this.row = row;
		this.column = column;
		this.turnMoves = turnMovements;
		this.hauntNextTurn = hauntNextTurn;
	}
}

const setupTileAttempts = 100;
const setupBoardAttempts = 500;
const moveGhostAttempts = 1000;
const boardConnectivity = 3;
const maxCandyCount = 6;
const minCandyCount = 3;
const haunterCount = 4;
const mimikyuCount = 1;
const gengarCount = 2;
const dusclopsCount = 1;
const candyLimit = 3000;

// how far we will check in each direction for room connectivity
const roomConnectivityChecks = [-2, -1, 1, 2];
// right/left/down/up
const moveDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];

interface ITileColors {
	players: NamedHexCode;
	wall: NamedHexCode;
	candy: NamedHexCode;
	ghost: NamedHexCode;
	ghostFrenzy: NamedHexCode;
	door: NamedHexCode;
	unlockedDoor: NamedHexCode;
	switch: NamedHexCode;
}

interface ITileValues {
	blank: number;
	wall: number;
	candy: number;
	haunter: number;
	gengar: number;
	mimikyu: number;
	dusclops: number;
}

const tileColors: ITileColors = {
	players: "Cyan",
	wall: "Light-Gray",
	candy: "Pink",
	ghost: "Light-Violet",
	ghostFrenzy: "Light-Red",
	door: "Orange",
	unlockedDoor: "Green",
	switch: "Yellow",
};

const tileValues: ITileValues = {
	blank: 0,
	wall: -1,
	candy: -4,
	haunter: -5,
	gengar: -6,
	mimikyu: -7,
	dusclops: -8,
};

const canMoveThroughSymbol = "-";

class HauntersHauntedHouse extends ScriptedGame {
	actionCommands: string[] = ['up', 'down', 'left', 'right', 'wait'];
	board: Location[][] = [];
	boardSize: number = 13;
	lastRowIndex: number = 0;
	lastColumnIndex: number = 0;
	candyLocations: CandyLocation[] = [];
	canMove: boolean = false;
	collectedCandy: number = 0;
	eliminatedPlayers = new Set<Player>();
	maxPlayers = 15;
	mimikyuHaunt: boolean = false;
	mimikyuTrapped: boolean = false;
	ghosts: Ghost[] = [];
	ghostFrenzies: number = 0;
	playerLocations = new Map<Player, [number, number]>();
	playerNumbers = new Map<Player, number>();
	playerRemainingTurnMoves = new Map<Player, number>();
	remainingGhostMoves: number = 0;
	roundTime: number = 30 * 1000;
	turnsWithoutHaunting: number = 0;

	createHaunter(row: number, column: number): Ghost {
		return new Ghost("Haunter", row, column, 1, false);
	}

	createGengar(row: number, column: number): Ghost {
		return new Ghost("Gengar", row, column, 2, false);
	}

	createMimikyu(row: number, column: number): Ghost {
		return new Ghost("Mimikyu", row, column, 2, false);
	}

	createDusclops(row: number, column: number): Ghost {
		return new Ghost("Dusclops", row, column, 1, true);
	}

	createBlankLocation(): Location {
		return new Location(true, "White");
	}

	createWall(): Location {
		return new Location(false, tileColors.wall);
	}

	find(p: number[], x: number): number {
		if (p[x] === x) return x;
		return this.find(p, p[x]);
	}

	union(p: number[], x: number, y: number): void {
		const x1 = this.find(p, x);
		const y1 = this.find(p, y);
		p[x1] = y1;
	}

	areConnectedTiles(p: number[], distanceX: number, distanceY: number): boolean {
		return this.find(p, distanceX) === this.find(p, distanceY);
	}

	inOnBoard(row: number, column: number): boolean {
		return row >= 0 && column >= 0 && row < this.boardSize && column < this.boardSize;
	}

	countBlankTileDistance(board: number[][], row: number, column: number, value: number, positions: number[][][]): void {
		if (board[row][column] !== tileValues.blank) return;

		positions[value].push([row, column]);
		board[row][column] = value;
		for (const direction of moveDirections) {
			const newRow = row + direction[0];
			const newColumn = column + direction[1];
			if (!this.inOnBoard(newRow, newColumn)) continue;
			this.countBlankTileDistance(board, newRow, newColumn, value, positions);
		}
	}

	getMinMaxCoordinates(x: number, y: number): [number, number] {
		return [Math.min(x, y), Math.max(x, y)];
	}

	setTile(board: number[][], roomPositions: number[][][], roomOptions: number[], maxTiles: number, tileValue: number,
		noRepeats: boolean): number[] {
		const setRooms: number[] = [];

		let attempts = 0;
		while (roomOptions.length && setRooms.length < maxTiles && attempts < setupTileAttempts) {
			attempts++;

			const room = this.sampleOne(roomOptions);
			const position = this.sampleOne(roomPositions[room]);
			if (board[position[0]][position[1]] < tileValues.blank) continue;

			board[position[0]][position[1]] = tileValue;
			if (noRepeats) {
				roomOptions = roomOptions.filter(r => r !== room);
			}
			setRooms.push(room);
		}

		return setRooms;
	}

	addWalls(row: number, column: number, direction: number, board: number[][]): void {
		if (direction === 0) {
			for (const amount of roomConnectivityChecks) {
				const newColumn = column + amount;
				if (!this.inOnBoard(row, newColumn) || board[row][newColumn] === tileValues.wall) return;
			}
			let i = row;
			while (board[i][column] !== tileValues.wall) {
				board[i][column] = tileValues.wall;
				if (i === 0) break;
				i--;
			}

			if (row < this.lastRowIndex) {
				i = row + 1;
				while (board[i][column] !== tileValues.wall) {
					board[i][column] = tileValues.wall;
					if (i === this.lastRowIndex) break;
					i++;
				}
			}
		} else {
			for (const amount of roomConnectivityChecks) {
				const newRow = row + amount;
				if (!this.inOnBoard(newRow, column) || board[newRow][column] === tileValues.wall) return;
			}
			let j = column;
			while (board[row][j] !== tileValues.wall) {
				board[row][j] = tileValues.wall;
				if (j === 0) break;
				j--;
			}

			if (column < this.lastColumnIndex) {
				j = column + 1;
				while (board[row][j] !== tileValues.wall) {
					board[row][j] = tileValues.wall;
					if (j === this.lastColumnIndex) break;
					j++;
				}
			}
		}
	}

	isBorderTile(x: number, y: number): boolean {
		if (x > 0 && x < this.lastRowIndex) return false;
		if (y > 0 && y < this.lastColumnIndex) return false;
		return true;
	}

	generateWallsAndTiles(): number[][] | undefined {
		const board: number[][] = [];
		// initialize board
		for (let i = 0; i < this.boardSize; i++) {
			board.push([]);
			for (let j = 0; j < this.boardSize; j++) {
				board[i].push(tileValues.blank);
			}
		}

		// generate walls
		let attempts = 0;
		while (attempts < setupTileAttempts) {
			attempts++;

			const x = this.random(this.boardSize);
			const y = this.random(this.boardSize);
			if (board[x][y] === tileValues.wall) continue;
			if (x === this.lastRowIndex && y === Math.floor(this.lastColumnIndex / 2)) continue;

			let xDistance = 0;
			let yDistance = 0;

			let i = x;
			while (board[i][y] !== tileValues.wall) {
				if (this.isBorderTile(i, y)) break;
				xDistance++;
				if (i === 0) break;
				i--;
			}

			if (x < this.lastRowIndex) {
				i = x + 1;
				while (board[i][y] !== tileValues.wall) {
					if (this.isBorderTile(i, y)) break;
					xDistance++;
					if (i === this.lastRowIndex) break;
					i++;
				}
			}

			let j = y;
			while (board[x][j] !== tileValues.wall) {
				if (this.isBorderTile(x, j)) break;
				yDistance++;
				if (j === 0) break;
				j--;
			}

			if (y < this.lastColumnIndex) {
				j = y + 1;
				while (board[x][j] !== tileValues.wall) {
					if (this.isBorderTile(x, j)) break;
					yDistance++;
					if (j === this.lastColumnIndex) break;
					j++;
				}
			}

			if (xDistance <= yDistance) {
				this.addWalls(x, y, 0, board);
			} else {
				this.addWalls(x, y, 1, board);
			}
		}

		const blankTilePositionsByDistance: number[][][] = [[]];
		let walls: number[][] = [];

		// count distance between blank tiles and get wall coordinates
		let blankTileDistance = 1;
		for (let i = 0; i < this.boardSize; i++) {
			for (let j = 0; j < this.boardSize; j++) {
				if (board[i][j] === tileValues.blank) {
					blankTilePositionsByDistance.push([]);
					this.countBlankTileDistance(board, i, j, blankTileDistance, blankTilePositionsByDistance);
					blankTileDistance++;
				} else if (board[i][j] === tileValues.wall) {
					walls.push([i, j]);
				}
			}
		}

		const startPosition = [this.lastRowIndex, Math.floor(this.boardSize / 2)];
		if (board[startPosition[0]][startPosition[1]] === tileValues.wall) {
			startPosition[1] = startPosition[1] + 1;
			if (startPosition[1] > this.lastColumnIndex) {
				startPosition[0] = startPosition[0] - 1;
				startPosition[1] = Math.floor(this.boardSize / 2);
			}
		}

		const startTile = board[startPosition[0]][startPosition[1]];
		board[startPosition[0]][startPosition[1]] = -3;

		const adjacentTiles: [distance: number, location: [number, number]][][] = [];
		const distanceAmounts: number[] = [];
		const distances: number[] = [];
		const maxDistance = this.boardSize * this.boardSize;
		for (let i = 0; i < blankTileDistance; i++) {
			distanceAmounts.push(i);
			adjacentTiles.push([]);
			distances.push(maxDistance);
		}
		distances[startTile] = 0;

		const minMaxCoordinates: [number, number][] = [];
		walls = this.shuffle(walls);
		for (const wall of walls) {
			const x = wall[0];
			const y = wall[1];
			const rightTile = board[x][y + 1] as number | undefined;
			const leftTile = board[x][y - 1] as number | undefined;
			const aboveTile = board[x - 1] ? board[x - 1][y] : undefined;
			const belowTile = board[x + 1] ? board[x + 1][y] : undefined;

			if (aboveTile && belowTile && rightTile === tileValues.wall && leftTile === tileValues.wall && belowTile >= 1 &&
				aboveTile >= 1 && !Tools.arraysContainArray(this.getMinMaxCoordinates(belowTile, aboveTile), minMaxCoordinates)) {
				if (this.areConnectedTiles(distanceAmounts, belowTile, aboveTile) && this.random(boardConnectivity) !== 0 &&
					belowTile !== startTile && aboveTile !== startTile) continue;

				board[x][y] = -2;
				adjacentTiles[belowTile].push([aboveTile, [x, y]]);
				adjacentTiles[aboveTile].push([belowTile, [x, y]]);
				minMaxCoordinates.push(this.getMinMaxCoordinates(belowTile, aboveTile));

				if (!this.areConnectedTiles(distanceAmounts, belowTile, aboveTile)) {
					this.union(distanceAmounts, belowTile, aboveTile);
				}
			} else if (leftTile && rightTile && rightTile >= 1 && leftTile >= 1 && belowTile === tileValues.wall &&
				aboveTile === tileValues.wall &&
				!Tools.arraysContainArray(this.getMinMaxCoordinates(rightTile, leftTile), minMaxCoordinates)) {
				if (rightTile !== startTile && leftTile !== startTile && this.areConnectedTiles(distanceAmounts, rightTile, leftTile) &&
					this.random(boardConnectivity) !== 0) continue;

				board[x][y] = -2;
				adjacentTiles[rightTile].push([leftTile, [x, y]]);
				adjacentTiles[leftTile].push([rightTile, [x, y]]);
				minMaxCoordinates.push(this.getMinMaxCoordinates(rightTile, leftTile));

				if (!this.areConnectedTiles(distanceAmounts, rightTile, leftTile)) {
					this.union(distanceAmounts, rightTile, leftTile);
				}
			}
		}

		const candyRoomOptions: number[] = [];
		const validDoors: [number, number[]][] = [];

		const tilesAndDistances: number[][] = [[startTile, 0]];

		attempts = 0;
		while (tilesAndDistances.length && attempts < setupTileAttempts) {
			attempts++;

			const tile = tilesAndDistances[0][0];
			const distance = tilesAndDistances[0][1];
			tilesAndDistances.shift();
			if (distances[tile] < distance) continue;

			let endRoom = true;
			for (const distanceAndLocation of adjacentTiles[tile]) {
				const adjacentDistance = distanceAndLocation[0];
				const nextDistance = distance + 1;
				if (distances[adjacentDistance] > nextDistance) {
					validDoors.push([distance, distanceAndLocation[1]]);
					distances[adjacentDistance] = nextDistance;
					tilesAndDistances.push([adjacentDistance, nextDistance]);
					endRoom = false;
				} else if (distances[adjacentDistance] === nextDistance) {
					validDoors.push([distance, distanceAndLocation[1]]);
					endRoom = false;
				}
			}

			if (endRoom) candyRoomOptions.push(tile);
		}

		const connectedDistances: number[][] = [];
		for (let i = 1; i < blankTileDistance; i++) {
			if (connectedDistances.length <= distances[i]) {
				for (let j = 0, len = connectedDistances.length; j <= distances[i]; j++) {
					if (j >= len) {
						connectedDistances.push([]);
					}
				}
			}
			connectedDistances[distances[i]].push(i);
		}

		let doorNumbers = 100;
		let doorCount = 0;

		attempts = 0;
		while (doorCount < 5 && attempts < setupTileAttempts) {
			attempts++;

			const validDoor = this.sampleOne(validDoors);
			const doorLocation = validDoor[1];
			if (board[doorLocation[0]][doorLocation[1]] >= 100 || validDoor[0] <= 0) continue;

			const validDistances: number[] = [];
			for (let i = 1; i <= validDoor[0]; i++) {
				for (const connectedDistance of connectedDistances[i]) {
					validDistances.push(connectedDistance);
				}
			}

			const switchLocation = this.sampleOne(blankTilePositionsByDistance[this.sampleOne(validDistances)]);
			if (board[switchLocation[0]][switchLocation[1]] < 0) continue;

			board[doorLocation[0]][doorLocation[1]] = doorNumbers;
			board[switchLocation[0]][switchLocation[1]] = -doorNumbers;
			doorNumbers++;
			doorCount++;
		}

		if (candyRoomOptions.length === 0) {
			for (let i = 2; i < connectedDistances.length; i++) {
				for (const connectedDistance of connectedDistances[i]) {
					candyRoomOptions.push(connectedDistance);
				}
			}
		}

		let candyRooms = this.setTile(board, blankTilePositionsByDistance, candyRoomOptions, maxCandyCount, tileValues.candy, true);
		attempts = 0;
		while (candyRooms.length < minCandyCount && attempts < setupTileAttempts) {
			attempts++;

			candyRooms = candyRooms.concat(this.setTile(board, blankTilePositionsByDistance, candyRoomOptions, 1, tileValues.candy, true));
		}

		if (candyRooms.length < minCandyCount) return;

		let ghostRoomOptions: number[] = [];
		for (let i = 2; i < connectedDistances.length; i++) {
			for (const connectedDistance of connectedDistances[i]) {
				ghostRoomOptions.push(connectedDistance);
			}
		}

		if (!this.setTile(board, blankTilePositionsByDistance, ghostRoomOptions, dusclopsCount, tileValues.dusclops, true).length) return;

		if (!this.setTile(board, blankTilePositionsByDistance, ghostRoomOptions, gengarCount, tileValues.gengar, false).length) return;

		if (!this.setTile(board, blankTilePositionsByDistance, ghostRoomOptions, mimikyuCount, tileValues.mimikyu, false).length) return;

		ghostRoomOptions = [];
		for (let i = 1; i < Math.min(4, connectedDistances.length); i++) {
			for (const connectedDistance of connectedDistances[i]) {
				ghostRoomOptions.push(connectedDistance);
			}
		}

		if (!this.setTile(board, blankTilePositionsByDistance, ghostRoomOptions, haunterCount, tileValues.haunter, false).length) return;
		return board;
	}

	getTileCoordinates(x: number, y: number): string {
		return x + ',' + y;
	}

	getBoardHtml(): string {
		let html = '<div class="infobox"><font color="black"><table align="center" border="2">';
		const playerLocations: Dict<Player[]> = {};
		for (const id in this.players) {
			const player = this.players[id];
			if (player.eliminated) continue;
			const location = this.playerLocations.get(this.players[id])!;
			const coordinates = this.getTileCoordinates(location[0], location[1]);
			if (!(coordinates in playerLocations)) playerLocations[coordinates] = [];
			playerLocations[coordinates].push(player);
		}

		const ghostLocations: Dict<string> = {};
		for (const ghost of this.ghosts) {
			const coordinates = this.getTileCoordinates(ghost.row, ghost.column);
			if (!(coordinates in ghostLocations)) ghostLocations[coordinates] = '';
			ghostLocations[coordinates] += ghost.name[0];
		}

		for (let i = 0; i < this.board.length; i++) {
			const row = this.board[i];
			html += '<tr>';
			for (let j = 0; j < row.length; j++) {
				const tile = row[j];
				let tileText = tile.getText();
				let tileColor: IHexCodeData = tile.getColor();
				const coordinates = this.getTileCoordinates(i, j);
				if (coordinates in ghostLocations) {
					tileText = ghostLocations[coordinates];
					if (this.ghostFrenzies) {
						tileColor = Tools.getNamedHexCode(tileColors.ghostFrenzy);
					} else {
						tileColor = Tools.getNamedHexCode(tileColors.ghost);
					}
				} else if (coordinates in playerLocations) {
					tileText = '<span title="' + playerLocations[coordinates].map(x => x.name).join(", ") + '">';
					if (playerLocations[coordinates].length === 1) {
						tileText += "P" + this.playerNumbers.get(playerLocations[coordinates][0]);
					} else {
						tileText += "*";
					}
					tileText += '</span>';
					tileColor = Tools.getNamedHexCode(tileColors.players);
				}

				html += '<td style=background:' + tileColor.gradient + '; width="20px"; height="20px"; align="center"><b>' +
					tileText + '</b></td>';
			}
			html += '</tr>';
		}
		html += '</table></font></div>';

		return html;
	}

	placeGhostsAndCandy(): boolean {
		this.board = [];
		this.candyLocations = [];
		this.ghosts = [];

		const tiles = this.generateWallsAndTiles();
		if (!tiles) return false;

		const switchLocations: {door: [number, number], tile: [number, number]}[] = [];
		for (let i = 0; i < this.boardSize; i++) {
			this.board.push([]);
			for (let j = 0; j < this.boardSize; j++) {
				const tile = tiles[i][j];
				if (tile === tileValues.haunter) {
					this.ghosts.push(this.createHaunter(i, j));
					this.board[i].push(this.createBlankLocation());
				} else if (tile === tileValues.gengar) {
					this.ghosts.push(this.createGengar(i, j));
					this.board[i].push(this.createBlankLocation());
				} else if (tile === tileValues.mimikyu) {
					this.ghosts.push(this.createMimikyu(i, j));
					this.board[i].push(this.createBlankLocation());
				} else if (tile === tileValues.dusclops) {
					this.ghosts.push(this.createDusclops(i, j));
					this.board[i].push(this.createBlankLocation());
				} else if (tile === tileValues.candy) {
					const candyLocation = new CandyLocation();
					this.candyLocations.push(candyLocation);
					this.board[i].push(candyLocation);
				} else if (tile === tileValues.wall) {
					this.board[i].push(this.createWall());
				} else if (tile >= 100) {
					this.board[i].push(new Door(tile - 99));
				} else if (tile <= -100) {
					for (let row = 0; row < this.boardSize; row++) {
						for (let column = 0; column < this.boardSize; column++) {
							if (tiles[row][column] === (tile * -1)) {
								switchLocations.push({door: [row, column], tile: [i, j]});
								this.board[i].push(this.createBlankLocation());
								break;
							}
						}
					}
				} else {
					this.board[i].push(this.createBlankLocation());
				}
			}
		}

		for (const location of switchLocations) {
			this.board[location.tile[0]][location.tile[1]] = new Switch(this.board[location.door[0]][location.door[1]] as Door);
		}

		this.ghosts.sort((a, b) => {
			if (a.name > b.name) return 1;
			if (b.name > a.name) return -1;
			return 0;
		}).reverse();

		return true;
	}

	setupBoard(players: Player[]): [number, number] | undefined {
		let startingLocation: [number, number] | undefined;

		let attempts = 0;
		while (!this.remainingGhostMoves && attempts < setupBoardAttempts) {
			attempts++;

			if (!this.placeGhostsAndCandy()) continue;
			this.setCandyLocations();

			let validStartingLocation = true;
			const possibleLocation = [this.lastRowIndex, Math.floor(this.lastColumnIndex / 2)];
			while (!this.board[possibleLocation[0]][possibleLocation[1]].canMoveThrough) {
				possibleLocation[1] = possibleLocation[1] + 1;
				if (possibleLocation[1] > this.lastColumnIndex) {
					possibleLocation[1] = 0;
					possibleLocation[0] = possibleLocation[0] - 1;
					if (possibleLocation[0] < 0) {
						validStartingLocation = false;
						break;
					}
				}
			}

			if (!validStartingLocation) continue;

			for (const player of players) {
				this.playerLocations.set(player, possibleLocation.slice() as [number, number]);
			}

			for (const ghost of this.ghosts) {
				this.moveGhost(ghost, true);
			}

			if (this.remainingGhostMoves) startingLocation = possibleLocation as [number, number];
		}

		return startingLocation;
	}

	onStart(): void {
		this.lastRowIndex = this.boardSize - 1;
		this.lastColumnIndex = this.lastRowIndex;

		let playerNumber = 1;
		const players = this.shufflePlayers();
		for (const player of players) {
			this.playerNumbers.set(player, playerNumber);
			playerNumber++;
		}

		const startingLocation = this.setupBoard(players);
		if (!startingLocation) {
			Tools.logMessage(this.name + " failed to generate a valid board (starting seed = " + this.prng.initialSeed + ")");
			this.errorEnd();
			return;
		}

		this.remainingGhostMoves = 0;

		for (const player of players) {
			player.say("You will play as **P" + this.playerNumbers.get(player) + "** and start at (" + startingLocation[0] +
				", " + startingLocation[1] + ") for " + this.name + "!");
		}

		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	setCandyLocations(): void {
		let locationsWithoutCandy = this.candyLocations.filter(location => !location.hasCandy);
		if (locationsWithoutCandy.length <= this.candyLocations.length - 2) return;

		locationsWithoutCandy = this.sampleMany(locationsWithoutCandy, locationsWithoutCandy.length + 2 - this.candyLocations.length);
		for (const location of locationsWithoutCandy) {
			location.hasCandy = true;
		}
	}

	onNextRound(): void {
		this.remainingGhostMoves = 0;
		this.mimikyuHaunt = false;
		if (this.getRemainingPlayerCount() === 0) {
			this.say("All players were haunted!");
			this.end();
			return;
		}

		if (this.turnsWithoutHaunting && this.turnsWithoutHaunting % 10 === 0) {
			this.ghostFrenzies++;
			this.say("The ghosts have whipped into their **" + Tools.toNumberOrderString(this.ghostFrenzies) + " frenzy**! They can " +
				"now move **" + this.ghostFrenzies + " extra space" + (this.ghostFrenzies > 1 ? "s" : "") + "** each turn.");
			for (const ghost of this.ghosts) {
				ghost.turnMoves++;
			}
		}

		for (const id in this.players) {
			this.playerRemainingTurnMoves.set(this.players[id], 3);
		}

		const uhtmlName = this.uhtmlBaseName + '-round';
		const html = this.getRoundHtml(players => this.getPlayerNumbers(players), undefined, "Round " + this.round +
			" - Collected candy: " + this.collectedCandy);
		this.onUhtml(uhtmlName, html, () => {
			const boardHtml = this.getBoardHtml();
			const boardUhtmlName = this.uhtmlBaseName + '-board';
			this.onUhtml(boardUhtmlName, boardHtml, () => {
				this.canMove = true;
				this.onCommands(this.actionCommands, {max: this.getRemainingPlayerCount(), remainingPlayersMax: true}, () => {
					if (this.timeout) clearTimeout(this.timeout);
					this.moveGhosts();
				});
				this.timeout = setTimeout(() => this.moveGhosts(), this.roundTime);
			});
			this.sayUhtml(boardUhtmlName, boardHtml);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const playersWin = this.getRemainingPlayerCount() > 0;
		const bits = Math.floor(this.collectedCandy / (playersWin ? 6 : 9));
		for (const id in this.players) {
			const player = this.players[id];
			if (player.eliminated && !this.eliminatedPlayers.has(player)) continue;
			if (playersWin) {
				this.winners.set(this.players[id], 1);
			}
			this.addBits(this.players[id], bits);
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerLocations.clear();
		this.playerNumbers.clear();
		this.playerRemainingTurnMoves.clear();
		this.eliminatedPlayers.clear();
	}

	getPlayerNumbers(players?: PlayerList): string {
		return this.getPlayerAttributes(player => {
			return this.getPlayerUsernameHtml(player.name) + " (P" + this.playerNumbers.get(player) + ")";
		}, players).join(', ');
	}

	getPlayersOnTile(row: number, column: number): Player[] {
		const players: Player[] = [];
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const location = this.playerLocations.get(player)!;
			if (location[0] === row && location[1] === column) {
				players.push(player);
			}
		}

		return players;
	}

	copyBoard(board: Location[][]): string[][] {
		const copy: string[][] = [];
		for (let i = 0; i < board.length; i++) {
			copy.push([]);
			for (const location of board[i]) {
				copy[i].push(location.canMoveThrough ? canMoveThroughSymbol : "");
			}
		}
		return copy;
	}

	moveGhost(ghost: Ghost, movementCheck?: boolean): void {
		const boardCopy = this.copyBoard(this.board);
		const frontierPaths: number[][][] = [[]];
		const frontierLocations: number[][] = [[ghost.row, ghost.column]];

		let attempts = 0;
		while (frontierPaths.length && attempts < moveGhostAttempts) {
			attempts++;

			const path = frontierPaths.shift();
			const location = frontierLocations.shift();
			if (!location || !path) return;

			const shuffledDirections = this.shuffle(moveDirections);
			for (const shuffledDirection of shuffledDirections) {
				const locationCopy = location.slice();
				locationCopy[0] += shuffledDirection[0];
				locationCopy[1] += shuffledDirection[1];
				if (locationCopy[0] >= 0 && locationCopy[1] >= 0 && locationCopy[0] <= this.lastRowIndex &&
					locationCopy[1] <= this.lastColumnIndex && boardCopy[locationCopy[0]][locationCopy[1]] === canMoveThroughSymbol) {
					const players = this.getPlayersOnTile(locationCopy[0], locationCopy[1]);
					if (players.length) {
						this.remainingGhostMoves++;
						if (!movementCheck) {
							path.push(shuffledDirection);
							let k;
							for (k = 0; k < Math.min(path.length, ghost.turnMoves + (this.mimikyuHaunt ? 1 : 0)); k++) {
								const direction = path[k];
								ghost.row += direction[0];
								ghost.column += direction[1];
							}
							if (ghost.name === "Mimikyu") {
								if (this.remainingGhostMoves === 1) this.mimikyuTrapped = true;
								if (k === path.length) this.mimikyuHaunt = true;
							} else {
								this.mimikyuTrapped = false;
							}
						}
						return;
					}

					const newPath = path.slice();
					newPath.push(shuffledDirection);
					frontierPaths.push(newPath);
					frontierLocations.push(locationCopy);
					boardCopy[locationCopy[0]][locationCopy[1]] = "";
				}
			}
		}
	}

	moveGhosts(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.offCommands(this.actionCommands);
		this.canMove = false;

		this.turnsWithoutHaunting++;
		for (const ghost of this.ghosts) {
			this.moveGhost(ghost);
		}

		let hauntedPlayer = false;
		for (const id in this.players) {
			const player = this.players[id];
			if (player.eliminated) continue;
			const location = this.playerLocations.get(player)!;
			for (const ghost of this.ghosts) {
				if (ghost.name === "Mimikyu") continue;
				const xDifference = Math.abs(location[0] - ghost.row);
				const yDifference = Math.abs(location[1] - ghost.column);
				if ((xDifference === 0 && yDifference === 0) || (ghost.hauntNextTurn && xDifference <= 1 && yDifference <= 1)) {
					this.eliminatedPlayers.add(player);
					this.say("**" + player.name + "** was haunted by **" + ghost.name + "** and eliminated from the game!");
					this.eliminatePlayer(player);
					hauntedPlayer = true;
					break;
				}
			}
		}

		if (hauntedPlayer) {
			if (this.ghostFrenzies) {
				this.say("The ghosts have calmed down and can no longer move any extra spaces.");
				for (const otherGhost of this.ghosts) {
					otherGhost.turnMoves -= this.ghostFrenzies;
				}
				this.ghostFrenzies = 0;
			}

			this.turnsWithoutHaunting = 0;
		}

		this.checkPlayerLocations();
	}

	checkPlayerLocations(): void {
		for (const row of this.board) {
			for (const tile of row) {
				if (tile instanceof Door && tile.canMoveThrough) {
					tile.canMoveThrough = false;
				}
			}
		}

		for (const id in this.players) {
			const player = this.players[id];
			if (player.eliminated) continue;
			const locations = this.playerLocations.get(player)!;
			const tile = this.board[locations[0]][locations[1]];
			if (tile.hasCandy) {
				tile.hasCandy = false;
				const candy = this.random(700) + 100;
				this.say("**" + player.name + "** collected **" + candy + "** candy for the team!");
				this.collectedCandy += candy;
			} else if (tile.unlocksDoor) {
				tile.unlocksDoor.canMoveThrough = true;
			}
		}

		const atCandyLimit = this.collectedCandy >= candyLimit;
		if (atCandyLimit || ((this.remainingGhostMoves === 0 || this.mimikyuTrapped) && this.getRemainingPlayerCount() > 0)) {
			this.say("Since " + (atCandyLimit ? "the players have collected " + candyLimit + " candy" : "all remaining players are safe " +
				"from the ghosts") + ", the players win!");
			this.collectedCandy = atCandyLimit ? candyLimit : Math.max(1200, this.collectedCandy);
			for (const id in this.players) {
				if (!this.players[id].eliminated) this.winners.set(this.players[id], 1);
			}
			this.end();
			return;
		}

		this.setCandyLocations();
		this.nextRound();
	}

	movePlayer(player: Player, target: string, direction: 'up' | 'down' | 'left' | 'right'): void {
		const spaces = target ? parseInt(target) : 1;
		if (isNaN(spaces)) {
			player.say("'" + target.trim() + "' is not a valid number of spaces.");
			return;
		}
		if (spaces < 1) {
			player.say("You must move at least one space.");
			return;
		}

		const remainingTurnMoves = this.playerRemainingTurnMoves.get(player)!;
		if (remainingTurnMoves === 0) return;

		if (spaces > remainingTurnMoves) {
			player.say("You can only move **" + remainingTurnMoves + "** more spaces this turn!");
			return;
		}

		let movement: [number, number];
		if (direction === 'up') {
			movement = [-1, 0];
		} else if (direction === 'down') {
			movement = [1, 0];
		} else if (direction === 'left') {
			movement = [0, -1];
		} else {
			movement = [0, 1];
		}

		const location = this.playerLocations.get(player)!.slice() as [number, number];
		for (let i = 0; i < spaces; i++) {
			location[0] += movement[0];
			location[1] += movement[1];
			if (location[0] < 0 || location[1] < 0 || location[0] > this.lastRowIndex || location[1] > this.lastColumnIndex) {
				player.say("Oops! Moving " + direction + " " + spaces + " space" + (spaces > 1 ? "s" : "") + " would put you over the " +
					"board!");
				return;
			} else if (!this.board[location[0]][location[1]].canMoveThrough) {
				player.say("Something is in your way and preventing you from moving " + direction + " " + spaces + " space" +
					(spaces > 1 ? "s" : ""));
				return;
			}
		}

		player.say("You have moved " + direction + " **" + spaces + "** space" + (spaces > 1 ? "s" : "") +
			" to (" + location[0] + ", " + location[1] + ")!");
		this.playerLocations.set(player, location);
		this.playerRemainingTurnMoves.set(player, remainingTurnMoves - spaces);
	}
}

const commands: GameCommandDefinitions<HauntersHauntedHouse> = {
	up: {
		command(target, room, user) {
			if (!this.canMove) return false;
			const player = this.players[user.id];
			const remainingTurnMoves = this.playerRemainingTurnMoves.get(player);
			if (remainingTurnMoves === 0) return false;
			this.movePlayer(player, target, 'up');
			return this.playerRemainingTurnMoves.get(player) === 0;
		},
	},
	down: {
		command(target, room, user) {
			if (!this.canMove) return false;
			const player = this.players[user.id];
			const remainingTurnMoves = this.playerRemainingTurnMoves.get(player);
			if (remainingTurnMoves === 0) return false;
			this.movePlayer(player, target, 'down');
			return this.playerRemainingTurnMoves.get(player) === 0;
		},
	},
	left: {
		command(target, room, user) {
			if (!this.canMove) return false;
			const player = this.players[user.id];
			const remainingTurnMoves = this.playerRemainingTurnMoves.get(player);
			if (remainingTurnMoves === 0) return false;
			this.movePlayer(player, target, 'left');
			return this.playerRemainingTurnMoves.get(player) === 0;
		},
	},
	right: {
		command(target, room, user) {
			if (!this.canMove) return false;
			const player = this.players[user.id];
			const remainingTurnMoves = this.playerRemainingTurnMoves.get(player);
			if (remainingTurnMoves === 0) return false;
			this.movePlayer(player, target, 'right');
			return this.playerRemainingTurnMoves.get(player) === 0;
		},
	},
	wait: {
		command(target, room, user) {
			if (!this.canMove) return false;
			const player = this.players[user.id];
			const remainingTurnMoves = this.playerRemainingTurnMoves.get(player);
			if (remainingTurnMoves === 0) return false;
			this.playerRemainingTurnMoves.set(player, 0);
			player.say("You have waited until the next round!");
			return true;
		},
	},
};

const tests: GameFileTests<HauntersHauntedHouse> = {
	'should properly setup the board': {
		test(game) {
			const players = addPlayers(game, game.maxPlayers);
			assert(game.started);
			if (game.timeout) clearTimeout(game.timeout);
			assert(game.setupBoard(players));
			assert(game.remainingGhostMoves);
		},
	},
	'should properly move players and ghosts': {
		test(game) {
			const players = addPlayers(game, game.maxPlayers);
			assert(game.started);
			game.nextRound();

			const directions = ['up', 'down', 'left', 'right'];
			for (let i = 0; i < 100; i++) {
				if (game.timeout) clearTimeout(game.timeout);
				game.canMove = true;

				for (const player of players) {
					if (player.eliminated) continue;

					const direction = game.sampleOne(directions);
					player.useCommand(direction, "1");
					player.useCommand(direction, "2");
					player.useCommand(direction, "3");
				}

				game.moveGhosts();
				if (game.ended) break;
			}
		},
	},
};

export const game: IGameFile<HauntersHauntedHouse> = {
	category: 'map',
	class: HauntersHauntedHouse,
	commands,
	commandDescriptions: [Config.commandCharacter + 'up/down/left/right [spaces]', Config.commandCharacter + 'wait'],
	name: "Haunter's Haunted House",
	mascot: 'Haunter',
	aliases: ['hhh'],
	description: "Players work together to unlock doors and gather candy around the board while avoiding the ghosts!",
	additionalDescription: '<details><summary>View the board legend:</summary>' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.players).gradient + '">&nbsp;</div> - Players<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.wall).gradient + '">&nbsp;</div> - Walls<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.door).gradient + '">&nbsp;</div> - Locked doors<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.unlockedDoor).gradient + '">&nbsp;</div> - Unlocked doors<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.switch).gradient + '">&nbsp;</div> - Door switches<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.ghost).gradient + '">&nbsp;</div> - Ghosts<br />' +
		'<div style="display: inline-block;width: 10px;height: 10px;' +
		'background: ' + Tools.getNamedHexCode(tileColors.candy).gradient + '">&nbsp;</div> - Candy<br /></details>',
	scriptedOnly: true,
	tests,
};
