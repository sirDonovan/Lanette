import type { PRNGSeed } from "../lib/prng";
import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";
import type { BoardActionCard, IBoard } from "./templates/board";
import { BoardSpace } from "./templates/board";
import {
	BoardActionSpace, BoardEliminationSpace, BoardPropertyEliminationSpace, BoardPropertyGame, game as boardPropertyGame, mountainPrefix
} from "./templates/board-property";

type AchievementNames = "ohbabyatriple" | "locksmith" | "mountainmover";

interface IBoardSpaces {
	oakslab: BoardSpace;
	chance: BoardActionSpace;
	pyritetownjail: BoardSpace;
	pallet: BoardPropertyEliminationSpace;
	littleroot: BoardPropertyEliminationSpace;
	twinleaf: BoardPropertyEliminationSpace;
	diglettscave: BoardPropertyEliminationSpace;
	diglettstunnel: BoardPropertyEliminationSpace;

	mtmoon: BoardPropertyEliminationSpace;
	mtsilver: BoardPropertyEliminationSpace;
	mtpyre: BoardPropertyEliminationSpace;
	mtcoronet: BoardPropertyEliminationSpace;

	lakeacuity: BoardPropertyEliminationSpace;
	lakeverity: BoardPropertyEliminationSpace;
	lakevalor: BoardPropertyEliminationSpace;
	battlefactory: BoardPropertyEliminationSpace;
	battlemaison: BoardPropertyEliminationSpace;

	pokemoncenter: BoardSpace;
	viridianforest: BoardPropertyEliminationSpace;
	eternaforest: BoardPropertyEliminationSpace;
	pinwheelforest: BoardPropertyEliminationSpace;
	whitetreehollow: BoardPropertyEliminationSpace;
	blackcity: BoardPropertyEliminationSpace;
	victoryroad: BoardEliminationSpace;

	jubilife: BoardPropertyEliminationSpace;
	castelia: BoardPropertyEliminationSpace;
	lumiose: BoardPropertyEliminationSpace;
	ultraspace: BoardPropertyEliminationSpace;
	distortionworld: BoardPropertyEliminationSpace;
}

const spaces: IBoardSpaces = {
	// leftColumn
	oakslab: new BoardSpace("Oak's Lab", "White"),
	chance: new BoardActionSpace("Action", "Light-Pink"),
	pyritetownjail: new BoardSpace("Pyrite Town Jail", "Gray"),
	pallet: new BoardPropertyEliminationSpace("Pallet", "Red", 1, 5),
	littleroot: new BoardPropertyEliminationSpace("Littleroot", "Red", 1, 5),
	twinleaf: new BoardPropertyEliminationSpace("Twinleaf", "Red", 1, 10),
	diglettscave: new BoardPropertyEliminationSpace("Diglett's Cave", "Red-Violet", 1, 15),
	diglettstunnel: new BoardPropertyEliminationSpace("Diglett's Tunnel", "Red-Violet", 1, 15),

	mtmoon: new BoardPropertyEliminationSpace(mountainPrefix + " Moon", "Dark-Brown", 1, 10),
	mtsilver: new BoardPropertyEliminationSpace(mountainPrefix + " Silver", "Dark-Brown", 1, 10),
	mtpyre: new BoardPropertyEliminationSpace(mountainPrefix + " Pyre", "Dark-Brown", 1, 10),
	mtcoronet: new BoardPropertyEliminationSpace(mountainPrefix + " Coronet", "Dark-Brown", 1, 10),

	// top row
	lakeacuity: new BoardPropertyEliminationSpace("Lake Acuity", "Violet", 1, 10),
	lakeverity: new BoardPropertyEliminationSpace("Lake Verity", "Violet", 1, 10),
	lakevalor: new BoardPropertyEliminationSpace("Lake Valor", "Violet", 1, 15),
	battlefactory: new BoardPropertyEliminationSpace("Battle Factory", "Blue-Violet", 1, 25),
	battlemaison: new BoardPropertyEliminationSpace("Battle Maison", "Blue-Violet", 1, 25),

	// right column
	pokemoncenter: new BoardSpace("Pokemon Center", "Blue"),
	viridianforest: new BoardPropertyEliminationSpace("Viridian Forest", "Green", 1, 15),
	eternaforest: new BoardPropertyEliminationSpace("Eterna Forest", "Green", 1, 15),
	pinwheelforest: new BoardPropertyEliminationSpace("Pinwheel Forest", "Green", 1, 20),
	whitetreehollow: new BoardPropertyEliminationSpace("White Treehollow", "Yellow", 1, 30),
	blackcity: new BoardPropertyEliminationSpace("Black City", "Yellow", 1, 30),
	victoryroad: new BoardEliminationSpace("Victory Road", "Blue", 'random'),

	// bottom row
	jubilife: new BoardPropertyEliminationSpace("Jubilife", "Orange", 1, 20),
	castelia: new BoardPropertyEliminationSpace("Castelia", "Orange", 1, 20),
	lumiose: new BoardPropertyEliminationSpace("Lumiose", "Orange", 1, 25),
	ultraspace: new BoardPropertyEliminationSpace("Ultra Space", "Red-Orange", 1, 35),
	distortionworld: new BoardPropertyEliminationSpace("Distortion World", "Red-Orange", 1, 35),
};

const doublesRollsAchievementAmount = 3;

class KlefkisLockedLocations extends BoardPropertyGame<IBoardSpaces> {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"ohbabyatriple": {name: "Oh Baby A Triple", type: 'special', bits: 1000, description: 'roll doubles ' +
			doublesRollsAchievementAmount + ' times in one round'},
		"locksmith": {name: "Locksmith", type: 'special', bits: 1000, description: "unlock every property on the board"},
		"mountainmover": {name: "Mountain Mover", type: 'special', bits: 1000, description: "acquire every mountain on the board"},
	};

	acquireAllMountainsAchievement = KlefkisLockedLocations.achievements.mountainmover;
	acquireAllPropertiesAchievement = KlefkisLockedLocations.achievements.locksmith;
	acquirePropertyAction: string = "unlock";
	acquirePropertyActionPast: string = "unlocked";
	availablePropertyState: string = "locked";
	board: IBoard = {
		leftColumn: [spaces.oakslab, spaces.pallet, spaces.littleroot, spaces.chance, spaces.twinleaf, spaces.mtmoon, spaces.chance,
			spaces.diglettscave, spaces.diglettstunnel, spaces.pyritetownjail,
		],
		topRow: [spaces.lakeacuity, spaces.lakeverity, spaces.chance, spaces.lakevalor, spaces.mtsilver, spaces.chance,
			spaces.battlefactory, spaces.battlemaison],
		rightColumn: [spaces.pokemoncenter, spaces.viridianforest, spaces.eternaforest, spaces.chance, spaces.pinwheelforest, spaces.mtpyre,
			spaces.chance, spaces.whitetreehollow, spaces.blackcity, spaces.victoryroad,
		],
		bottomRow: [spaces.jubilife, spaces.castelia, spaces.chance, spaces.lumiose, spaces.mtcoronet, spaces.chance, spaces.ultraspace,
			spaces.distortionworld],
	};
	currencyName: string = "key";
	currencyPluralName: string = "keys";
	currencyToEscapeJail: number = 1;
	doublesRollsAchievement = KlefkisLockedLocations.achievements.ohbabyatriple;
	doublesRollsAchievementAmount = doublesRollsAchievementAmount;
	escapeFromJailCard: string = "Klefki Card";
	jailSpace: BoardSpace = spaces.pyritetownjail;
	passingGoCurrency: number = 1;
	rafflePrize: number = 1;
	raffleRunner: string = "Klefki";
	spaces: IBoardSpaces = spaces;
	startingCurrency: number = 3;
	timeLimit = 25 * 60 * 1000;
	winCondition = 'property' as const;

	baseActionCards: BoardActionCard<KlefkisLockedLocations>[];

	constructor(room: Room | User, pmRoom?: Room, initialSeed?: PRNGSeed) {
		super(room, pmRoom, initialSeed);

		this.baseActionCards = [
			function(this: KlefkisLockedLocations, player): void {
				let text = "A Delibird appeared and used Present!";
				if (this.random(4)) {
					text += " It didn't have any " + this.currencyPluralName + " to give!";
				} else {
					const amount = 1;
					text += " It gave them " + amount + " " + this.currencyName + "!";
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

	getActionCards(): BoardActionCard<BoardPropertyGame<IBoardSpaces>>[] {
		// @ts-expect-error
		return this.sharedActionCards.concat(this.baseActionCards);
	}

	getPlayerPropertiesHtml(player: Player): string {
		const properties = this.properties.get(player) || [];
		return "<b>Keys</b>: " + this.playerCurrency.get(player) + "<br /><b>Properties</b>: " +
			(properties.length ? properties.map(prop => prop.name + " (" + prop.color + ")").join(", ") : "(none)");
	}

	onOwnedPropertySpace(space: BoardPropertyEliminationSpace, player: Player): void {
		const ownerProperties = this.properties.get(space.owner!) || [];
		let eliminationChance = 0;
		for (const property of ownerProperties) {
			if (property.color === space.color) {
				eliminationChance += this.getSpaceEliminationValue(property as BoardPropertyEliminationSpace);
			}
		}

		const text = "**" + space.name + "** has an elimination chance of **" + eliminationChance + "%**!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.checkEliminationChanceOnProperty(player, space, eliminationChance), this.roundTime);
		});
		this.say(text);
	}

	onAcquirePropertySpace(property: BoardPropertyEliminationSpace, player: Player, amount: number): void {
		this.playerCurrency.set(player, this.playerCurrency.get(player)! - amount);
	}

	onPassOnPropertySpace(): void {
		this.beforeNextRound();
	}

	onInsufficientCurrencyToAcquire(property: BoardPropertyEliminationSpace): void {
		const text = "They do not have enough " + this.currencyPluralName + " so **" + property.name + "** will remain locked!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.beforeNextRound(), this.roundTime);
		});
		this.say(text);
	}

	checkEliminationChanceOnProperty(player: Player, space: BoardPropertyEliminationSpace, eliminationChance: number): void {
		this.checkEliminationChance(player, eliminationChance, space.owner!);
	}
}

export const game: IGameFile<KlefkisLockedLocations> = Games.copyTemplateProperties(boardPropertyGame, {
	aliases: ["klefkis", "lockedlocations", "kll"],
	class: KlefkisLockedLocations,
	commandDescriptions: [Config.commandCharacter + "unlock", Config.commandCharacter + "pass", Config.commandCharacter + "rolldice",
		Config.commandCharacter + "escape"],
	description: "Players travel around the board to unlock properties and avoid getting eliminated by others!",
	mascot: "Klefki",
	name: "Klefki's Locked Locations",
	noOneVsOne: true,
});
