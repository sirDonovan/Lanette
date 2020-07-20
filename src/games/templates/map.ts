import type { Player } from "../../room-activity";
import { Game } from "../../room-game";
import type { GameCommandDefinitions, GameCommandReturnType, IGameAchievement, IGameTemplateFile } from "../../types/games";
import type { User } from "../../users";

interface ISpaceAttributes {
	achievement?: boolean;
	currency?: boolean;
	event?: string;
	exit?: boolean;
	fragments?: number;
	trap?: boolean;
}

const mapKey: {currency: string; empty: string; exit: string; player: string; trap: string; unknown: string} = {
	currency: 'o',
	empty: '-',
	exit: '[]',
	player: '*',
	trap: 'X',
	unknown: '?',
};

export class MapFloorSpace {
	attributes: ISpaceAttributes = {};
	players = new Set<Player>();
	traversedAttributes: PartialKeyedDict<keyof ISpaceAttributes, Set<Player>> = {};

	coordinates: string;

	constructor(coordinates: string) {
		this.coordinates = coordinates;
	}

	reset(): void {
		this.attributes = {};
		this.players.clear();
	}

	hasAttributes(): boolean {
		return !!Object.keys(this.attributes).length;
	}

	addPlayer(player: Player): void {
		this.players.add(player);
	}

	removePlayer(player: Player): void {
		this.players.delete(player);
	}
}

export class MapFloor {
	attributes: ISpaceAttributes = {};
	spaces: Dict<MapFloorSpace> = {};
	traversedCoordinates: Dict<Set<Player>> = {};

	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	reset(): void {
		for (const i in this.spaces) {
			this.spaces[i].reset();
		}
	}
}

export class GameMap {
	floors: MapFloor[] = [];

	reset(): void {
		for (const floor of this.floors) {
			floor.reset();
		}
	}
}

export abstract class MapGame extends Game {
	abstract currency: string = '';
	abstract maxDimensions: number;
	abstract minDimensions: number;

	baseX: number = 0;
	baseY: number = 0;
	canMove: boolean = false;
	currentFloor: number = 1;
	dimensions: number = 0;
	lives = new Map<Player, number>();
	maxMovement: number = 3;
	maxRound: number = 20;
	minMovement: number = 1;
	moveCommands: string[] = ['up', 'down', 'left', 'right'];
	playerCoordinates = new Map<Player, number[]>();
	points = new Map<Player, number>();
	roundsWithoutCurrency = new Map<Player, number>();

	escapedPlayers?: Map<Player, boolean> | null = null;
	noCurrencyAchievement?: IGameAchievement;
	noCurrencyRound?: number;
	recklessAdventurerAchievement?: IGameAchievement;
	recklessAdventurerRound?: number;
	roundActions?: Map<Player, boolean> | null = null;
	trappedPlayers?: Map<Player, string> | null = null;

	abstract getMap(player?: Player): GameMap;
	abstract getFloorIndex(player?: Player): number;
	abstract onEnd(): void;
	abstract onMaxRound(): void;
	abstract onNextRound(): void;

	coordinatesToString(x: number, y: number): string {
		return x + ', ' + y;
	}

	stringToCoordinates(coordinates: string): string[] {
		return coordinates.split(",").map(x => x.trim());
	}

	generateMap(x: number, y?: number): GameMap {
		if (x < this.minDimensions) {
			x = this.minDimensions;
		} else if (x > this.maxDimensions) {
			x = this.maxDimensions;
		}
		if (y) {
			if (y < this.minDimensions) {
				y = this.minDimensions;
			} else if (y > this.maxDimensions) {
				y = this.maxDimensions;
			}
		} else {
			y = x;
		}
		this.baseX = x;
		this.baseY = y;
		const map = new GameMap();
		for (let i = 0; i < this.currentFloor; i++) {
			this.generateMapFloor(map);
		}

		if (this.onGenerateMap) this.onGenerateMap(map);
		return map;
	}

	generateMapFloor(map: GameMap, x?: number, y?: number): void {
		if (!x) x = this.baseX;
		if (!y) y = this.baseY;
		const floor = new MapFloor(x, y);
		for (let i = 0; i < x; i++) {
			for (let j = 0; j < y; j++) {
				const coordinates = this.coordinatesToString(i, j);
				floor.spaces[coordinates] = new MapFloorSpace(coordinates);
			}
		}
		map.floors.push(floor);
		if (this.onGenerateMapFloor) this.onGenerateMapFloor(floor);
	}

	getExitCoordinates(floorIndex: number, player?: Player): string[] {
		const exitCoordinates: string[] = [];
		const floor = this.getMap(player).floors[floorIndex];
		for (const i in floor.spaces) {
			const space = floor.spaces[i];
			if (space.attributes.exit) exitCoordinates.push(space.coordinates);
		}

		return exitCoordinates;
	}

	positionPlayer(player: Player): void {
		const map = this.getMap(player);
		const floorIndex = this.getFloorIndex(player);
		const floor = map.floors[floorIndex];
		let failSafe = 0;
		let coordinates = [this.random(floor.x), this.random(floor.y)];
		let stringCoordinates = this.coordinatesToString(coordinates[0], coordinates[1]);
		while (floor.spaces[stringCoordinates].players.size) {
			coordinates = [this.random(floor.x), this.random(floor.y)];
			stringCoordinates = this.coordinatesToString(coordinates[0], coordinates[1]);
			failSafe++;
			if (failSafe > 50) break;
		}
		this.playerCoordinates.set(player, coordinates.slice());
		if (!(stringCoordinates in floor.traversedCoordinates)) floor.traversedCoordinates[stringCoordinates] = new Set();
		floor.traversedCoordinates[stringCoordinates].add(player);
		floor.spaces[stringCoordinates].addPlayer(player);
		player.say("You were teleported to (" + coordinates + ").");
		this.displayMap(player);
	}

	positionPlayers(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.positionPlayer(this.players[i]);
		}
	}

	displayMap(player: Player): void {
		const map = this.getMap(player);
		const floorIndex = this.getFloorIndex(player);
		const floor = map.floors[floorIndex];
		const displayDimensions = Math.min(floor.y, Math.min(floor.x, 8));
		const width = 100 / displayDimensions;
		const playerCoordindates = this.playerCoordinates.get(player)!;
		const playerStringCoordinates = this.coordinatesToString(playerCoordindates[0], playerCoordindates[1]);

		let endX: number;
		if (playerCoordindates[0] > displayDimensions - 1) {
			endX = playerCoordindates[0] + 1;
		} else {
			endX = displayDimensions;
		}
		const startX = endX - displayDimensions;

		let startY: number;
		if (playerCoordindates[1] > displayDimensions - 1) {
			startY = playerCoordindates[1];
		} else {
			startY = displayDimensions - 1;
		}
		const endY = startY - displayDimensions;

		let currency = false;
		let empty = false;
		let exit = false;
		let trap = false;
		let mapHtml = '';
		for (let y = startY; y > endY; y--) {
			for (let x = startX; x < endX; x++) {
				const coordinates = this.coordinatesToString(x, y);
				const space = floor.spaces[coordinates];
				mapHtml += '<span title="' + coordinates + '">';
				if (coordinates === playerStringCoordinates) {
					mapHtml += '<div style="float: left; width: ' + width + '%"><blink>*</blink></div>';
				} else if (space.traversedAttributes.currency && space.traversedAttributes.currency.has(player)) {
					mapHtml += '<div style="float: left; width: ' + width + '%">' + mapKey.currency + '</div>';
					if (!currency) currency = true;
				} else if (space.traversedAttributes.exit && space.traversedAttributes.exit.has(player)) {
					mapHtml += '<div style="float: left; width: ' + width + '%">' + mapKey.exit + '</div>';
					if (!exit) exit = true;
				} else if (space.traversedAttributes.trap && space.traversedAttributes.trap.has(player)) {
					mapHtml += '<div style="float: left; width: ' + width + '%">' + mapKey.trap + '</div>';
					if (!trap) trap = true;
				} else if (coordinates in floor.traversedCoordinates && floor.traversedCoordinates[coordinates].has(player)) {
					mapHtml += '<div style="float: left; width: ' + width + '%">' + mapKey.empty + '</div>';
					if (!empty) empty = true;
				} else {
					mapHtml += '<div style="float: left; width: ' + width + '%">' + mapKey.unknown + '</div>';
				}
				mapHtml += "</span>";
			}
			mapHtml += '<br>';
		}
		let html = '<div class="infobox">';
		let legend = '<b>Map legend</b>:<br />';
		legend += '<b>' + mapKeys.player + '</b>: your current location<br />';
		legend += '<b>' + mapKeys.unknown + '</b>: an unknown space<br />';
		if (currency) legend += '<b>' + mapKeys.currency + '</b>: ' + this.currency + ' that you have discovered<br />';
		if (empty) legend += '<b>' + mapKeys.empty + '</b>: an empty space<br />';
		if (exit) legend += '<b>' + mapKeys.exit + '</b>: an exit that you have discovered<br />';
		if (trap) legend += '<b>' + mapKeys.trap + '</b>: a trap that you have discovered<br />';
		html += legend + '<br />';
		html += mapHtml;
		html += '</div>';

		player.sayUhtml(html, this.uhtmlBaseName + "-map");
	}

	onRegularSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		player.say("You travelled" + (floor.attributes.trap ? " safely" : "") + " to (" + space.coordinates + ").");
	}

	checkCurrencySpace(player: Player, floor: MapFloor, space: MapFloorSpace): boolean {
		if (!space.traversedAttributes.currency) space.traversedAttributes.currency = new Set();
		if (space.traversedAttributes.currency.has(player)) return false;
		space.traversedAttributes.currency.add(player);
		return true;
	}

	onCurrencySpace(player: Player, floor: MapFloor, space: MapFloorSpace): number {
		if (!this.checkCurrencySpace(player, floor, space)) return 0;
		let points = this.points.get(player) || 0;
		const amount = ((Math.floor(Math.random() * 7) + 1) * 100) + ((Math.floor(Math.random() * 9) + 1) * 10) +
			(Math.floor(Math.random() * 9) + 1);
		points += amount;
		this.points.set(player, points);
		player.say("You arrived at (" + space.coordinates + ") and found **" + amount + " " + this.currency + "**! Your collection " +
			"is now " + points + ".");
		return amount;
	}

	/** Returns `false` if the player gets eliminated by the trap */
	onTrapSpace(player: Player, floor: MapFloor, space: MapFloorSpace): boolean {
		let lives = this.lives.get(player)!;
		lives -= 1;
		this.lives.set(player, lives);
		if (!space.traversedAttributes.trap) space.traversedAttributes.trap = new Set();
		space.traversedAttributes.trap.add(player);
		if (!lives) {
			player.say("You arrived at (" + space.coordinates + ") and fell into a trap!");
			this.eliminatePlayer(player, "You ran out of lives!");
			if (this.recklessAdventurerAchievement && this.round === this.recklessAdventurerRound) {
				this.unlockAchievement(player, this.recklessAdventurerAchievement);
			}
			return false;
		} else {
			player.say("You arrived at (" + space.coordinates + ") and fell into a trap! You have **" + lives + " " + (lives > 1 ?
				"lives" : "life") + "** left.");
		}
		return true;
	}

	onExitSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		player.say("You arrived at (" + space.coordinates + ") and found an exit! You are now safe and will earn your bits at the end " +
			"of the game.");
		if (this.round < this.maxRound) {
			player.say("If you are brave, you may continue travelling to collect more " + this.currency + " but **you must find your way " +
				"to an exit** before time is up!");
		}
		if (this.escapedPlayers) this.escapedPlayers.set(player, true);
		player.eliminated = true;
		if (!space.traversedAttributes.exit) space.traversedAttributes.exit = new Set();
		space.traversedAttributes.exit.add(player);
	}

	movePlayer(player: Player, position: number[]): void {
		const map = this.getMap(player);
		const floorIndex = this.getFloorIndex(player);
		const floor = map.floors[floorIndex];

		const oldPlayerCoordinates = this.playerCoordinates.get(player)!;
		const oldPlayerStringCoordinates = this.coordinatesToString(oldPlayerCoordinates[0], oldPlayerCoordinates[1]);
		floor.spaces[oldPlayerStringCoordinates].removePlayer(player);
		const newPlayerCoordinates = this.coordinatesToString(position[0], position[1]);
		const space = floor.spaces[newPlayerCoordinates];
		space.addPlayer(player);
		if (!(space.coordinates in floor.traversedCoordinates)) floor.traversedCoordinates[space.coordinates] = new Set();
		floor.traversedCoordinates[space.coordinates].add(player);

		let currencySpace = false;
		let regularSpace = false;
		if (space.attributes.currency) {
			if (!this.onCurrencySpace(player, floor, space)) {
				regularSpace = true;
			} else {
				this.roundsWithoutCurrency.delete(player);
				currencySpace = true;
			}
		} else if (space.attributes.trap) {
			if (!this.onTrapSpace(player, floor, space)) return;
		} else if (space.attributes.exit) {
			this.onExitSpace(player, floor, space);
			return;
		} else if (space.attributes.achievement) {
			if (this.onAchievementSpace) {
				this.onAchievementSpace(player, floor, space);
			} else {
				regularSpace = true;
			}
		} else if (space.attributes.event) {
			let event;
			if (this.onEventSpace) event = this.onEventSpace(player, floor, space);
			if (event === false) return;
			if (!event) regularSpace = true;
		} else {
			regularSpace = true;
		}
		if (regularSpace) this.onRegularSpace(player, floor, space);

		this.displayMap(player);

		if (!currencySpace && this.noCurrencyAchievement) {
			let roundsWithoutCurrency = this.roundsWithoutCurrency.get(player) || 0;
			roundsWithoutCurrency++;
			this.roundsWithoutCurrency.set(player, roundsWithoutCurrency);
			if (roundsWithoutCurrency === this.noCurrencyRound) this.unlockAchievement(player, this.noCurrencyAchievement);
		}
	}

	findOpenFloorSpace(floor: MapFloor): MapFloorSpace | null {
		let attempts = 0;
		let coordinates = this.coordinatesToString(this.random(floor.x), this.random(floor.y));
		let openSpace = false;
		while (!openSpace) {
			coordinates = this.coordinatesToString(this.random(floor.x), this.random(floor.y));
			openSpace = !floor.spaces[coordinates].hasAttributes();
			attempts++;
			if (attempts > 50) break;
		}
		if (!openSpace) return null;
		return floor.spaces[coordinates];
	}

	setExitCoordinates(floor: MapFloor, exits?: number): void {
		if (!exits) exits = floor.y;
		for (let i = 0; i < exits; i++) {
			const space = this.findOpenFloorSpace(floor);
			if (!space) continue;
			space.attributes.exit = true;
			if (!floor.attributes.exit) floor.attributes.exit = true;
		}
	}

	setCurrencyCoordinates(floor: MapFloor, currencySpaces?: number): void {
		if (!currencySpaces) currencySpaces = (floor.y >= 10 ? 25 : Math.round(floor.y * 2));
		for (let i = 0; i < currencySpaces; i++) {
			const space = this.findOpenFloorSpace(floor);
			if (!space) continue;
			space.attributes.currency = true;
			if (!floor.attributes.currency) floor.attributes.currency = true;
		}
	}

	setTrapCoordinates(floor: MapFloor, traps?: number): void {
		if (!traps) traps = floor.y >= 10 ? Math.round(floor.y * 1.5) : floor.y;
		for (let i = 0; i < traps; i++) {
			const space = this.findOpenFloorSpace(floor);
			if (!space) continue;
			space.attributes.trap = true;
			if (!floor.attributes.trap) floor.attributes.trap = true;
		}
	}

	setAchievementCoordinates(floor: MapFloor): void {
		const space = this.findOpenFloorSpace(floor);
		if (space) {
			space.attributes.achievement = true;
			floor.attributes.achievement = true;
		}
	}

	radiateFromCoordinates(coordinates: string[], radius?: number): string[] {
		if (!radius || radius < 1) radius = 1;
		const radiated: string[] = [];
		let centers: string[][] = [coordinates];
		let squares: string[][] = [];
		while (centers.length) {
			for (const center of centers) {
				const x = parseInt(center[0]);
				const y = parseInt(center[1]);
				const left = x - 1;
				const right = x + 1;
				const up = y + 1;
				const down = y - 1;
				const square = [
					this.coordinatesToString(left, up), this.coordinatesToString(x, up), this.coordinatesToString(right, up),
					this.coordinatesToString(left, y), this.coordinatesToString(x, y), this.coordinatesToString(right, y),
					this.coordinatesToString(left, down), this.coordinatesToString(x, down), this.coordinatesToString(right, down),
				];
				squares.push(square);
				for (const coords of square) {
					if (!radiated.includes(coords)) radiated.push(coords);
				}
			}
			centers = [];
			radius--;
			if (radius > 0) {
				for (const square of squares) {
					centers.push(this.stringToCoordinates(square[0]), this.stringToCoordinates(square[2]),
						this.stringToCoordinates(square[6]), this.stringToCoordinates(square[8]));
				}
				squares = [];
			}
		}

		return radiated.sort();
	}

	move(target: string, user: User, cmd: string): boolean {
		if (!this.canMove) return false;
		const player = this.players[user.id];
		if (this.roundActions && this.roundActions.has(player)) return false;

		let eliminatedPlayer;
		if (player.eliminated) {
			if (this.escapedPlayers) {
				if (!this.escapedPlayers.has(player)) return false;
				this.escapedPlayers.delete(player);
				player.eliminated = false;
				eliminatedPlayer = true;
			} else {
				return false;
			}
		}

		if (this.trappedPlayers && this.trappedPlayers.has(player)) {
			player.say("You are trapped and cannot move!");
			return false;
		}
		const spacesToMove = target ? parseInt(target.trim().split(" ")[0]) : 1;
		if (isNaN(spacesToMove)) {
			player.say("Please input a valid number.");
			return false;
		}
		if (spacesToMove < this.minMovement || spacesToMove > this.maxMovement) {
			player.say("You may only move between " + this.minMovement + " and " + this.maxMovement + " spaces.");
			return false;
		}

		const playerCoordinates = this.playerCoordinates.get(player)!;
		const map = this.getMap(player);
		const floorIndex = this.getFloorIndex(player);
		const floor = map.floors[floorIndex];
		if (cmd === 'left') {
			const newPlayerCoordinate = playerCoordinates[0] - spacesToMove;
			if (newPlayerCoordinate < 0) {
				player.say("Oops! Moving " + spacesToMove + " space" + (spacesToMove > 1 ? "s" : "") + " in that direction would hit a " +
					"boundary");
				return false;
			}
			playerCoordinates[0] = newPlayerCoordinate;
		} else if (cmd === 'right') {
			const newPlayerCoordinate = playerCoordinates[0] + spacesToMove;
			if (newPlayerCoordinate >= floor.x) {
				player.say("Oops! Moving " + spacesToMove + " space" + (spacesToMove > 1 ? "s" : "") + " in that direction would hit a " +
					"boundary");
				return false;
			}
			playerCoordinates[0] = newPlayerCoordinate;
		} else if (cmd === 'up') {
			const newPlayerCoordinate = playerCoordinates[1] + spacesToMove;
			if (newPlayerCoordinate >= floor.y) {
				player.say("Oops! Moving " + spacesToMove + " space" + (spacesToMove > 1 ? "s" : "") + " in that direction would hit a " +
					"boundary");
				return false;
			}
			playerCoordinates[1] = newPlayerCoordinate;
		} else if (cmd === 'down') {
			const newPlayerCoordinate = playerCoordinates[1] - spacesToMove;
			if (newPlayerCoordinate < 0) {
				player.say("Oops! Moving " + spacesToMove + " space" + (spacesToMove > 1 ? "s" : "") + " in that direction would hit a " +
					"boundary");
				return false;
			}
			playerCoordinates[1] = newPlayerCoordinate;
		}

		this.movePlayer(player, playerCoordinates);
		if (this.roundActions) this.roundActions.set(player, true);
		if (eliminatedPlayer) this.increaseOnCommandsMax(this.moveCommands, 1);

		return true;
	}

	onAchievementSpace?(player: Player, floor: MapFloor, space: MapFloorSpace): void;
	onEventSpace?(player: Player, floor: MapFloor, space: MapFloorSpace): boolean | null;
	onGenerateMap?(map: GameMap): void;
	onGenerateMapFloor?(floor: MapFloor): void;
}

const commands: GameCommandDefinitions<MapGame> = {
	/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
	up: {
		command(target, room, user): GameCommandReturnType {
			return this.move(target, user, 'up');
		},
		eliminatedGameCommand: true,
	},
	down: {
		command(target, room, user): GameCommandReturnType {
			return this.move(target, user, 'down');
		},
		eliminatedGameCommand: true,
	},
	left: {
		command(target, room, user): GameCommandReturnType {
			return this.move(target, user, 'left');
		},
		eliminatedGameCommand: true,
	},
	right: {
		command(target, room, user): GameCommandReturnType {
			return this.move(target, user, 'right');
		},
		eliminatedGameCommand: true,
	},
	/* eslint-enable */
};

export const game: IGameTemplateFile<MapGame> = {
	category: 'map',
	commandDescriptions: [Config.commandCharacter + 'up/down/left/right [spaces]'],
	commands,
};
