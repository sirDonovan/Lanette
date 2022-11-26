import type { Player } from "../../room-activity";
import type {
	GameCommandDefinitions, GameFileTests, IGameAchievement, IGameTemplateFile
} from "../../types/games";
import type { NamedHexCode } from "../../types/tools";
import { data as circleData } from "./../data/board-maps/circle";
import { data as squareData, MOUNTAIN_PREFIX } from "./../data/board-maps/square";
import type { BoardActionCard, BoardData, BoardSpaceDirection, IBoardLocation, IMovedBoardLocation } from "./board";
import { BoardGame, BoardSpace, game as boardGame } from "./board";

type BoardEliminationType = 'random' | number;
type BoardRentType = 'random' | number;

const RANDOM_ELIMINATION_CHANCE = 35;
const RANDOM_RENT = 7;

export class BoardPropertySpace extends BoardSpace {
	owner: Player | null = null;

	cost: number;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection,
		cost: number) {
		super(name, color, forwardDirection, backwardDirection);

		this.cost = cost;
	}
}

export class BoardPropertyEliminationSpace extends BoardPropertySpace {
	eliminationChance: number;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection,
		cost: number, eliminationChance: number) {
		super(name, color, forwardDirection, backwardDirection, cost);

		this.eliminationChance = eliminationChance;
	}
}

export class BoardPropertyRentSpace extends BoardPropertySpace {
	rent: number;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection,
		cost: number) {
		super(name, color, forwardDirection, backwardDirection, cost);

		this.rent = cost;
	}
}

export class BoardEliminationSpace extends BoardSpace {
	eliminationChance: BoardEliminationType;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection,
		eliminationChance: BoardEliminationType) {
		super(name, color, forwardDirection, backwardDirection);

		this.eliminationChance = eliminationChance;
	}
}

export class BoardRentSpace extends BoardSpace {
	rent: BoardRentType;

	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection,
		rent: BoardRentType) {
		super(name, color, forwardDirection, backwardDirection);

		this.rent = rent;
	}
}

export class BoardRandomCostSpace extends BoardRentSpace {
	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection) {
		super(name, color, forwardDirection, backwardDirection, "random");
	}
}

export class BoardRandomEliminationSpace extends BoardEliminationSpace {
	constructor(name: string, color: NamedHexCode, forwardDirection: BoardSpaceDirection, backwardDirection: BoardSpaceDirection) {
		super(name, color, forwardDirection, backwardDirection, 'random');
	}
}

export class BoardActionSpace extends BoardSpace {}

const sharedActionCards: BoardActionCard<BoardPropertyGame>[] = [
	function(this: BoardPropertyGame, player): void {
		this.playerLocations.set(player, this.getSpaceLocation(this.startingSpace)!);
		const text = "They hop on the Flying Taxi and advance to " + this.startingSpace.name + "!";
		this.on(text, () => {
			this.setTimeout(() => this.beforeNextRound(), this.roundTime);
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		const getOutOfJailCards = this.escapeFromJailCards.get(player) || 0;
		this.escapeFromJailCards.set(player, getOutOfJailCards + 1);
		const text = "They draw a " + this.escapeFromJailCard + "!";
		this.on(text, () => {
			this.setTimeout(() => this.beforeNextRound(), this.roundTime);
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		const location = this.playerLocations.get(player)!;
		const spaces = -1 * (this.random(3) + 1);
		const locationAfterMovement = this.getLocationAfterMovement(location, spaces);
		this.playerLocations.set(player, {x: locationAfterMovement.x, y: locationAfterMovement.y});

		const text = "They slip on an Inkay and go back **" + (-1 * spaces) + "** space" + (spaces < -1 ? "s" : "") + " to **" +
			this.board[locationAfterMovement.y][locationAfterMovement.x]!.name + "**!";
		this.on(text, () => {
			this.setTimeout(() => this.onSpaceLanding(player, spaces, locationAfterMovement, true), this.roundTime);
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		const location = this.playerLocations.get(player)!;
		let locationAfterMovement = this.getLocationAfterMovement(location, 1);
		let passedSpaces = locationAfterMovement.passedSpaces.slice();
		while (!this.board[locationAfterMovement.y][locationAfterMovement.x]!.name.startsWith(MOUNTAIN_PREFIX)) {
			locationAfterMovement = this.getLocationAfterMovement({x: locationAfterMovement.x, y: locationAfterMovement.y},
				1);
			passedSpaces = passedSpaces.concat(locationAfterMovement.passedSpaces);
		}
		locationAfterMovement.passedSpaces = passedSpaces;

		const passedGo = passedSpaces.includes(this.startingSpace);
		let reachedMaxCurrency = false;
		if (passedGo) {
			let currency = this.playerCurrency.get(player)!;
			currency += this.passingGoCurrency;
			this.playerCurrency.set(player, currency);
			if (this.maxCurrency && currency >= this.maxCurrency) reachedMaxCurrency = true;
		}
		this.playerLocations.set(player, {x: locationAfterMovement.x, y: locationAfterMovement.y});

		let text = "They go hiking at the nearest mountain, **" + this.board[locationAfterMovement.y][locationAfterMovement.x]!.name +
			"**";
		if (passedGo) {
			text += " (and collect **" + this.passingGoCurrency + " " + (this.passingGoCurrency > 1 ? this.currencyPluralName :
				this.currencyName) + "** for passing " + this.startingSpace.name + ")";
		}
		text += "!";
		this.on(text, () => {
			if (reachedMaxCurrency) {
				this.onMaxCurrency(player);
			} else {
				this.setTimeout(() => this.onSpaceLanding(player, passedSpaces.length, locationAfterMovement, true),
					this.roundTime);
			}
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		let currency = this.playerCurrency.get(player)!;
		currency += this.rafflePrize;
		this.playerCurrency.set(player, currency);
		const text = "They win the " + this.raffleRunner + " raffle and earn **" + this.rafflePrize + " " + (this.rafflePrize > 1 ?
			this.currencyPluralName : this.currencyName) + "**!";
		this.on(text, () => {
			if (this.maxCurrency && currency >= this.maxCurrency) {
				this.onMaxCurrency(player);
			} else {
				this.setTimeout(() => this.beforeNextRound(), this.roundTime);
			}
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		const totalSpaces = (this.board.length * 2) + (this.board[0].length * 2);
		const spacesMoved = this.random(totalSpaces - 1) + 1;
		const location = this.playerLocations.get(player)!;
		const locationAfterMovement = this.getLocationAfterMovement(location, spacesMoved);
		this.playerLocations.set(player, {x: locationAfterMovement.x, y: locationAfterMovement.y});

		const text = "An Abra appeared and teleported them to **" +
			this.board[locationAfterMovement.y][locationAfterMovement.x]!.name + "**!";
		this.on(text, () => {
			this.setTimeout(() => this.onSpaceLanding(player, spacesMoved, locationAfterMovement, true), this.roundTime);
		});
		this.say(text);
	},
	function(this: BoardPropertyGame, player): void {
		this.playerLocations.set(player, this.getSpaceLocation(this.jailSpace)!);
		this.playersInJail.push(player);
		this.turnsInJail.set(player, 0);
		if (this.currentPlayerReRoll) this.currentPlayerReRoll = false;
		const text = "They are caught trying to hack " + Users.self.name + " and are sent to " + this.jailSpace.name + "!";
		this.on(text, () => {
			this.setTimeout(() => this.beforeNextRound(), this.roundTime);
		});
		this.say(text);
	},
];

export abstract class BoardPropertyGame extends BoardGame {
	abstract acquirePropertyAction: string;
	abstract acquirePropertyActionPast: string;
	abstract availablePropertyState: string;
	abstract currencyName: string;
	abstract currencyPluralName: string;
	abstract currencyToEscapeJail: number;
	abstract escapeFromJailCard: string;
	abstract passingGoCurrency: number;
	abstract rafflePrize: number;
	abstract raffleRunner: string;
	abstract startingCurrency: number;
	abstract winCondition: 'currency' | 'property';

	acquireProperties: boolean = true;
	actionCards: BoardActionCard<BoardPropertyGame>[] = [];
	canRollOrEscapeJail: boolean = false;
	canAcquire: boolean = false;
	canLateJoin: boolean = true;
	chanceUnlockCost: number = 1;
	escapeFromJailCards = new Map<Player, number>();
	hasAssistActions: boolean = true;
	maxPlayers: number = 25;
	numberOfDice: number = 2;
	playersInJail: Player[] = [];
	playerCurrency = new Map<Player, number>();
	properties = new Map<Player, (BoardPropertyEliminationSpace | BoardPropertyRentSpace)[]>();
	propertyToAcquire: BoardPropertyEliminationSpace | BoardPropertyRentSpace | null = null;
	roundTime: number = 3 * 1000;
	sharedActionCards: BoardActionCard<BoardPropertyGame>[] = sharedActionCards;
	startingBoardSideSpace: number = 0;
	turnsInJail = new Map<Player, number>();
	useCost: boolean = false;
	useChance: boolean = false;

	// loaded in afterInitialize()
	board: (BoardSpace | null)[][] = [];
	jailSpace!: BoardSpace;
	startingBoardLocation!: IBoardLocation;
	startingSpace!: BoardSpace;

	acquireAllPropertiesAchievement?: IGameAchievement;
	acquireAllMountainsAchievement?: IGameAchievement;
	doublesRollsAchievement?: IGameAchievement;
	doublesRollsAchievementAmount?: number;
	maxCurrency?: number;
	randomEffectName?: string;

	abstract getActionCards(): BoardActionCard<BoardPropertyGame>[];
	abstract getPlayerPropertiesHtml(player: Player): string;
	abstract onOwnedPropertySpace(space: BoardPropertySpace, player: Player): void;
	abstract onAcquirePropertySpace(property: BoardPropertySpace, player: Player, cost: number): void;
	abstract onPassOnPropertySpace(player: Player): void;
	abstract onInsufficientCurrencyToAcquire(property: BoardPropertySpace, player: Player): void;

	afterInitialize(): void {
		let boardData: BoardData[];
		if (this.boardType === 'circle') {
			boardData = circleData;
		} else {
			boardData = squareData;
		}

		let row = 0;
		this.board = [[]];

		for (const entry of boardData) {
			if (entry === null) {
				this.board[row].push(null);
				continue;
			}

			if ('row' in entry) {
				if (entry.row > 1) {
					row++;
					this.board.push([]);
				}

				continue;
			}

			let space: BoardSpace;
			if (entry.effect === 'action') {
				space = new BoardActionSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection);
			} else if (entry.effect === 'random' && (this.useCost || this.useChance)) {
				if (this.useCost) {
					space = new BoardRandomCostSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection);
				} else {
					space = new BoardRandomEliminationSpace(this.randomEffectName || entry.name, entry.color, entry.forwardDirection,
						entry.backwardDirection);
				}
			} else if (entry.effect === 'jail') {
				space = new BoardSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection);
				this.jailSpace = space;
			} else if (entry.cost && this.useCost) {
				space = new BoardPropertyRentSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection,
					entry.cost);
			} else if (entry.chance && this.useChance) {
				space = new BoardPropertyEliminationSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection,
					this.chanceUnlockCost, entry.chance);
			} else {
				space = new BoardSpace(entry.name, entry.color, entry.forwardDirection, entry.backwardDirection);
			}

			if (entry.icon) space.icon = entry.icon;
			this.board[row].push(space);

			if (entry.startSpace) {
				this.startingBoardLocation = {x: this.board[row].length - 1, y: row};
				this.startingSpace = space;
			}
		}
	}

	onAddPlayer(player: Player, lateJoin?: boolean | undefined): boolean | undefined {
		if (lateJoin) {
			if (!this.lettersList.length) return false;

			this.playerCurrency.set(player, this.startingCurrency);
			this.properties.set(player, []);
			this.placePlayerOnStart(player);

			this.playerOrder.push(player);
			if (this.playerList.length) {
				this.playerList.push(player);
			}
		}

		return true;
	}

	onStart(): void {
		super.onStart();

		for (const player of this.playerOrder) {
			this.playerCurrency.set(player, this.startingCurrency);
			this.properties.set(player, []);
		}
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		for (const row of this.board) {
			for (const space of row) {
				if (space instanceof BoardPropertySpace) space.owner = null;
			}
		}

		this.escapeFromJailCards.clear();
		this.playerCurrency.clear();
		this.properties.clear();
		this.turnsInJail.clear();
	}

	onRemovePlayer(player: Player): void {
		if (!this.started) return;
		const properties = this.properties.get(player)!;

		for (const property of properties) {
			property.owner = null;
		}

		this.properties.set(player, []);
	}

	onEliminatePlayer(player: Player, eliminator?: Player | null): void {
		const properties = this.properties.get(player) || [];
		const eliminatorProperties = eliminator ? this.properties.get(eliminator)! : [];
		for (const property of properties) {
			property.owner = eliminator || null;
			eliminatorProperties.push(property);
		}
		if (eliminator) {
			this.properties.set(eliminator, eliminatorProperties);
			this.checkPropertyAchievements(eliminator);
		}
		this.properties.set(player, []);
	}

	getSpaceHtml(x: number, y: number, playerLocations: Player[][][]): string {
		const boardSpace = this.board[y][x];
		if (boardSpace === null) return "<td>&nbsp;</td>";

		let html = "<td style='background: " + Tools.getNamedHexCode(boardSpace.color).gradient + "'>";
		if (playerLocations[y] && playerLocations[y][x]) {
			html += playerLocations[y][x].length > 1 ? "*" : this.playerLetters.get(playerLocations[y][x][0]);
		} else if (boardSpace instanceof BoardPropertySpace && boardSpace.owner) {
			html += this.playerLetters.get(boardSpace.owner)!.toLowerCase();
		} else if (boardSpace.icon) {
			html += boardSpace.icon;
		}
		html += "</td>";

		return html;
	}

	getPlayerSummary(player: Player): void {
		if (!this.started) return;
		let html = '<div class="infobox">';
		const playerHtml: string[] = ["<b><u>You (" + this.playerLetters.get(player) + ")</u></b><br />" +
			this.getPlayerPropertiesHtml(player)];
		for (const otherPlayer of this.playerOrder) {
			if (otherPlayer === player) continue;
			if (!otherPlayer.eliminated) {
				playerHtml.push("<b><u>" + otherPlayer.name + " (" + this.playerLetters.get(otherPlayer) + ")</u></b><br />" +
					this.getPlayerPropertiesHtml(otherPlayer));
			}
		}

		html += playerHtml.join("<br /><br />");
		html += "</div>";

		player.sayUhtml(html, this.uhtmlBaseName + '-summary');
	}

	beforeNextRound(): void {
		if (this.currentPlayer && this.currentPlayerReRoll) {
			this.rollDice(this.currentPlayer);
			this.doubleRolls++;
			if (this.doublesRollsAchievement && this.doubleRolls === this.doublesRollsAchievementAmount) {
				this.unlockAchievement(this.currentPlayer, this.doublesRollsAchievement);
			}
		} else {
			this.nextRound();
		}
	}

	onNextPlayer(player: Player): void {
		if (this.playersInJail.includes(player)) {
			let turnsInJail = this.turnsInJail.get(player) || 0;
			turnsInJail++;
			this.turnsInJail.set(player, turnsInJail);
			const currency = this.playerCurrency.get(player)!;
			const escapeFromJailCards = this.escapeFromJailCards.get(player) || 0;
			if (turnsInJail === 4) {
				this.canRollOrEscapeJail = false;
				if (escapeFromJailCards || currency >= this.currencyToEscapeJail) {
					let text: string;
					if (escapeFromJailCards) {
						text = "Since it is **" + player.name + "**'s 4th turn in " + this.jailSpace.name + ", they must use a " +
							this.escapeFromJailCard + "!";
						this.escapeFromJailCards.set(player, escapeFromJailCards - 1);
					} else {
						text = "Since it is **" + player.name + "**'s 4th turn in " + this.jailSpace.name + ", they must use **" +
							this.currencyToEscapeJail + " " + (this.currencyToEscapeJail > 1 ? this.currencyPluralName :
							this.currencyName) + "** to escape!";
						this.playerCurrency.set(player, currency - this.currencyToEscapeJail);
					}
					this.playersInJail.splice(this.playersInJail.indexOf(player), 1);
					this.on(text, () => {
						this.setTimeout(() => this.rollDice(player), this.roundTime);
					});
					this.say(text);
				} else {
					const text = "It is **" + player.name + "**'s 4th turn in " + this.jailSpace.name + ", but they do not have enough " +
						this.currencyPluralName + " to escape and have been eliminated from the game!";
					this.on(text, () => {
						this.eliminatePlayer(player);
						this.setTimeout(() => this.nextRound(), this.roundTime);
					});
					this.say(text);
				}
			} else {
				if (currency >= this.currencyToEscapeJail || escapeFromJailCards) {
					this.canRollOrEscapeJail = true;
					const text = "This is **" + player.name + "**'s " + Tools.toNumberOrderString(turnsInJail) + " turn in " +
						this.jailSpace.name + ". They can either attempt to roll doubles (with ``" + Config.commandCharacter +
						"rolldice``) or use " + (escapeFromJailCards ? "a " + this.escapeFromJailCard : this.currencyToEscapeJail + " " +
						(this.currencyToEscapeJail > 1 ? this.currencyPluralName : this.currencyName)) + " to escape (with ``" +
						Config.commandCharacter + "escape``)!";
					this.on(text, () => {
						let html = "<center>";
						html += this.getMsgRoomButton("rolldice", "Roll dice");
						html += " | ";
						html += this.getMsgRoomButton("escape", "Escape");
						html += "</center>";
						this.sendPlayerAssistActions(player, this.getCustomBoxDiv(html), this.actionsUhtmlName);

						this.setTimeout(() => {
							this.canRollOrEscapeJail = false;
							this.rollDice(player);
						}, 30 * 1000);
					});
					this.say(text);
				} else {
					this.canRollOrEscapeJail = false;
					const text = "This is **" + player.name + "**'s " + Tools.toNumberOrderString(turnsInJail) + " turn in " +
						this.jailSpace.name + ", but they cannot escape so they must roll!";
					this.on(text, () => {
						this.setTimeout(() => this.rollDice(player), this.roundTime);
					});
					this.say(text);
				}
			}
		} else {
			this.rollDice(player);
		}
	}

	onPlayerRoll(player: Player): boolean {
		if (this.playersInJail.includes(player)) {
			if (this.dice[0] !== this.dice[1]) {
				const text = "**" + player.name + "** rolled [ " + this.dice[0] + " ] [ " + this.dice[1] + " ] and failed to get out of " +
					this.jailSpace.name + "!";
				this.on(text, () => {
					this.setTimeout(() => this.nextRound(), this.roundTime);
				});
				this.say(text);
				return false;
			}
		}

		return true;
	}

	getSpaceEliminationValue(space: BoardPropertyEliminationSpace | BoardEliminationSpace): number {
		if (!space.eliminationChance) return 0;
		if (space.eliminationChance === 'random') return this.random(RANDOM_ELIMINATION_CHANCE) + 1;
		return space.eliminationChance;
	}

	getSpaceRentValue(space: BoardPropertyRentSpace | BoardRentSpace): number {
		if (!space.rent) return 0;
		if (space.rent === 'random') return (this.random(RANDOM_RENT) + 1) * 100;
		return space.rent;
	}

	onSpaceLanding(player: Player, spacesMoved: number, location: IMovedBoardLocation, teleported?: boolean): void {
		const space = this.board[location.y][location.x]!;

		let rollText: string | undefined;
		let reachedMaxCurrency = false;
		if (!teleported) {
			const jailIndex = this.playersInJail.indexOf(player);
			const outOfJail = jailIndex !== -1;
			if (outOfJail) {
				this.playersInJail.splice(jailIndex, 1);
				this.currentPlayerReRoll = false;
			}

			rollText = "**" + player.name + " (" + this.playerLetters.get(player) + ")** rolled **[ " + this.dice[0] + " ]** **[ " +
				this.dice[1] + " ]** " + (outOfJail ? "to get out of jail " : "") + "and landed on **" + space.name + "**!";
			const passedGo = spacesMoved > 0 && location.passedSpaces.includes(this.startingSpace);
			if (passedGo && this.boardRound > 1) {
				rollText += " They also passed " + this.startingSpace.name + " and gained **" + this.passingGoCurrency + " " +
					(this.passingGoCurrency > 1 ? this.currencyPluralName : this.currencyName) + "**!";
				let currency = this.playerCurrency.get(player)!;
				currency += this.passingGoCurrency;
				this.playerCurrency.set(player, currency);
				if (this.maxCurrency && currency >= this.maxCurrency) reachedMaxCurrency = true;
			}
		}

		if (reachedMaxCurrency) {
			this.onMaxCurrency(player);
			return;
		}

		if (space instanceof BoardPropertyEliminationSpace || space instanceof BoardPropertyRentSpace) {
			if (space.owner) {
				if (space.owner === player) {
					if (rollText) {
						this.on(rollText, () => {
							this.setTimeout(() => this.beforeNextRound(), this.roundTime);
						});
						this.say(rollText);
					} else {
						this.setTimeout(() => this.beforeNextRound(), this.roundTime);
					}
				} else {
					if (rollText) this.say(rollText);
					this.onOwnedPropertySpace(space, player);
				}
			} else {
				if (rollText) this.say(rollText);
				const currency = this.playerCurrency.get(player)!;
				if (this.acquireProperties && currency >= space.cost) {
					const text = "Would you like to " + this.acquirePropertyAction + " it using " + (currency > space.cost ? "**" +
						space.cost + "** of your **" + currency + " " + this.currencyPluralName + "**" : "**your last " +
						(currency === 1 ? this.currencyName : currency + " " + this.currencyPluralName) + "**") + "? Use ``" +
						Config.commandCharacter + this.acquirePropertyAction + "`` if so or ``" + Config.commandCharacter + "pass`` to " +
						"leave it " + this.availablePropertyState + ".";
					this.on(text, () => {
						let html = "<center>";
						html += this.getMsgRoomButton(this.acquirePropertyAction,
							this.acquirePropertyAction.charAt(0).toUpperCase() + this.acquirePropertyAction.substr(1));
						html += " | ";
						html += this.getMsgRoomButton("pass", "Pass");
						html += "</center>";
						this.sendPlayerAssistActions(player, this.getCustomBoxDiv(html), this.actionsUhtmlName);

						this.canAcquire = true;
						this.propertyToAcquire = space;
						this.setTimeout(() => this.passOnPropertySpace(player), 15 * 1000);
					});
					this.say(text);
				} else {
					this.onInsufficientCurrencyToAcquire(space, player);
				}
			}
			return;
		} else if (space instanceof BoardEliminationSpace) {
			if (rollText) this.say(rollText);
			const eliminationChance = this.getSpaceEliminationValue(space);
			const text = "**" + space.name + "** has an elimination chance of **" + eliminationChance + "%**!";
			this.on(text, () => {
				this.setTimeout(() => this.checkEliminationChance(player, eliminationChance), this.roundTime);
			});
			this.say(text);
			return;
		} else if (space instanceof BoardRentSpace) {
			if (rollText) this.say(rollText);
			const rent = this.getSpaceRentValue(space);
			this.checkRentPayment(space, player, rent);
			return;
		} else if (space instanceof BoardActionSpace) {
			if (rollText) this.say(rollText);
			this.onActionSpace(player);
			return;
		} else if (rollText) {
			this.on(rollText, () => {
				this.setTimeout(() => this.beforeNextRound(), this.roundTime);
			});
			this.say(rollText);
			return;
		}

		this.setTimeout(() => this.beforeNextRound(), this.roundTime);
	}

	checkEliminationChance(player: Player, eliminationChance: number, eliminator?: Player): void {
		const randomNumber = this.random(100);
		let text = "The randomly generated number is **" + randomNumber + "**!";
		if (randomNumber < eliminationChance) {
			text += " **" + player.name + "** has been eliminated" + (eliminator ? " by **" + eliminator.name + "**" : "") + "!";
			this.on(text, () => {
				this.eliminatePlayer(player, undefined, eliminator);
				this.setTimeout(() => this.nextRound(), this.roundTime);
			});
		} else {
			text += " They remain in the game.";
			this.on(text, () => {
				this.setTimeout(() => this.beforeNextRound(), this.roundTime);
			});
		}

		this.say(text);
	}

	checkRentPayment(space: BoardPropertyRentSpace | BoardRentSpace, player: Player, rent: number): void {
		const currency = this.playerCurrency.get(player)!;
		let payment: number;
		let eliminated = false;
		if (currency >= rent) {
			payment = rent;
		} else {
			eliminated = true;
			payment = currency;
		}

		let owner: Player | undefined;
		let ownerCurrency: number | undefined;
		let reachedMaxCurrency = false;
		if (space instanceof BoardPropertyRentSpace && space.owner) {
			owner = space.owner;
			ownerCurrency = this.playerCurrency.get(owner);
			ownerCurrency! += payment;
			this.playerCurrency.set(owner, ownerCurrency!);
			if (this.maxCurrency && ownerCurrency! >= this.maxCurrency) reachedMaxCurrency = true;
		}

		let text: string;
		if (eliminated) {
			text = "They only have " + currency + " " + (currency > 1 ? this.currencyPluralName : this.currencyName) + " and have been " +
				"eliminated from the game!";
			this.on(text, () => {
				if (reachedMaxCurrency) {
					this.onMaxCurrency(owner!);
				} else {
					this.eliminatePlayer(player, undefined, owner);
					this.setTimeout(() => this.nextRound(), this.roundTime);
				}
			});
		} else {
			text = "They pay **" + rent + " " + (rent > 1 ? this.currencyPluralName : this.currencyName) + "**" + (owner ? " to **" +
				owner.name + "**" : "") + " as rent!";
			this.playerCurrency.set(player, currency - rent);
			this.on(text, () => {
				if (reachedMaxCurrency) {
					this.onMaxCurrency(owner!);
				} else {
					this.setTimeout(() => this.beforeNextRound(), this.roundTime);
				}
			});
		}

		this.say(text);
	}

	onMaxCurrency(winner: Player): void {
		for (const i in this.players) {
			if (this.players[i] !== winner) this.players[i].eliminated = true;
		}

		const text = winner.name + " has reached the " + this.currencyPluralName + " limit!";
		this.on(text, () => {
			this.setTimeout(() => this.end(), this.roundTime);
		});
		this.say(text);
	}

	onTimeLimit(): boolean {
		if (this.playerList.length) return false;

		if (this.winCondition === 'currency') {
			let highestCurrency = 0;
			this.playerCurrency.forEach((currency) => {
				if (currency > highestCurrency) {
					highestCurrency = currency;
				}
			});

			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				if (this.playerCurrency.get(player)! < highestCurrency) player.eliminated = true;
			}
		} else if (this.winCondition === 'property') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			let mostProperties = 0;
			this.properties.forEach((properties) => {
				if (properties.length > mostProperties) {
					mostProperties = properties.length;
				}
			});

			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const properties = this.properties.get(player) || [];
				if (properties.length < mostProperties) player.eliminated = true;
			}
		}

		return true;
	}

	onActionSpace(player: Player): void {
		if (!this.actionCards.length) this.actionCards = this.shuffle(this.getActionCards());
		const card = this.actionCards[0];
		this.actionCards.shift();

		card.call(this, player);
	}

	acquirePropertySpace(property: BoardPropertyEliminationSpace | BoardPropertyRentSpace, player: Player, cost: number): void {
		const properties = this.properties.get(player)!;
		property.owner = player;
		properties.push(property);

		this.checkPropertyAchievements(player);

		this.onAcquirePropertySpace(property, player, cost);
	}

	passOnPropertySpace(player: Player): void {
		this.canAcquire = false;
		const text = "They decided not to " + this.acquirePropertyAction + " **" + this.propertyToAcquire!.name + "**!";
		this.on(text, () => this.onPassOnPropertySpace(player));
		this.say(text);
	}

	checkPropertyAchievements(player: Player): void {
		if (this.getRemainingPlayerCount() <= 1) return;
		if (!this.acquireAllMountainsAchievement && !this.acquireAllPropertiesAchievement) return;

		let acquiredAllMountains = true;
		let acquiredAllProperties = true;

		outer:
		for (const row of this.board) {
			for (const space of row) {
				if (space instanceof BoardPropertySpace) {
					if (space.owner !== player) {
						if (acquiredAllMountains && space.name.startsWith(MOUNTAIN_PREFIX)) acquiredAllMountains = false;
						if (acquiredAllProperties) acquiredAllProperties = false;
					}
				}
				if (!acquiredAllMountains && !acquiredAllProperties) break outer;
			}
		}

		if (this.acquireAllMountainsAchievement && acquiredAllMountains) {
			this.unlockAchievement(player, this.acquireAllMountainsAchievement);
		}
		if (this.acquireAllPropertiesAchievement && acquiredAllProperties) {
			this.unlockAchievement(player, this.acquireAllPropertiesAchievement);
		}
	}
}

const commands: GameCommandDefinitions<BoardPropertyGame> = {
	rolldice: {
		command(target, room, user) {
			if (!this.canRollOrEscapeJail || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);

			this.clearPlayerAssistActions(this.currentPlayer, this.actionsUhtmlName);

			this.canRollOrEscapeJail = false;
			this.rollDice(this.players[user.id]);
			return true;
		},
	},
	unlock: {
		command(target, room, user) {
			if (!this.propertyToAcquire || !this.canAcquire || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);

			this.clearPlayerAssistActions(this.currentPlayer, this.actionsUhtmlName);
			this.acquirePropertySpace(this.propertyToAcquire, this.currentPlayer, this.propertyToAcquire.cost);
			this.canAcquire = false;

			const text = "They " + this.acquirePropertyActionPast + " **" + this.propertyToAcquire.name + "**!";
			this.on(text, () => {
				this.setTimeout(() => this.beforeNextRound(), this.roundTime);
			});
			this.say(text);
			return true;
		},
		aliases: ['buy'],
	},
	pass: {
		command(target, room, user) {
			if (!this.propertyToAcquire || !this.canAcquire || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);

			this.clearPlayerAssistActions(this.currentPlayer, this.actionsUhtmlName);
			this.canAcquire = false;
			this.passOnPropertySpace(this.players[user.id]);
			return true;
		},
	},
	escape: {
		command(target, room, user) {
			if (!this.canRollOrEscapeJail || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);

			this.clearPlayerAssistActions(this.currentPlayer, this.actionsUhtmlName);

			const player = this.players[user.id];
			this.canRollOrEscapeJail = false;
			const escapeFromJailCards = this.escapeFromJailCards.get(player);
			let text: string = "They escaped from " + this.jailSpace.name + " using ";
			if (escapeFromJailCards) {
				this.escapeFromJailCards.set(player, escapeFromJailCards - 1);
				text += "a " + this.escapeFromJailCard + "!";
			} else {
				this.playerCurrency.set(player, this.playerCurrency.get(player)! - this.currencyToEscapeJail);
				text += this.currencyToEscapeJail + " " + (this.currencyToEscapeJail > 1 ? this.currencyPluralName : this.currencyName) +
					"!";
			}
			this.playersInJail.splice(this.playersInJail.indexOf(player), 1);
			this.on(text, () => {
				this.setTimeout(() => this.rollDice(player), this.roundTime);
			});
			this.say(text);
			return true;
		},
	},
};

export const game: IGameTemplateFile<BoardPropertyGame> = Object.assign(Tools.deepClone(boardGame), {
	commands,
	modeProperties: undefined,
	tests: (Object.assign({}, boardGame.tests) as unknown) as GameFileTests<BoardPropertyGame>,
	variants: undefined,
});
