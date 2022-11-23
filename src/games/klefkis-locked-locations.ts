import type { PRNGSeed } from "../lib/prng";
import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";
import type { BoardActionCard } from "./templates/board";
import {
	BoardPropertyGame, game as boardPropertyGame, type BoardPropertyEliminationSpace
} from "./templates/board-property";

type AchievementNames = "ohbabyatriple" | "locksmith" | "mountainmover";

const doublesRollsAchievementAmount = 3;

class KlefkisLockedLocations extends BoardPropertyGame {
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
	currencyName: string = "key";
	currencyPluralName: string = "keys";
	currencyToEscapeJail: number = 1;
	doublesRollsAchievement = KlefkisLockedLocations.achievements.ohbabyatriple;
	doublesRollsAchievementAmount = doublesRollsAchievementAmount;
	escapeFromJailCard: string = "Klefki Card";
	passingGoCurrency: number = 1;
	rafflePrize: number = 1;
	raffleRunner: string = "Klefki";
	randomEffectName = "Victory Road";
	startingCurrency: number = 3;
	timeLimit = 25 * 60 * 1000;
	useChance = true;
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
			this.setTimeout(() => this.checkEliminationChanceOnProperty(player, space, eliminationChance), this.roundTime);
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
			this.setTimeout(() => this.beforeNextRound(), this.roundTime);
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
	variants: [
		{
			name: "Klefki's Locked Locations: Loop",
			variantAliases: ['loop', 'circle'],
			boardType: 'circle',
			reverseDirections: true,
		},
	],
});
