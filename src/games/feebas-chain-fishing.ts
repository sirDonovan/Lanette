import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "quickrod" | "sunkentreasure";

const rods: {rod: string; pokemon: {pokemon: string; points: number}[]}[] = [
	{
		rod: 'Super Rod',
		pokemon: [{pokemon: "Wailmer", points: 250}, {pokemon: "Skrelp", points: 250}, {pokemon: "Sharpedo", points: 300},
			{pokemon: "Seaking", points: 300}, {pokemon: "Gyarados", points: 350}, {pokemon: "Lanturn", points: 300},
			{pokemon: "Tentacruel", points: 300}, {pokemon: "Kingler", points: 300}, {pokemon: "Whiscash", points: 300},
			{pokemon: "Lumineon", points: 300}, {pokemon: "Seadra", points: 300}, {pokemon: "Starmie", points: 300},
			{pokemon: "Clawitzer", points: 300}, {pokemon: "Cloyster", points: 300}, {pokemon: "Dragalge", points: 300},
			{pokemon: "Octillery", points: 350}, {pokemon: "Milotic", points: 350}, {pokemon: "Gorebyss", points: 350},
			{pokemon: "Huntail", points: 350}, {pokemon: "Kingdra", points: 350},
		],
	},
	{
		rod: 'Good Rod',
		pokemon: [{pokemon: "Poliwag", points: 150}, {pokemon: "Tentacool", points: 150}, {pokemon: "Qwilfish", points: 200},
			{pokemon: "Krabby", points: 200}, {pokemon: "Corsola", points: 250}, {pokemon: "Goldeen", points: 200},
			{pokemon: "Wailmer", points: 250}, {pokemon: "Barboach", points: 200}, {pokemon: "Chinchou", points: 200},
			{pokemon: "Shellder", points: 200}, {pokemon: "Horsea", points: 200}, {pokemon: "Finneon", points: 200},
			{pokemon: "Staryu", points: 200}, {pokemon: "Clauncher", points: 200}, {pokemon: "Skrelp", points: 250},
			{pokemon: "Remoraid", points: 200}, {pokemon: "Feebas", points: 250}, {pokemon: "Clamperl", points: 250},
		],
	},
	{
		rod: 'Old Rod',
		pokemon: [{pokemon: "Poliwag", points: 150}, {pokemon: "Tentacool", points: 150}, {pokemon: "Magikarp", points: 100},
			{pokemon: "Magikarp", points: 100}, {pokemon: "Magikarp", points: 100}, {pokemon: "Magikarp", points: 100},
		],
	},
];

class FeebasChainFishing extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"quickrod": {name: "Quick Rod", type: 'first', bits: 1000, description: 'reel first in every round'},
		"sunkentreasure": {name: "Sunken Treasure", type: 'special', bits: 1000, repeatBits: 250, description: 'reel in a shiny Pokemon'},
	};

	canReel: boolean = false;
	firstReel: Player | false | undefined;
	highestPoints: number = 0;
	inactiveRoundLimit: number = 5;
	maxPoints: number = 2000;
	maxRound: number = 20;
	points = new Map<Player, number>();
	roundReels = new Map<Player, boolean>();
	queue: Player[] = [];

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	onNextRound(): void {
		this.canReel = false;
		if (this.round > 1) {
			let highestPoints = 0;
			if (this.queue.length) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				const roundRods = rods.slice();
				let currentRod = roundRods[0];
				roundRods.shift();
				let num = 0;
				const divisor = Math.floor(this.getRemainingPlayerCount() / 3);
				for (let i = 0; i < this.queue.length; i++) {
					const player = this.queue[i];
					const reel = this.sampleOne(currentRod.pokemon);
					if (this.rollForShinyPokemon()) this.unlockAchievement(player, FeebasChainFishing.achievements.sunkentreasure);
					let points = reel.points;
					if (i === 0) {
						if (this.firstReel === undefined) {
							this.firstReel = player;
						} else {
							if (this.firstReel && this.firstReel !== player) this.firstReel = false;
						}
						points += 50;
					}
					let totalPoints = this.points.get(player) || 0;
					totalPoints += points;
					this.points.set(player, totalPoints);
					player.say("Your " + currentRod.rod + " reeled in " + reel.pokemon + " for " + points + " points! Your total is now " +
						totalPoints);
					if (totalPoints > highestPoints) highestPoints = totalPoints;
					num++;
					if (num > divisor && roundRods.length) {
						num = 0;
						currentRod = roundRods[0];
						roundRods.shift();
					}
				}
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			}
			this.highestPoints = highestPoints;
			if (this.highestPoints >= this.maxPoints) return this.end();
		}
		this.roundReels.clear();
		this.queue = [];
		const roundHtml = this.getRoundHtml(players => this.getPlayerPoints(players));
		const roundUhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(roundUhtmlName, roundHtml, () => {
			const reelHtml = "<div class='infobox'><center><blink><font size='3'><b>[ ! ]</b></font></blink></center></div>";
			const reelUhtmlName = this.uhtmlBaseName + '-reel';
			this.onUhtml(reelUhtmlName, reelHtml, () => {
				this.canReel = true;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			const time = this.sampleOne([8000, 9000, 10000]);
			this.timeout = setTimeout(() => this.sayUhtml(reelUhtmlName, reelHtml), time);
		});
		this.sayUhtml(roundUhtmlName, roundHtml);
	}

	onEnd(): void {
		let highestPoints = 0;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			if (points > highestPoints) {
				this.winners.clear();
				highestPoints = points;
			}
			if (points === highestPoints) this.winners.set(player, 1);
		}

		this.winners.forEach((value, player) => {
			this.addBits(player, 500);
			if (this.firstReel === player) this.unlockAchievement(player, FeebasChainFishing.achievements.quickrod);
		});
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<FeebasChainFishing> = {
	reel: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.roundReels.has(this.players[user.id])) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			this.roundReels.set(player, true);
			if (!this.canReel) return false;
			this.queue.push(player);
			return true;
		},
	},
};

export const game: IGameFile<FeebasChainFishing> = {
	aliases: ["feebas", "fcf", "cf"],
	category: 'reaction',
	commandDescriptions: [Config.commandCharacter + "reel"],
	commands,
	class: FeebasChainFishing,
	description: "Players await the [ ! ] signal to reel in Pokemon!",
	formerNames: ["Chain Fishing"],
	freejoin: true,
	name: "Feebas' Chain Fishing",
	mascot: "Feebas",
};
