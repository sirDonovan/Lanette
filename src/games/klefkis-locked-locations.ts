import type { PRNGSeed } from "../prng";
import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { BoardSpace } from "./templates/board";
import type { BoardActionCard, IBoard } from "./templates/board";
import {
	BoardActionSpace, BoardEliminationSpace, BoardPropertyEliminationSpace, BoardPropertyGame, game as boardPropertyGame, mountainPrefix
} from "./templates/board-property";

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
	oakslab: new BoardSpace("Oak's Lab", "Light Green"),
	chance: new BoardActionSpace("Action", "Pink"),
	pyritetownjail: new BoardSpace("Pyrite Town Jail", "Orange"),
	pallet: new BoardPropertyEliminationSpace("Pallet", "Red", 1, 5),
	littleroot: new BoardPropertyEliminationSpace("Littleroot", "Red", 1, 5),
	twinleaf: new BoardPropertyEliminationSpace("Twinleaf", "Red", 1, 10),
	diglettscave: new BoardPropertyEliminationSpace("Diglett's Cave", "Light Purple", 1, 15),
	diglettstunnel: new BoardPropertyEliminationSpace("Diglett's Tunnel", "Light Purple", 1, 15),

	mtmoon: new BoardPropertyEliminationSpace(mountainPrefix + " Moon", "Dark Brown", 1, 10),
	mtsilver: new BoardPropertyEliminationSpace(mountainPrefix + " Silver", "Dark Brown", 1, 10),
	mtpyre: new BoardPropertyEliminationSpace(mountainPrefix + " Pyre", "Dark Brown", 1, 10),
	mtcoronet: new BoardPropertyEliminationSpace(mountainPrefix + " Coronet", "Dark Brown", 1, 10),

	// top row
	lakeacuity: new BoardPropertyEliminationSpace("Lake Acuity", "Purple", 1, 10),
	lakeverity: new BoardPropertyEliminationSpace("Lake Verity", "Purple", 1, 10),
	lakevalor: new BoardPropertyEliminationSpace("Lake Valor", "Purple", 1, 15),
	battlefactory: new BoardPropertyEliminationSpace("Battle Factory", "Light Blue", 1, 25),
	battlemaison: new BoardPropertyEliminationSpace("Battle Maison", "Light Blue", 1, 25),

	// right column
	pokemoncenter: new BoardSpace("Pokemon Center", "Blue"),
	viridianforest: new BoardPropertyEliminationSpace("Viridian Forest", "Green", 1, 15),
	eternaforest: new BoardPropertyEliminationSpace("Eterna Forest", "Green", 1, 15),
	pinwheelforest: new BoardPropertyEliminationSpace("Pinwheel Forest", "Green", 1, 20),
	whitetreehollow: new BoardPropertyEliminationSpace("White Treehollow", "Yellow", 1, 30),
	blackcity: new BoardPropertyEliminationSpace("Black City", "Yellow", 1, 30),
	victoryroad: new BoardEliminationSpace("Victory Road", "Blue", 'random'),

	// bottom row
	jubilife: new BoardPropertyEliminationSpace("Jubilife", "Light Gray", 1, 20),
	castelia: new BoardPropertyEliminationSpace("Castelia", "Light Gray", 1, 20),
	lumiose: new BoardPropertyEliminationSpace("Lumiose", "Light Gray", 1, 25),
	ultraspace: new BoardPropertyEliminationSpace("Ultra Space", "Light Brown", 1, 35),
	distortionworld: new BoardPropertyEliminationSpace("Distortion World", "Light Brown", 1, 35),
};

const doublesRollsAchievementAmount = 3;
const achievements: AchievementsDict = {
	"ohbabyatriple": {name: "Oh Baby A Triple", type: 'special', bits: 1000, description: 'roll doubles ' +
		doublesRollsAchievementAmount + ' times in one round'},
	"locksmith": {name: "Locksmith", type: 'special', bits: 1000, description: "unlock every property on the board"},
	"mountainmover": {name: "Mountain Mover", type: 'special', bits: 1000, description: "unlock every mountain on the board"},
};

class KlefkisLockedLocations extends BoardPropertyGame<IBoardSpaces> {
	acquireAllMountainsAchievement = achievements.mountainmover;
	acquireAllPropertiesAchievement = achievements.locksmith;
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
	doublesRollsAchievement = achievements.ohbabyatriple;
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

	onPassOnPropertySpace(player: Player): void {
		this.beforeNextRound();
	}

	onInsufficientCurrencyToAcquire(property: BoardPropertyEliminationSpace, player: Player): void {
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
	achievements,
	aliases: ["klefkis", "lockedlocations", "kll"],
	class: KlefkisLockedLocations,
	commandDescriptions: [Config.commandCharacter + "unlock", Config.commandCharacter + "pass", Config.commandCharacter + "rolldice",
		Config.commandCharacter + "escape"],
	description: "Players travel around the board to unlock properties and avoid getting eliminated by others!",
	mascot: "Klefki",
	name: "Klefki's Locked Locations",
	noOneVsOne: true,
});
