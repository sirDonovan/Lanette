import type { PRNGSeed } from "../lib/prng";
import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";
import type { BoardActionCard } from "./templates/board";
import {
	BoardPropertyGame, type BoardPropertyRentSpace, game as boardPropertyGame
} from "./templates/board-property";

type AchievementNames = "ohbabyatriple" | "cheapskate" | "realestatetycoon" | "mountainmover";

const DONATE_ACTION_MAX = 5;
const BID_MULTIPLE = 5;
const POKE_DOLLAR = "Poké";
const JELLICENT_CARD = "Jellicent Card";

const doublesRollsAchievementAmount = 3;

class JellicentsPhantomFinances extends BoardPropertyGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"ohbabyatriple": {name: "Oh Baby A Triple", type: 'special', bits: 1000, description: 'roll doubles ' +
			doublesRollsAchievementAmount + ' times in one round'},
		"cheapskate": {name: "Cheapskate", type: 'special', bits: 1000, description: 'win a property auction with a bid of ' +
			BID_MULTIPLE + ' Poke'},
		"realestatetycoon": {name: "Real Estate Tycoon", type: 'special', bits: 1000, description: "buy every property on the board"},
		"mountainmover": {name: "Mountain Mover", type: 'special', bits: 1000, description: "acquire every mountain on the board"},
	};

	acquireAllMountainsAchievement = JellicentsPhantomFinances.achievements.mountainmover;
	acquireAllPropertiesAchievement = JellicentsPhantomFinances.achievements.realestatetycoon;
	acquirePropertyAction: string = "buy";
	acquirePropertyActionPast: string = "bought";
	auctionUhtmlName: string = '';
	availablePropertyState: string = "vacant";
	canBid: boolean = false;
	currencyName: string = POKE_DOLLAR;
	currencyPluralName: string = POKE_DOLLAR;
	currencyToEscapeJail: number = 100;
	doublesRollsAchievement = JellicentsPhantomFinances.achievements.ohbabyatriple;
	doublesRollsAchievementAmount = doublesRollsAchievementAmount;
	escapeFromJailCard: string = JELLICENT_CARD;
	highestBidAmount: number = 0;
	highestBidder: Player | null = null;
	maxCurrency: number = 4000;
	passingGoCurrency: number = 200;
	rafflePrize: number = 200;
	raffleRunner: string = "Jellicent";
	startingCurrency: number = 1500;
	timeLimit = 25 * 60 * 1000;
	useCost = true;
	winCondition = 'currency' as const;

	baseActionCards: BoardActionCard<JellicentsPhantomFinances>[];

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.baseActionCards = [
			function(this: JellicentsPhantomFinances, player): void {
				const currency = this.playerCurrency.get(player)!;
				const donationAmount = (this.random(DONATE_ACTION_MAX) + 1) * 100;
				let text: string;
				if (currency >= donationAmount) {
					const players = this.shufflePlayers();
					let randomPlayer = players[0];
					players.shift();
					while (player === randomPlayer) {
						randomPlayer = players[0];
						players.shift();
					}

					let randomPlayerCurrency = this.playerCurrency.get(randomPlayer)!;
					randomPlayerCurrency += donationAmount;
					this.playerCurrency.set(randomPlayer, randomPlayerCurrency);
					this.playerCurrency.set(player, currency - donationAmount);
					text = "They are feeling generous and donate **" + donationAmount + " " + this.currencyPluralName + "** to **" +
						randomPlayer.name + "**!";
				} else {
					text = "They were feeling generous but they do not have enough " + this.currencyPluralName + " to give any away!";
				}

				this.on(text, () => {
					this.setTimeout(() => this.beforeNextRound(), this.roundTime);
				});
				this.say(text);
			},
			function(this: JellicentsPhantomFinances, player): void {
				let text = "A Delibird appeared and used Present!";
				if (this.random(4)) {
					text += " It didn't have any " + this.currencyPluralName + " to give!";
				} else {
					const amount = (this.random(5) + 1) * 100;
					text += " It gave them " + amount + " " + (amount > 1 ? this.currencyPluralName : this.currencyName) + "!";
					this.playerCurrency.set(player, this.playerCurrency.get(player)! + amount);
				}
				this.on(text, () => {
					this.setTimeout(() => this.beforeNextRound(), this.roundTime);
				});
				this.say(text);
			},
		];
	}

	getActionCards(): BoardActionCard<BoardPropertyGame>[] {
		// @ts-expect-error
		return this.sharedActionCards.concat(this.baseActionCards);
	}

	getPlayerPropertiesHtml(player: Player): string {
		const properties = this.properties.get(player) || [];
		return "<b>" + POKE_DOLLAR + "</b>: " + this.playerCurrency.get(player) + "<br /><b>Properties</b>: " +
			(properties.length ? properties.map(prop => prop.name + " (" + prop.color + ")").join(", ") : "(none)");
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

	onPassOnPropertySpace(): void {
		this.beginAuction();
	}

	onInsufficientCurrencyToAcquire(property: BoardPropertyRentSpace): void {
		if (this.acquireProperties) {
			const text = "They do not have enough " + this.currencyPluralName + " so an auction will begin!";
			this.on(text, () => {
				this.setTimeout(() => {
					this.propertyToAcquire = property;
					this.beginAuction();
				}, this.roundTime);
			});
			this.say(text);
		} else {
			this.setTimeout(() => {
				this.propertyToAcquire = property;
				this.beginAuction();
			}, this.roundTime);
		}
	}

	beginAuction(): void {
		this.highestBidAmount = 0;
		this.highestBidder = null;
		this.auctionUhtmlName = this.uhtmlBaseName + '-bid-' + Tools.toId(this.propertyToAcquire!.name);
		this.say("Place your bids for **" + this.propertyToAcquire!.name + "** (cost: **" + this.propertyToAcquire!.cost + " " +
			POKE_DOLLAR + "**) with ``" + Config.commandCharacter + "bid [amount]``!");
		this.canBid = true;
		this.setTimeout(() => this.sellProperty(), 10 * 1000);
	}

	sellProperty(): void {
		this.canBid = false;
		if (this.highestBidder) {
			this.say("**" + this.propertyToAcquire!.name + "** is sold to **" + this.highestBidder.name + "** for **" +
				this.highestBidAmount + " " + POKE_DOLLAR + "**!");
			if (this.highestBidAmount === BID_MULTIPLE) {
				this.unlockAchievement(this.highestBidder, JellicentsPhantomFinances.achievements.cheapskate);
			}
			this.acquirePropertySpace(this.propertyToAcquire!, this.highestBidder, this.highestBidAmount);
		} else {
			this.say("No one bid for **" + this.propertyToAcquire!.name + "**!");
		}
		this.setTimeout(() => this.beforeNextRound(), this.roundTime);
	}
}

const commands: GameCommandDefinitions<JellicentsPhantomFinances> = {
	bid: {
		command(target, room, user) {
			if (!this.canBid) return false;
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
			this.sayUhtml(this.auctionUhtmlName, "<b>Bidding for</b>: " + this.propertyToAcquire!.name + " (worth " +
				this.propertyToAcquire!.cost + " " + POKE_DOLLAR + ")<br /><br />The current highest bid is <b>" + amount + " " +
				POKE_DOLLAR + "</b> from <b>" + player.name + "</b>!");
			this.setTimeout(() => this.sellProperty(), 5 * 1000);
			return true;
		},
	},
};

export const game: IGameFile<JellicentsPhantomFinances> = Games.copyTemplateProperties(boardPropertyGame, {
	aliases: ["jellicents", "phantomfinances", "jpf"],
	class: JellicentsPhantomFinances,
	commandDescriptions: [Config.commandCharacter + "buy", Config.commandCharacter + "pass", Config.commandCharacter + "bid [amount]",
		Config.commandCharacter + "rolldice", Config.commandCharacter + "escape",
	],
	commands: Object.assign((Tools.deepClone(boardPropertyGame.commands) as unknown) as GameCommandDefinitions<JellicentsPhantomFinances>,
		commands),
	description: "Players travel around the board to buy properties and avoid paying all of their Poke as rent for others!",
	mascot: "Jellicent",
	name: "Jellicent's Phantom Finances",
	variants: [
		{
			name: "Auction-only Jellicent's Phantom Finances",
			variantAliases: ['Auction-only', 'Auctions-only', 'auction', 'auctions'],
			acquireProperties: false,
		},
		{
			name: "Jellicent's Phantom Finances: Loop",
			variantAliases: ['loop', 'circle'],
			boardType: 'circle',
			reverseDirections: true,
		},
	],
});
