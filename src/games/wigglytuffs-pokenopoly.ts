import type { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Room } from "../rooms";
import { addPlayers, assertStrictEqual } from "../test/test-tools";
import { GameFileTests, IGameFile } from "../types/games";
import type { HexColor } from "../types/global-types";
import { BoardGame, BoardSide, BoardSpace, game as boardGame, IBoard, IMovedBoardLocation } from "./templates/board";

export type BoardChanceCard = (this: WigglytuffsPokenopoly, player: Player) => void;

class BoardPropertySpace extends BoardSpace {
	isPropertySpace: boolean = true;
	owner: Player | null = null;

	cost: number;
	eliminationChance: number;

	constructor(name: string, color: HexColor, cost: number, eliminationChance: number) {
		super(name, color);

		this.cost = cost;
		this.eliminationChance = eliminationChance;
	}
}

class BoardUtilitySpace extends BoardPropertySpace {
	isUtilitySpace: boolean = true;

	tax: number;

	constructor(name: string, color: HexColor, cost: number, tax: number) {
		super(name, color, cost, 0);

		this.tax = tax;
	}
}

class BoardChanceSpace extends BoardSpace {
	isChanceSpace: boolean = true;
}

const spaces: Dict<BoardSpace> = {
	// leftColumn
	go: new BoardSpace("Go", "Light Green"),
	chance: new BoardChanceSpace("Chance", "Pink"),
	jail: new BoardSpace("Jail", "Orange"),
	pallet: new BoardPropertySpace("Pallet", "Red", 100, 5),
	littleroot: new BoardPropertySpace("Littleroot", "Red", 100, 5),
	twinleaf: new BoardPropertySpace("Twinleaf", "Red", 100, 10),
	diglettscave: new BoardPropertySpace("Diglett's Cave", "Light Purple", 150, 15),
	diglettstunnel: new BoardPropertySpace("Diglett's Tunnel", "Light Purple", 150, 15),

	mtmoon: new BoardPropertySpace("Mt. Moon", "Dark Brown", 200, 10),
	mtsilver: new BoardPropertySpace("Mt. Silver", "Dark Brown", 200, 10),
	mtpyre: new BoardPropertySpace("Mt. Pyre", "Dark Brown", 200, 10),
	mtcoronet: new BoardPropertySpace("Mt. Coronet", "Dark Brown", 200, 10),

	// top row
	lakeacuity: new BoardPropertySpace("Lake Acuity", "Purple", 200, 10),
	lakeverity: new BoardPropertySpace("Lake Verity", "Purple", 200, 10),
	lakevalor: new BoardPropertySpace("Lake Valor", "Purple", 200, 15),
	battlefactory: new BoardPropertySpace("Battle Factory", "Light Blue", 250, 25),
	battlemaison: new BoardPropertySpace("Battle Maison", "Light Blue", 250, 25),

	// right column
	viridianforest: new BoardPropertySpace("Viridian Forest", "Green", 300, 15),
	eternaforest: new BoardPropertySpace("Eterna Forest", "Green", 300, 15),
	pinwheelforest: new BoardPropertySpace("Pinwheel Forest", "Green", 300, 20),
	whitetreehollow: new BoardPropertySpace("White Treehollow", "Yellow", 350, 30),
	blackcity: new BoardPropertySpace("Black City", "Yellow", 350, 30),

	powerplant: new BoardUtilitySpace("Power Plant", "Blue", 400, 100),
	pokeballfactory: new BoardUtilitySpace("PokéBall Factory", "Blue", 400, 100),

	// bottom row
	jubilife: new BoardPropertySpace("Jubilife", "Light Gray", 400, 20),
	castelia: new BoardPropertySpace("Castelia", "Light Gray", 400, 20),
	lumiose: new BoardPropertySpace("Lumiose", "Light Gray", 400, 25),
	ultraspace: new BoardPropertySpace("Ultra Space", "Light Brown", 500, 35),
	distortionworld: new BoardPropertySpace("Distortion World", "Light Brown", 500, 35),
};

const chanceCards: BoardChanceCard[] = [
	function(player) {
		const amount = 50;
		this.playerMoney.set(player, this.playerMoney.get(player)! + amount);
		this.say("They steal **" + amount + " Poké** from the bank!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		let money = this.playerMoney.get(player)!;
		if (money > 50) money = 50;
		const players = this.shufflePlayers();
		let randomPlayer = players[0];
		players.shift();
		while (player === randomPlayer) {
			randomPlayer = players[0];
			players.shift();
		}
		let otherMoney = this.playerMoney.get(randomPlayer) || this.startingMoney;
		otherMoney += money;
		this.playerMoney.set(randomPlayer, otherMoney);
		this.playerMoney.set(player, this.playerMoney.get(player)! - money);
		this.say("They are feeling generous and donate **" + money + " Poké** to **" + randomPlayer.name + "**!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		this.playerLocations.set(player, this.getSpaceLocation(spaces.go)!);
		this.say("They hop on the party bus and advance to " + spaces.go.name + "!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		const location = this.getSpaceLocation(spaces.ultraspace)!;
		this.playerLocations.set(player, location);
		this.say("They go through a strange portal and end up in " + spaces.ultraspace.name + "!");
		this.timeout = setTimeout(() => this.onSpaceLanding(player, 0, Object.assign(location, {passedSpaces: []}), true), this.roundTime);
	},
	function(player) {
		const getOutOfJailCards = this.getOutOfJailCards.get(player) || 0;
		this.getOutOfJailCards.set(player, getOutOfJailCards + 1);
		this.say("They draw a ``Get out of Jail Free`` card!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		this.playerLocations.set(player, this.getSpaceLocation(spaces.jail)!);
		this.playersInJail.push(player);
		this.turnsInJail.set(player, 0);
		this.say("They are caught trying to hack " + Users.self.name + " and are sent to jail!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		const location = this.getSpaceLocation(spaces.castelia)!;
		this.playerLocations.set(player, location);
		this.say("They want some ice cream so they travel to **" + spaces.castelia.name + "** to get a Casteliacone!");
		this.timeout = setTimeout(() => this.onSpaceLanding(player, 0, Object.assign(location, {passedSpaces: []}), true), this.roundTime);
	},
	function(player) {
		let money = this.playerMoney.get(player)!;
		const amount = 10;
		for (const id in this.players) {
			const otherPlayer = this.players[id];
			if (otherPlayer.eliminated || otherPlayer === player) continue;
			const otherMoney = this.playerMoney.get(otherPlayer)!;
			let donation = otherMoney;
			if (donation > amount) donation = amount;
			money += donation;
			this.playerMoney.set(otherPlayer, otherMoney - donation);
		}
		this.playerMoney.set(player, money);
		this.say("It is their birthday today so all other players donate **" + amount + " Poké** to them!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
	function(player) {
		const location = this.playerLocations.get(player)!;
		const spaces = -3;
		const locationAfterMovement = this.getLocationAfterMovement(location, spaces);
		this.playerLocations.set(player, {side: locationAfterMovement.side, space: locationAfterMovement.space});
		this.say("They slip on a banana peel and go back **" + (-1 * spaces) + "** spaces to " + this.board[locationAfterMovement.side][locationAfterMovement.space].name + "!");
		this.timeout = setTimeout(() => this.onSpaceLanding(player, spaces, locationAfterMovement, true), this.roundTime);
	},
	function(player) {
		const location = this.playerLocations.get(player)!;
		let locationAfterMovement = this.getLocationAfterMovement(location, 1);
		let passedSpaces = locationAfterMovement.passedSpaces.slice();
		while (!this.board[locationAfterMovement.side][locationAfterMovement.space].name.startsWith("Mt. ")) {
			locationAfterMovement = this.getLocationAfterMovement({side: locationAfterMovement.side, space: locationAfterMovement.space}, 1);
			passedSpaces = passedSpaces.concat(locationAfterMovement.passedSpaces);
		}
		locationAfterMovement.passedSpaces = passedSpaces;

		const passedGo = passedSpaces.includes(spaces.go);
		if (passedGo) {
			this.playerMoney.set(player, this.playerMoney.get(player)! + this.passingGoMoney);
		}
		this.playerLocations.set(player, {side: locationAfterMovement.side, space: locationAfterMovement.space});
		this.say("They want to go hiking so they travel to the nearest mountain, " + this.board[locationAfterMovement.side][locationAfterMovement.space].name + (passedGo ? " (and collect **" + this.passingGoMoney + " Poké** for passing " + spaces.go.name + ")" : "") + "!");
		this.timeout = setTimeout(() => this.onSpaceLanding(player, passedSpaces.length, locationAfterMovement, true), this.roundTime);
	},
	function(player) {
		const amount = 200;
		this.playerMoney.set(player, this.playerMoney.get(player)! + amount);
		this.say("They win the " + (this.room as Room).title + " lottery and gain **" + amount + " Poké**!");
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	},
];

class WigglytuffsPokenopoly extends BoardGame {
	baseChanceCards: BoardChanceCard[] = chanceCards.slice();
	board: IBoard = {
		leftColumn: [spaces.go, spaces.pallet, spaces.littleroot, spaces.chance, spaces.twinleaf, spaces.mtmoon, spaces.chance, spaces.diglettscave, spaces.diglettstunnel, spaces.jail],
		topRow: [spaces.lakeacuity, spaces.lakeverity, spaces.chance, spaces.lakevalor, spaces.mtsilver, spaces.chance, spaces.battlefactory, spaces.battlemaison],
		rightColumn: [spaces.powerplant, spaces.viridianforest, spaces.eternaforest, spaces.chance, spaces.pinwheelforest, spaces.mtpyre, spaces.chance, spaces.whitetreehollow, spaces.blackcity, spaces.pokeballfactory],
		bottomRow: [spaces.jubilife, spaces.castelia, spaces.chance, spaces.lumiose, spaces.mtcoronet, spaces.chance, spaces.ultraspace, spaces.distortionworld],
	};
	canBail: boolean = false;
	canBid: boolean = false;
	canBuy: boolean = false;
	canRoll: boolean = false;
	chanceCards: BoardChanceCard[] = this.shuffle(chanceCards);
	doubleRolls: number = 0;
	getOutOfJailCards = new Map<Player, number>();
	highestBidAmount: number = 0;
	highestBidder: Player | null = null;
	maxPlayers: number = 20;
	moneyForBail: number = 50;
	numberOfDice: number = 2;
	passingGoMoney: number = 200;
	playersInJail: Player[] = [];
	properties = new Map<Player, Array<BoardPropertySpace>>();
	propertyOnAuction: BoardPropertySpace | null = null;
	startingBoardSide: BoardSide = 'leftColumn';
	startingBoardSpace: number = 0;
	startingMoney: number = 1000;
	turnsInJail = new Map<Player, number>();

	isChanceSpace(space: BoardSpace): space is BoardChanceSpace {
		return !!space.isChanceSpace;
	}

	isPropertySpace(space: BoardSpace): space is BoardPropertySpace {
		return !!space.isPropertySpace;
	}

	isUtilitySpace(space: BoardSpace): space is BoardUtilitySpace {
		return !!space.isUtilitySpace;
	}

	onAfterDeallocate(forceEnd: boolean) {
		for (const i in spaces) {
			const space = spaces[i];
			if (this.isPropertySpace(space)) space.owner = null;
		}
	}

	onRemovePlayer(player: Player) {
		if (!this.started) return;
		const properties = this.properties.get(player);
		if (!properties) return;

		for (let i = 0; i < properties.length; i++) {
			properties[i].owner = null;
		}
	}

	onEliminatePlayer(player: Player, eliminationCause?: string | null, eliminator?: Player | null) {
		const elimProps = this.properties.get(player) || [];
		if (eliminator) {
			const eliminatorProps = this.properties.get(eliminator) || [];
			for (let i = 0, len = elimProps.length; i < len; i++) {
				elimProps[i].owner = eliminator;
				eliminatorProps.push(elimProps[i]);
			}
			this.properties.set(eliminator, eliminatorProps);
		} else {
			for (let i = 0, len = elimProps.length; i < len; i++) {
				elimProps[i].owner = null;
			}
		}
	}

	getSpaceHtml(side: BoardSide, space: number, playerLocations: KeyedDict<IBoard, Dict<Player[]>>): string {
		const boardSpace = this.board[side][space];
		let html = '<td style=background-color:' + Tools.hexColorCodes[boardSpace.color]["background-color"] + ' width="20px" height="20px"; align="center">';
		if (playerLocations[side][space]) {
			html += "<b>" + (playerLocations[side][space].length > 1 ? "*" : this.playerLetters.get(playerLocations[side][space][0])) + "</b>";
		} else if (this.isPropertySpace(boardSpace) && boardSpace.owner) {
			html += "<b>" + this.playerLetters.get(boardSpace.owner)!.toLowerCase() + "</b>";
		}
		html += "</td>";

		return html;
	}

	getPlayerPropertiesHtml(player: Player): string {
		const properties = this.properties.get(player) || [];
		return "<b>Poké</b>: " + this.playerMoney.get(player) + "<br /><b>Properties</b>: " + (properties.length ? properties.map(prop => prop.name + " (" + prop.color + ")").join(", ") : "(none)");
	}

	getPlayerSummary(player: Player) {
		if (!this.started) return "";
		let html = '<div class="infobox">';
		const playerHtml: string[] = ["<b><u>You (" + this.playerLetters.get(player) + ")</u></b><br />" + this.getPlayerPropertiesHtml(player)];
		for (let i = 0; i < this.playerOrder.length; i++) {
			if (this.playerOrder[i] === player) continue;
			const otherPlayer = this.playerOrder[i];
			if (!otherPlayer.eliminated) playerHtml.push("<b><u>" + otherPlayer.name + " (" + this.playerLetters.get(otherPlayer) + ")</u></b><br />" + this.getPlayerPropertiesHtml(otherPlayer));
		}

		html += playerHtml.join("<br /><br />");
		html += "</div>";

		player.sayUhtml(html, this.uhtmlBaseName + '-summary');
	}

	beforeNextRound() {
		if (this.currentPlayer && this.dice[0] === this.dice[1]) {
			this.doubleRolls++;
			// if (this.doubleRolls === 3) Games.unlockAchievement(this.room, this.currentPlayer, 'Pokenopoly Expert', this);
			this.rollDice(this.currentPlayer!);
		} else {
			this.doubleRolls = 0;
			this.nextRound();
		}
	}

	onNextPlayer(player: Player) {
		if (this.playersInJail.includes(player)) {
			let numTurns = this.turnsInJail.get(player)!;
			numTurns++;
			this.turnsInJail.set(player, numTurns);
			let money = this.playerMoney.get(player)!;
			const getOutOfJailCards = this.getOutOfJailCards.get(player) || 0;
			if (numTurns === 4) {
				if (getOutOfJailCards || money >= this.moneyForBail) {
					if (getOutOfJailCards) {
						this.say("Since it is **" + player.name + "**'s 4th turn in jail, they must use a ``Get out of Jail Free`` card!");
						this.getOutOfJailCards.set(player, getOutOfJailCards - 1);
					} else {
						this.say("Since it is **" + player.name + "**'s 4th turn in jail, they must pay **" + this.moneyForBail + " Poké** to bail themselves out!");
						money -= this.moneyForBail;
						this.playerMoney.set(player, money);
					}
					this.playersInJail.splice(this.playersInJail.indexOf(player), 1);
					this.timeout = setTimeout(() => this.rollDice(player), this.roundTime);
				} else {
					this.say("It is **" + player.name + "**'s 4th turn in jail, but they do not have enough Poké for bail!");
					this.eliminatePlayer(player);
					this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
				}
			} else {
				if (money >= this.moneyForBail || getOutOfJailCards) {
					this.say("This is **" + player.name + "**'s " + Tools.toNumberOrderString(numTurns) + " turn in jail. They can either attempt to roll out of jail (with ``" + Config.commandCharacter + "roll``) or bail themselves out with ``" + Config.commandCharacter + "bail``!");
					this.canBail = true;
					this.canRoll = true;
					this.timeout = setTimeout(() => {
						this.canBail = false;
						this.canRoll = false;
						this.rollDice(player);
					}, 30 * 1000);
				} else {
					this.say("This is **" + player.name + "**'s " + Tools.toNumberOrderString(numTurns) + " turn in jail, but they cannot bail themselves out so they must roll!");
					this.timeout = setTimeout(() => this.rollDice(player), this.roundTime);
				}
			}
		} else {
			this.rollDice(player);
		}
	}

	onPlayerRoll(player: Player): boolean {
		if (this.playersInJail.includes(player)) {
			if (this.dice[0] !== this.dice[1]) {
				this.say("**" + player.name + "** rolled [ " + this.dice[0] + " ] [ " + this.dice[1] + " ] and failed to get out of jail!");
				this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
				return false;
			}
		}

		return true;
	}

	getChanceCard(): BoardChanceCard {
		if (!this.chanceCards.length) this.chanceCards = this.shuffle(this.baseChanceCards);
		const card = this.chanceCards[0];
		this.chanceCards.shift();
		return card;
	}

	onSpaceLanding(player: Player, spacesMoved: number, location: IMovedBoardLocation, teleported?: boolean) {
		const space = this.board[location.side][location.space];

		if (!teleported) {
			const jailIndex = this.playersInJail.indexOf(player);
			const outOfJail = jailIndex !== -1;
			if (outOfJail) this.playersInJail.splice(jailIndex, 1);
			let landingText = "**" + player.name + " (" + this.playerLetters.get(player) + ")** rolled **[ " + this.dice[0] + " ]** **[ " + this.dice[1] + " ]** " + (outOfJail ? "to get out of jail " : "") + "and landed on **" + space.name + "**!";
			const passedGo = spacesMoved > 0 && location.passedSpaces.includes(spaces.go);
			if (passedGo && this.boardRound > 1) {
				landingText += " They also passed " + spaces.go.name + " and gained **" + this.passingGoMoney + " Poké**!";
				this.playerMoney.set(player, this.playerMoney.get(player)! + 200);
			}
			this.say(landingText);
		}

		if (this.isUtilitySpace(space) || this.isPropertySpace(space)) {
			if (space.owner) {
				if (space.owner === player) {
					this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
				} else {
					const ownerProperties = this.properties.get(space.owner) || [];
					let matchingProperties = 0;
					let eliminationChance = 0;
					for (let i = 0; i < ownerProperties.length; i++) {
						if (ownerProperties[i].color === space.color) {
							matchingProperties++;
							eliminationChance += ownerProperties[i].eliminationChance;
						}
					}

					if (this.isUtilitySpace(space)) {
						const tax = matchingProperties * space.tax;
						let money = this.playerMoney.get(player)!;
						if (tax <= money) {
							money -= tax;
							this.playerMoney.set(player, money);
							this.playerMoney.set(space.owner!, tax + this.playerMoney.get(space.owner!)!);
							this.say("They pay the owner a tax of **" + tax + " Poké**!");
							this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
						} else {
							this.say("They owe **" + space.owner!.name + "** a tax of **" + tax + " Poké**, but they do not have enough!");
							this.eliminatePlayer(player, null, space.owner);
							this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
						}
					} else if (this.isPropertySpace(space)) {
						this.say("**" + space.name + "** has an elimination chance of **" + eliminationChance + "%**!");
						this.timeout = setTimeout(() => this.rollPropertyElimination(player, space, eliminationChance), this.roundTime);
					}
				}
			} else {
				this.propertyOnAuction = space;
				const money = this.playerMoney.get(player)!;
				if (money >= space.cost) {
					this.say("Would you like to buy it for **" + space.cost + "** of your **" + this.playerMoney.get(player) + " Poké**? Use ``" + Config.commandCharacter + "buy`` to buy or ``" + Config.commandCharacter + "pass`` to begin an auction.");
					this.canBuy = true;
					this.timeout = setTimeout(() => this.beginAuction(), 15 * 1000);
				} else {
					this.say("They do not have enough Poké to buy it so an auction will begin!");
					this.timeout = setTimeout(() => this.beginAuction(), this.roundTime);
				}
			}
			return;
		} else if (this.isChanceSpace(space)) {
			this.getChanceCard().call(this, player);
			return;
		}

		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	}

	rollPropertyElimination(player: Player, space: BoardPropertySpace, eliminationChance: number) {
		const randomNumber = this.random(100) + 1;
		const text = "The randomly generated number is **" + randomNumber + "**!";
		if (randomNumber < eliminationChance) {
			this.say(text + " **" + player.name + "** has been eliminated by **" + space.owner!.name + "**!");
			this.eliminatePlayer(player, undefined, space.owner);
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		} else {
			this.say(text + " They remain in the game.");
			this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
		}
	}

	beginAuction() {
		this.canBuy = false;
		this.highestBidAmount = 0;
		this.highestBidder = null;
		this.say("Place your bids for **" + this.propertyOnAuction!.name + "** (cost: **" + this.propertyOnAuction!.cost + " Poké**) with ``" + Config.commandCharacter + "bid [amount]``!");
		this.canBid = true;
		this.timeout = setTimeout(() => this.sellProperty(), 10 * 1000);
	}

	buyPropertySpace(property: BoardPropertySpace, player: Player, amount: number) {
		const properties = this.properties.get(player) || [];
		properties.push(property);
		this.properties.set(player, properties);
		this.playerMoney.set(player, this.playerMoney.get(player)! - amount);
		property.owner = player;
	}

	sellProperty() {
		if (!this.propertyOnAuction) return;
		this.canBid = false;
		if (this.highestBidder) {
			this.say("**" + this.propertyOnAuction.name + "** is sold to **" + this.highestBidder.name + "** for **" + this.highestBidAmount + " Poké**!");
			// if (this.highestAmount === 5) Games.unlockAchievement(this.room, this.highestBidder, 'Cheap Trick', this);
			this.buyPropertySpace(this.propertyOnAuction, this.highestBidder, this.highestBidAmount);
		} else {
			this.say("No one bid for **" + this.propertyOnAuction.name + "**!");
		}
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	}
}

const commands: Dict<ICommandDefinition<WigglytuffsPokenopoly>> = {
	roll: {
		command(target, room, user) {
			if (!this.canRoll || !(user.id in this.players) || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);
			this.canRoll = false;
			this.rollDice(this.players[user.id]);
			return true;
		},
	},
	bid: {
		command(target, room, user) {
			if (!this.canBid || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			const amount = parseInt(target);
			const money = this.playerMoney.get(player)!;
			if (!amount || amount <= this.highestBidAmount) return false;
			if (amount > money) {
				player.say("You cannot bid more Poké than you currently have!");
				return false;
			}
			if (amount % 5 !== 0) {
				player.say("You must bid by a multiple of 5 Poké.");
				return false;
			}
			this.highestBidder = player;
			this.highestBidAmount = amount;
			if (this.timeout) clearTimeout(this.timeout);
			this.say("The new highest bid is **" + amount + " Poké** from **" + player.name + "**!");
			this.timeout = setTimeout(() => this.sellProperty(), this.roundTime);
			return true;
		},
	},
	buy: {
		command(target, room, user) {
			if (!this.propertyOnAuction || !this.canBuy || !(user.id in this.players) || this.players[user.id] !== this.currentPlayer) return false;
			this.buyPropertySpace(this.propertyOnAuction, this.currentPlayer, this.propertyOnAuction.cost);
			this.canBuy = false;
			this.say("They bought **" + this.propertyOnAuction.name + "**!");
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
			return true;
		},
	},
	pass: {
		command(target, room, user) {
			if (!this.propertyOnAuction || !this.canBuy || !(user.id in this.players) || this.players[user.id] !== this.currentPlayer) return false;
			this.say("They decided not to buy **" + this.propertyOnAuction.name + "** so an auction will begin!");
			this.canBuy = false;
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.beginAuction(), this.roundTime);
			return true;
		},
	},
	bail: {
		command(target, room, user) {
			if (!this.canBail || !(user.id in this.players) || this.players[user.id] !== this.currentPlayer) return false;
			if (this.timeout) clearTimeout(this.timeout);
			const player = this.players[user.id];
			this.canBail = false;
			const getOutOfJailCards = this.getOutOfJailCards.get(player);
			let money = this.playerMoney.get(player)!;
			if (getOutOfJailCards) {
				this.getOutOfJailCards.set(player, getOutOfJailCards - 1);
				this.say("They used a ``Get Out of Jail Free`` card!");
			} else {
				money -= this.moneyForBail;
				this.playerMoney.set(player, money);
				this.say("They bailed themselves out of jail!");
			}
			this.playersInJail.splice(this.playersInJail.indexOf(player), 1);
			this.timeout = setTimeout(() => this.rollDice(player), this.roundTime);
			return true;
		},
	},
};

const tests: GameFileTests<WigglytuffsPokenopoly> = {
	'it should clear property owners once the game ends': {
		test(game, format) {
			const players = addPlayers(game);
			game.start();
			(spaces.pallet as BoardPropertySpace).owner = players[0];
			game.forceEnd(Users.self);
			assertStrictEqual((spaces.pallet as BoardPropertySpace).owner, null);
		},
	},
};

export const game: IGameFile<WigglytuffsPokenopoly> = Games.copyTemplateProperties(boardGame, {
	aliases: ["Wigglytuffs"],
	class: WigglytuffsPokenopoly,
	commandDescriptions: [Config.commandCharacter + "buy", Config.commandCharacter + "pass", Config.commandCharacter + "bid [amount]", Config.commandCharacter + "roll", Config.commandCharacter + "bail"],
	commands,
	description: "<a href='https://docs.google.com/document/d/10QGIeFZ_VPRO7oZ-Wj34j4u4v6nuvZoaSIhzUFq40Q8/edit'>Guide</a> | If you'd like to check the status of the game, you can use <code>" + Config.commandCharacter + "summary</code> at any time!",
	formerNames: ['pokenopoly'],
	mascot: "Wigglytuff",
	name: "Wigglytuff's Pokenopoly",
	tests: Object.assign({}, boardGame.tests, tests),
});
