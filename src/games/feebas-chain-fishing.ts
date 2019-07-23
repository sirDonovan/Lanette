import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

const rods: {rod: string, pokemon: {pokemon: string, points: number}[]}[] = [
	{rod: 'Super Rod', pokemon: [{pokemon: "Wailmer", points: 250}, {pokemon: "Skrelp", points: 250}, {pokemon: "Sharpedo", points: 300}, {pokemon: "Seaking", points: 300}, {pokemon: "Gyarados", points: 350},
		{pokemon: "Lanturn", points: 300}, {pokemon: "Tentacruel", points: 300}, {pokemon: "Kingler", points: 300}, {pokemon: "Whiscash", points: 300}, {pokemon: "Lumineon", points: 300},
		{pokemon: "Seadra", points: 300}, {pokemon: "Starmie", points: 300}, {pokemon: "Clawitzer", points: 300}, {pokemon: "Cloyster", points: 300}, {pokemon: "Dragalge", points: 300},
		{pokemon: "Octillery", points: 350}, {pokemon: "Milotic", points: 350}, {pokemon: "Gorebyss", points: 350}, {pokemon: "Huntail", points: 350}, {pokemon: "Kingdra", points: 350}],
	},
	{rod: 'Good Rod', pokemon: [{pokemon: "Poliwag", points: 150}, {pokemon: "Tentacool", points: 150}, {pokemon: "Qwilfish", points: 200}, {pokemon: "Krabby", points: 200},
		{pokemon: "Corsola", points: 250}, {pokemon: "Goldeen", points: 200}, {pokemon: "Wailmer", points: 250}, {pokemon: "Barboach", points: 200}, {pokemon: "Chinchou", points: 200},
		{pokemon: "Shellder", points: 200}, {pokemon: "Horsea", points: 200}, {pokemon: "Finneon", points: 200}, {pokemon: "Staryu", points: 200}, {pokemon: "Clauncher", points: 200},
		{pokemon: "Skrelp", points: 250}, {pokemon: "Remoraid", points: 200}, {pokemon: "Feebas", points: 250}, {pokemon: "Clamperl", points: 250}],
	},
	{rod: 'Old Rod', pokemon: [{pokemon: "Poliwag", points: 150}, {pokemon: "Tentacool", points: 150}, {pokemon: "Magikarp", points: 100}, {pokemon: "Magikarp", points: 100},
		{pokemon: "Magikarp", points: 100}, {pokemon: "Magikarp", points: 100}],
	},
];

class FeebasChainFishing extends Game {
	canReel: boolean = false;
	// firstReel: Player | null;
	highestPoints: number = 0;
	maxPoints: number = 2000;
	points = new Map<Player, number>();
	roundLimit: number = 20;
	roundReels = new Map<Player, boolean>();
	queue: Player[] = [];

	onSignups() {
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		}
	}

	onNextRound() {
		this.canReel = false;
		if (this.round > 1) {
			const roundRods = rods.slice();
			let currentRod = roundRods[0];
			roundRods.shift();
			let num = 0;
			let highestPoints = 0;
			const divisor = Math.floor(this.getRemainingPlayerCount() / 3);
			for (let i = 0; i < this.queue.length; i++) {
				const player = this.queue[i];
				const reel = Tools.sampleOne(currentRod.pokemon);
				let points = reel.points;
				if (i === 0) {
					// this.markFirstAction(player, 'firstReel');
					points += 50;
				}
				let totalPoints = this.points.get(player) || 0;
				totalPoints += points;
				this.points.set(player, totalPoints);
				player.say("Your " + currentRod.rod + " reeled in " + reel.pokemon + " for " + points + " points! Your total is now " + totalPoints);
				if (totalPoints > highestPoints) highestPoints = totalPoints;
				num++;
				if (num > divisor && roundRods.length) {
					num = 0;
					currentRod = roundRods[0];
					roundRods.shift();
				}
			}
			this.highestPoints = highestPoints;
			if (this.highestPoints >= this.maxPoints) return this.end();
			if (this.round > this.roundLimit) return this.end();
		}
		this.roundReels.clear();
		this.queue = [];
		const time = Tools.sampleOne([8000, 9000, 10000]);
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(html, uhtmlName, () => {
			const html = "<div class='infobox'><center><blink><font size='3'><b>[ ! ]</b></font></blink></center></div>";
			const uhtmlName = this.uhtmlBaseName + '-reel';
			this.onUhtml(html, uhtmlName, () => {
				this.canReel = true;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.timeout = setTimeout(() => this.sayUhtml(html, uhtmlName), time);
		});
		this.sayUhtml(html, uhtmlName);
	}

	onEnd() {
		let highestPoints = 0;
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			const points = this.points.get(player);
			if (!points) continue;
			if (points > highestPoints) {
				this.winners.clear();
				highestPoints = points;
			}
			if (points === highestPoints) this.winners.set(player, 1);
		}
		const names = this.getPlayerNames(this.winners);
		this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + names);
		let earnings = 500;
		if (earnings > 1000) earnings = 1000;
		this.winners.forEach((value, user) => {
			this.addBits(user, earnings);
			// if (this.firstReel === user) Games.unlockAchievement(this.room, user, "Shiny Hunter", this);
		});
	}
}

const commands: Dict<ICommandDefinition<FeebasChainFishing>> = {
	reel: {
		command(target, room, user) {
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundReels.has(player) || player.eliminated) return;
			this.roundReels.set(player, true);
			if (!this.canReel) return;
			this.queue.push(player);
		},
	},
};

export const game: IGameFile<FeebasChainFishing> = {
	aliases: ["feebas", "fcf", "cf"],
	battleFrontierCategory: 'Reaction',
	commandDescriptions: [Config.commandCharacter + "reel"],
	commands,
	class: FeebasChainFishing,
	description: "Players await the [ ! ] signal to reel in Pokemon!",
	formerNames: ["Chain Fishing"],
	freejoin: true,
	name: "Feebas' Chain Fishing",
	mascot: "Feebas",
};
