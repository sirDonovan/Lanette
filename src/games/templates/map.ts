import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameTemplateFile } from "../../types/games";
import type { User } from "../../users";

interface ISpaceAttributes {
	achievement?: boolean;
	currency?: boolean;
	event?: string;
	exit?: boolean;
	trap?: boolean;
}

type MapKeys = 'currency' | 'empty' | 'exit' | 'player' | 'trap' | 'unknown';

export interface ISpaceDisplayData {
	description: string;
	symbol: string;
}

const mapKeys: KeyedDict<MapKeys, string> = {
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

export abstract class MapGame extends ScriptedGame {
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
	playerRoundInfo = new Map<Player, string[]>();
	points = new Map<Player, number>();
	roundsWithoutCurrency = new Map<Player, number>();
	usesHtmlPage = true;

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
		this.playerRoundInfo.set(player, ["You were teleported to (" + coordinates + ")."]);
	}

	positionPlayers(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.positionPlayer(this.players[i]);
		}
	}

	resetPlayerMovementDetails(): void {
		for (const i in this.players) {
			this.playerRoundInfo.set(this.players[i], []);
		}
	}

	updatePlayerHtmlPage(player: Player): void {
		player.sendHtmlPage(this.getPlayerHtmlPage(player));
	}

	updatePlayerHtmlPages(): void {
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated && !(this.escapedPlayers && this.escapedPlayers.has(player))) continue;
			this.updatePlayerHtmlPage(player);
		}
	}

	getPlayerHtmlPage(player: Player): string {
		const map = this.getMap(player);
		const floorIndex = this.getFloorIndex(player);
		const floor = map.floors[floorIndex];
		let html = this.getMapHtml(map, floor, player);

		html += "<br /><center><b>Round " + this.round + "</b>:<br />";
		const movementDetails = this.playerRoundInfo.get(player);
		if (movementDetails && movementDetails.length) {
			for (const detail of movementDetails) {
				html += detail + "<br />";
			}
		}

		html += "<br />";

		html += this.getPlayerControlsHtml(map, floor, player);

		html += "</center>";

		return html;
	}

	getMapHtml(map: GameMap, floor: MapFloor, player: Player): string {
		const playerCoordindates = this.playerCoordinates.get(player)!;
		const playerStringCoordinates = this.coordinatesToString(playerCoordindates[0], playerCoordindates[1]);

		let currency = false;
		let empty = false;
		let exit = false;
		let trap = false;
		const legend: Dict<string> = {
			[mapKeys.player]: 'your current location',
			[mapKeys.unknown]: 'an unknown space',
		};

		const whiteHex = Tools.getNamedHexCode('White');
		let mapHtml = '<table align="center" border="2" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			(25 * floor.x) + 'px">';
		for (let y = floor.y - 1; y >= 0; y--) {
			mapHtml += '<tr>';
			for (let x = 0; x < floor.x; x++) {
				mapHtml += "<td style='background: " + whiteHex.gradient + "'>";
				const coordinates = this.coordinatesToString(x, y);
				const space = floor.spaces[coordinates];
				mapHtml += '<span title="' + coordinates + '">';
				if (coordinates === playerStringCoordinates) {
					mapHtml += '<blink>*</blink></span></td>';
					continue;
				}

				if (this.getSpaceDisplay) {
					const spaceDisplay = this.getSpaceDisplay(player, floor, space);
					if (spaceDisplay) {
						mapHtml += spaceDisplay.symbol + '</span></td>';
						if (!(spaceDisplay.symbol in legend)) legend[spaceDisplay.symbol] = spaceDisplay.description;
						continue;
					}
				}

				if (space.traversedAttributes.currency && space.traversedAttributes.currency.has(player)) {
					mapHtml += mapKeys.currency;
					if (!currency) currency = true;
				} else if (space.traversedAttributes.exit && space.traversedAttributes.exit.has(player)) {
					mapHtml += mapKeys.exit;
					if (!exit) exit = true;
				} else if (space.traversedAttributes.trap && space.traversedAttributes.trap.has(player)) {
					mapHtml += mapKeys.trap;
					if (!trap) trap = true;
				} else if (coordinates in floor.traversedCoordinates && floor.traversedCoordinates[coordinates].has(player)) {
					mapHtml += mapKeys.empty;
					if (!empty) empty = true;
				} else {
					mapHtml += mapKeys.unknown;
				}
				mapHtml += "</span></td>";
			}
			mapHtml += "</tr>";
		}
		mapHtml += "</table>";

		if (currency) legend[mapKeys.currency] = this.currency + ' that you have discovered';
		if (empty) legend[mapKeys.empty] = 'an empty space';
		if (exit) legend[mapKeys.exit] = 'an exit that you have discovered';
		if (trap) legend[mapKeys.trap] = 'a trap that you have discovered';

		let html = '<b>Map legend</b>:<br />';
		for (const mapSymbol in legend) {
			html += '<b>' + mapSymbol + '</b>: ' + legend[mapSymbol] + '<br />';
		}

		html += "<br />" + mapHtml;

		return html;
	}

	getPlayerMovementControlsHtml(map: GameMap, floor: MapFloor, player: Player): string {
		const playerCoordindates = this.playerCoordinates.get(player)!;
		const playerUpMovement = floor.y - 1 - playerCoordindates[1];
		const playerRightMovement = floor.x - 1 - playerCoordindates[0];
		let html = '';

		if (this.trappedPlayers && this.trappedPlayers.has(player)) {
			html += "<b>You are trapped and cannot move!</b>";
		} else if (this.canMove && (!player.eliminated || (this.escapedPlayers && this.escapedPlayers.has(player)))) {
			const cannotMove = this.roundActions && this.roundActions.has(player) ? true : false;
			html += "<b>Controls</b>:<br /><table>";
			html += "<tr><td>&nbsp;</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "up 3", "Up 3", cannotMove || playerUpMovement < 3) +
				"</td><td>" + Client.getPmSelfButton(Config.commandCharacter + "up 2", "Up 2", cannotMove || playerUpMovement < 2) +
				"</td><td>" + Client.getPmSelfButton(Config.commandCharacter + "up 1", "Up 1", cannotMove || playerUpMovement < 1) +
				"</td><td>&nbsp;</td></tr>";

			html += "<tr><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "left 3", "Left 3", cannotMove || playerCoordindates[0] < 3) +
				"</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "right 3", "Right 3", cannotMove || playerRightMovement < 3) +
				"</td></tr>";

			html += "<tr><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "left 2", "Left 2", cannotMove || playerCoordindates[0] < 2) +
				"</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "right 2", "Right 2", cannotMove || playerRightMovement < 2) +
				"</td></tr>";

			html += "<tr><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "left 1", "Left 1", cannotMove || playerCoordindates[0] < 1) +
				"</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "right 1", "Right 1", cannotMove || playerRightMovement < 1) +
				"</td></tr>";

			html += "<tr><td>&nbsp;</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "down 3", "Down 3", cannotMove || playerCoordindates[1] < 3) +
				"</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "down 2", "Down 2", cannotMove || playerCoordindates[1] < 2) +
				"</td><td>" +
				Client.getPmSelfButton(Config.commandCharacter + "down 1", "Down 1", cannotMove || playerCoordindates[1] < 1) +
				"</td><td>&nbsp;</td></tr>";
			html += '</table>';
		}

		return html;
	}

	getPlayerControlsHtml(map: GameMap, floor: MapFloor, player: Player): string {
		return this.getPlayerMovementControlsHtml(map, floor, player);
	}

	onRegularSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		this.playerRoundInfo.get(player)!.push("You travelled" + (floor.attributes.trap ? " safely" : "") + " to (" +
			space.coordinates + ").");
	}

	checkCurrencySpace(player: Player, floor: MapFloor, space: MapFloorSpace): boolean {
		if (!space.traversedAttributes.currency) space.traversedAttributes.currency = new Set();
		if (space.traversedAttributes.currency.has(player)) return false;
		space.traversedAttributes.currency.add(player);
		return true;
	}

	getRandomCurrency(): number {
		return ((Math.floor(Math.random() * 7) + 1) * 100) + ((Math.floor(Math.random() * 9) + 1) * 10) +
		(Math.floor(Math.random() * 9) + 1);
	}

	onCurrencySpace(player: Player, floor: MapFloor, space: MapFloorSpace): number {
		if (!this.checkCurrencySpace(player, floor, space)) return 0;
		let points = this.points.get(player) || 0;
		const amount = this.getRandomCurrency();
		points += amount;
		this.points.set(player, points);
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and found <b>" + amount + " " +
			this.currency + "</b>! Your collection is now " + points + ".");
		return amount;
	}

	/** Returns `false` if the player gets eliminated by the trap */
	onTrapSpace(player: Player, floor: MapFloor, space: MapFloorSpace): boolean {
		const lives = this.addLives(player, -1);
		if (!space.traversedAttributes.trap) space.traversedAttributes.trap = new Set();
		space.traversedAttributes.trap.add(player);
		if (!lives) {
			this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and fell into a trap! You lost " +
				"your last life.");
			this.eliminatePlayer(player, "You ran out of lives!");
			if (this.recklessAdventurerAchievement && this.round === this.recklessAdventurerRound) {
				this.unlockAchievement(player, this.recklessAdventurerAchievement);
			}
			return false;
		} else {
			this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and fell into a trap! You have <b>" +
				lives + " " + (lives > 1 ? "lives" : "life") + "</b> left.");
		}
		return true;
	}

	onExitSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and found an exit! You are now safe " +
			"and will earn your bits at the end of the game.");
		if (this.round < this.maxRound) {
			this.playerRoundInfo.get(player)!.push("If you are willing to risk it, you may continue travelling to collect more " +
				this.currency + " <b>but you must find your way to an exit before time is up</b>!");
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
		if (!currencySpaces) currencySpaces = floor.y >= 10 ? 25 : Math.round(floor.y * 2);
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
		this.updatePlayerHtmlPage(player);

		if (eliminatedPlayer) this.increaseOnCommandsMax(this.moveCommands, 1);

		return true;
	}

	getSpaceDisplay?(player: Player, floor: MapFloor, space: MapFloorSpace): ISpaceDisplayData | undefined;
	onAchievementSpace?(player: Player, floor: MapFloor, space: MapFloorSpace): void;
	onEventSpace?(player: Player, floor: MapFloor, space: MapFloorSpace): boolean | null;
	onGenerateMap?(map: GameMap): void;
	onGenerateMapFloor?(floor: MapFloor): void;
}

const commands: GameCommandDefinitions<MapGame> = {
	up: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			return this.move(target, user, 'up');
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
	},
	down: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			return this.move(target, user, 'down');
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
	},
	left: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			return this.move(target, user, 'left');
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
	},
	right: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			return this.move(target, user, 'right');
		},
		eliminatedGameCommand: true,
		pmGameCommand: true,
	},
};

export const game: IGameTemplateFile<MapGame> = {
	category: 'map',
	commandDescriptions: [Config.commandCharacter + 'up/down/left/right [spaces]'],
	commands,
};
