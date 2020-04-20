import type { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { IGameFile, AchievementsDict, GameCommandReturnType } from "../types/games";
import { BoardActionCard, BoardSpace, IBoard } from "./templates/board";
import { BoardActionSpace, BoardPropertyGame, BoardPropertyRentSpace, BoardRentSpace, game as boardPropertyGame, mountainPrefix } from "./templates/board-property";
import { Room } from "../rooms";
import { User } from "../users";
import { PRNGSeed } from "../prng";

const DONATE_ACTION_AMOUNT = 100;
const BID_MULTIPLE = 5;
const POKE_DOLLAR = "Poké";
const JELLICENT_CARD = "Jellicent Card";

interface IBoardSpaces {
	oakslab: BoardSpace;
	action: BoardActionSpace;
	pyritetownjail: BoardSpace;
	pallet: BoardPropertyRentSpace;
	littleroot: BoardPropertyRentSpace;
	twinleaf: BoardPropertyRentSpace;
	diglettscave: BoardPropertyRentSpace;
	diglettstunnel: BoardPropertyRentSpace;

	mtmoon: BoardPropertyRentSpace;
	mtsilver: BoardPropertyRentSpace;
	mtpyre: BoardPropertyRentSpace;
	mtcoronet: BoardPropertyRentSpace;

	lakeacuity: BoardPropertyRentSpace;
	lakeverity: BoardPropertyRentSpace;
	lakevalor: BoardPropertyRentSpace;
	battlefactory: BoardPropertyRentSpace;
	battlemaison: BoardPropertyRentSpace;

	pokemoncenter: BoardSpace;
	viridianforest: BoardPropertyRentSpace;
	eternaforest: BoardPropertyRentSpace;
	pinwheelforest: BoardPropertyRentSpace;
	whitetreehollow: BoardPropertyRentSpace;
	blackcity: BoardPropertyRentSpace;
	pokemart: BoardRentSpace;

	jubilife: BoardPropertyRentSpace;
	castelia: BoardPropertyRentSpace;
	lumiose: BoardPropertyRentSpace;
	ultraspace: BoardPropertyRentSpace;
	distortionworld: BoardPropertyRentSpace;
}

const spaces: IBoardSpaces = {
	// leftColumn
	oakslab: new BoardSpace("Oak's Lab", "Light Green"),
	action: new BoardActionSpace("Action", "Pink"),
	pyritetownjail: new BoardSpace("Pyrite Town Jail", "Orange"),
	pallet: new BoardPropertyRentSpace("Pallet", "Red", 100),
	littleroot: new BoardPropertyRentSpace("Littleroot", "Red", 100),
	twinleaf: new BoardPropertyRentSpace("Twinleaf", "Red", 100),
	diglettscave: new BoardPropertyRentSpace("Diglett's Cave", "Light Purple", 150),
	diglettstunnel: new BoardPropertyRentSpace("Diglett's Tunnel", "Light Purple", 150),

	mtmoon: new BoardPropertyRentSpace(mountainPrefix + " Moon", "Dark Brown", 200),
	mtsilver: new BoardPropertyRentSpace(mountainPrefix + " Silver", "Dark Brown", 200),
	mtpyre: new BoardPropertyRentSpace(mountainPrefix + " Pyre", "Dark Brown", 200),
	mtcoronet: new BoardPropertyRentSpace(mountainPrefix + " Coronet", "Dark Brown", 200),

	// top row
	lakeacuity: new BoardPropertyRentSpace("Lake Acuity", "Purple", 200),
	lakeverity: new BoardPropertyRentSpace("Lake Verity", "Purple", 200),
	lakevalor: new BoardPropertyRentSpace("Lake Valor", "Purple", 200),
	battlefactory: new BoardPropertyRentSpace("Battle Factory", "Light Blue", 250),
	battlemaison: new BoardPropertyRentSpace("Battle Maison", "Light Blue", 250),

	// right column
	pokemoncenter: new BoardSpace("Pokemon Center", "Blue"),
	viridianforest: new BoardPropertyRentSpace("Viridian Forest", "Green", 300),
	eternaforest: new BoardPropertyRentSpace("Eterna Forest", "Green", 300),
	pinwheelforest: new BoardPropertyRentSpace("Pinwheel Forest", "Green", 300),
	whitetreehollow: new BoardPropertyRentSpace("White Treehollow", "Yellow", 350),
	blackcity: new BoardPropertyRentSpace("Black City", "Yellow", 350),
	pokemart: new BoardRentSpace("Poke Mart", "Blue", 'random'),

	// bottom row
	jubilife: new BoardPropertyRentSpace("Jubilife", "Light Gray", 400),
	castelia: new BoardPropertyRentSpace("Castelia", "Light Gray", 400),
	lumiose: new BoardPropertyRentSpace("Lumiose", "Light Gray", 400),
	ultraspace: new BoardPropertyRentSpace("Ultra Space", "Light Brown", 500),
	distortionworld: new BoardPropertyRentSpace("Distortion World", "Light Brown", 500),
};

const doublesRollsAchievementAmount = 3;
const achievements: AchievementsDict = {
	"ohbabyatriple": {name: "Oh Baby A Triple", type: 'special', bits: 1000, description: 'roll doubles ' + doublesRollsAchievementAmount + ' times in one round'},
	"cheapskate": {name: "Cheapskate", type: 'special', bits: 1000, description: 'win a property auction with a bid of ' + BID_MULTIPLE + ' ' + POKE_DOLLAR},
	"realestatetycoon": {name: "Real Estate Tycoon", type: 'special', bits: 1000, description: "buy every property on the board"},
	"mountainmover": {name: "Mountain Mover", type: 'special', bits: 1000, description: "buy every mountain on the board"},
};

class JellicentsPhantomFinances extends BoardPropertyGame<IBoardSpaces> {
	acquireAllMountainsAchievement = achievements.mountainmover;
	acquireAllPropertiesAchievement = achievements.realestatetycoon;
	acquirePropertyAction: string = "buy";
	acquirePropertyActionPast: string = "bought";
	availablePropertyState: string = "vacant";
	board: IBoard = {
		leftColumn: [spaces.oakslab, spaces.pallet, spaces.littleroot, spaces.action, spaces.twinleaf, spaces.mtmoon, spaces.action, spaces.diglettscave, spaces.diglettstunnel,
			spaces.pyritetownjail,
		],
		topRow: [spaces.lakeacuity, spaces.lakeverity, spaces.action, spaces.lakevalor, spaces.mtsilver, spaces.action, spaces.battlefactory, spaces.battlemaison],
		rightColumn: [spaces.pokemoncenter, spaces.viridianforest, spaces.eternaforest, spaces.action, spaces.pinwheelforest, spaces.mtpyre, spaces.action, spaces.whitetreehollow,
			spaces.blackcity, spaces.pokemart,
		],
		bottomRow: [spaces.jubilife, spaces.castelia, spaces.action, spaces.lumiose, spaces.mtcoronet, spaces.action, spaces.ultraspace, spaces.distortionworld],
	};
	canBid: boolean = false;
	currencyName: string = POKE_DOLLAR;
	currencyPluralName: string = POKE_DOLLAR;
	currencyToEscapeJail: number = 100;
	doublesRollsAchievement = achievements.ohbabyatriple;
	doublesRollsAchievementAmount = doublesRollsAchievementAmount;
	escapeFromJailCard: string = JELLICENT_CARD;
	highestBidAmount: number = 0;
	highestBidder: Player | null = null;
	jailSpace: BoardSpace = spaces.pyritetownjail;
	maxCurrency: number = 5000;
	passingGoCurrency: number = 200;
	rafflePrize: number = 200;
	raffleRunner: string = "Jellicent";
	spaces: IBoardSpaces = spaces;
	startingCurrency: number = 1500;

	baseActionCards: BoardActionCard<JellicentsPhantomFinances>[];

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.baseActionCards = [
			function(player): void {
				const currency = this.playerCurrency.get(player)!;
				let text: string;
				if (currency >= DONATE_ACTION_AMOUNT) {
					const players = this.shufflePlayers();
					let randomPlayer = players[0];
					players.shift();
					while (player === randomPlayer) {
						randomPlayer = players[0];
						players.shift();
					}

					let randomPlayerCurrency = this.playerCurrency.get(randomPlayer)!;
					randomPlayerCurrency += DONATE_ACTION_AMOUNT;
					this.playerCurrency.set(randomPlayer, randomPlayerCurrency);
					this.playerCurrency.set(player, currency - DONATE_ACTION_AMOUNT);
					text = "They are feeling generous and donate **" + DONATE_ACTION_AMOUNT + " " + (DONATE_ACTION_AMOUNT > 1 ? this.currencyPluralName : this.currencyName) +
						"** to **" + randomPlayer.name + "**!";
				} else {
					text = "They were feeling generous but they do not have enough " + this.currencyPluralName + " to give any away!";
				}

				this.on(text, () => {
					this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
				});
				this.say(text);
			},
			function(player): void {
				const location = this.getSpaceLocation(this.spaces.ultraspace)!;
				this.playerLocations.set(player, location);
				const text = "They go through a strange portal and end up in " + this.spaces.ultraspace.name + "!";
				this.on(text, () => {
					this.timeout = setTimeout(() => this.onSpaceLanding(player, 0, Object.assign(location, {passedSpaces: []}), true), this.roundTime);
				});
				this.say(text);
			},
			function(player): void {
				const location = this.getSpaceLocation(this.spaces.castelia)!;
				this.playerLocations.set(player, location);
				const text = "They travel to **" + this.spaces.castelia.name + "** to get a Casteliacone!";
				this.on(text, () => {
					this.timeout = setTimeout(() => this.onSpaceLanding(player, 0, Object.assign(location, {passedSpaces: []}), true), this.roundTime);
				});
				this.say(text);
			},
			function(player): void {
				let text = "A Delibird appeared and used Present!";
				if (this.random(2)) {
					text += " It didn't have any " + this.currencyPluralName + " to give!";
				} else {
					const amount = (this.random(5) + 1) * 100;
					text += " It gave them " + amount + " " + (amount > 1 ? this.currencyPluralName : this.currencyName) + "!";
					this.playerCurrency.set(player, this.playerCurrency.get(player)! + amount);
				}
				this.on(text, () => {
					this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
				});
				this.say(text);
			},
		];
	}

	onStart(): void {
		super.onStart();

		for (const player of this.playerOrder) {
			this.playerCurrency.set(player, this.startingCurrency);
			this.properties.set(player, []);
		}
	}

	getActionCards(): BoardActionCard<BoardPropertyGame>[] {
		// @ts-ignore
		return this.sharedActionCards.concat(this.baseActionCards);
	}

	getPlayerPropertiesHtml(player: Player): string {
		const properties = this.properties.get(player) || [];
		return "<b>" + POKE_DOLLAR + "</b>: " + this.playerCurrency.get(player) + "<br /><b>Properties</b>: " + (properties.length ? properties.map(prop => prop.name +
			" (" + prop.color + ")").join(", ") : "(none)");
	}

	onOwnedPropertySpace(space: BoardPropertyRentSpace, player: Player): void {
		const ownerProperties = this.properties.get(space.owner!) || [];
		let rent = 0;
		for (const property of ownerProperties) {
			if (property.color === space.color) {
				rent += this.getSpaceRentValue(property as BoardPropertyRentSpace);
			}
		}

		this.checkRentPayment(space, player, rent);
	}

	onAcquirePropertySpace(property: BoardPropertyRentSpace, player: Player, amount: number): void {
		this.playerCurrency.set(player, this.playerCurrency.get(player)! - amount);
	}

	onPassOnPropertySpace(player: Player): void {
		this.beginAuction();
	}

	onInsufficientCurrencyToAcquire(property: BoardPropertyRentSpace, player: Player): void {
		const text = "They do not have enough " + this.currencyPluralName + " so an auction will begin!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				this.propertyToAcquire = property;
				this.beginAuction();
			}, this.roundTime);
		});
		this.say(text);
	}

	beginAuction(): void {
		this.highestBidAmount = 0;
		this.highestBidder = null;
		this.say("Place your bids for **" + this.propertyToAcquire!.name + "** (cost: **" + this.propertyToAcquire!.cost + " " + POKE_DOLLAR + "**) with ``" +
			Config.commandCharacter + "bid [amount]``!");
		this.canBid = true;
		this.timeout = setTimeout(() => this.sellProperty(), 10 * 1000);
	}

	sellProperty(): void {
		this.canBid = false;
		if (this.highestBidder) {
			this.say("**" + this.propertyToAcquire!.name + "** is sold to **" + this.highestBidder.name + "** for **" + this.highestBidAmount + " " + POKE_DOLLAR + "**!");
			if (this.highestBidAmount === BID_MULTIPLE) this.unlockAchievement(this.highestBidder, achievements.cheapskate!);
			this.acquirePropertySpace(this.propertyToAcquire!, this.highestBidder, this.highestBidAmount);
		} else {
			this.say("No one bid for **" + this.propertyToAcquire!.name + "**!");
		}
		this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
	}
}

const commands: Dict<ICommandDefinition<JellicentsPhantomFinances>> = {
	bid: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canBid || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			const amount = parseInt(target);
			const currency = this.playerCurrency.get(player)!;
			if (!amount || amount <= this.highestBidAmount) return false;
			if (amount > currency) {
				player.say("You cannot bid more " + POKE_DOLLAR + " than you currently have!");
				return false;
			}
			if (amount % BID_MULTIPLE !== 0) {
				player.say("You must bid by a multiple of " + BID_MULTIPLE + " " + POKE_DOLLAR + ".");
				return false;
			}
			this.highestBidder = player;
			this.highestBidAmount = amount;
			if (this.timeout) clearTimeout(this.timeout);
			this.say("The new highest bid is **" + amount + " " + POKE_DOLLAR + "** from **" + player.name + "**!");
			this.timeout = setTimeout(() => this.sellProperty(), this.roundTime);
			return true;
		},
	},
};

export const game: IGameFile<JellicentsPhantomFinances> = Games.copyTemplateProperties(boardPropertyGame, {
	achievements,
	aliases: ["jellicents", "phantomfinances", "jpf"],
	class: JellicentsPhantomFinances,
	commandDescriptions: [Config.commandCharacter + "buy", Config.commandCharacter + "pass", Config.commandCharacter + "bid [amount]", Config.commandCharacter + "rolldice",
		Config.commandCharacter + "escape",
	],
	commands: Object.assign(Tools.deepClone(boardPropertyGame.commands), commands),
	description: "Players travel around the board to buy properties and avoid paying all of their " + POKE_DOLLAR + " as rent for others!",
	mascot: "Jellicent",
	name: "Jellicent's Phantom Finances",
});
