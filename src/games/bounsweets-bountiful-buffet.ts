import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assertStrictEqual, runCommand } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";

const data: {'meals': string[]; 'aliases': Dict<string>} = {
	meals: [],
	aliases: {},
};

const meals: {'name': string; 'aliases': string[]}[] = [
	{name: "Chansey Eggs", aliases: ['chansey', 'eggs']},
	{name: "Slowpoke Tails", aliases: ['slowpoke', 'tails']},
	{name: "Tropius Fruit", aliases: ['tropius', 'fruit']},
	{name: "Moomoo Milk", aliases: ['moomoo', 'milk']},
	{name: "Combee Honey", aliases: ['combee', 'honey']},
	{name: "Shuckle Juice", aliases: ['shuckle', 'juice']},
	{name: "Farfetch'd Breast", aliases: ['farfetchd', 'breast']},
	{name: "Magikarp Sushi", aliases: ['magikarp', 'sushi']},
	{name: "Octillery Tentacle", aliases: ['octillery', 'tentacle']},
	{name: "Basculin Fillet", aliases: ['basculin', 'fillet']},
];

for (const meal of meals) {
	data.meals.push(meal.name);
	const id = Tools.toId(meal.name);
	for (const alias of meal.aliases) {
		data.aliases[Tools.toId(alias)] = id;
	}
}

class BounsweetsBountifulBuffet extends ScriptedGame {
	canLateJoin: boolean = true;
	canSelect: boolean = false;
	inactiveRoundLimit: number = 5;
	mealPoints: number[] = [];
	meals: string[] = [];
	numberOfMeals: number = 0;
	points = new Map<Player, number>();
	selectedMeals = new Map<Player, number>();

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.offCommands(['select']);
		this.canSelect = false;

		if (this.round > 1) {
			const counts: number[] = [];
			for (let i = 0; i < this.numberOfMeals; i++) {
				counts.push(0);
			}

			let activePlayers = false;
			for (const id in this.players) {
				if (this.players[id].eliminated) continue;
				const index = this.selectedMeals.get(this.players[id]);
				if (!index && index !== 0) continue;
				activePlayers = true;
				counts[index]++;
			}

			if (activePlayers) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				for (const id in this.players) {
					if (this.players[id].eliminated) continue;
					const player = this.players[id];
					const index = this.selectedMeals.get(player);
					if (index || index === 0) {
						let points = this.points.get(player) || 0;
						const earnedPoints = Math.floor(this.mealPoints[index] / counts[index]);
						points += earnedPoints;
						player.say("You earned " + earnedPoints + " points! Your total is now " + points + ".");
						this.points.set(player, points);
					}
				}
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			}
		}

		if (this.round === 11) {
			this.say("The buffet has ended!");
			let highestPoints = 0;
			for (const id in this.players) {
				const player = this.players[id];
				const points = this.points.get(player);
				if (!points) continue;
				if (points > highestPoints) {
					this.winners.clear();
					this.winners.set(player, points);
					highestPoints = points;
				} else if (points === highestPoints) {
					this.winners.set(player, points);
				}
			}

			this.end();
			return;
		}

		this.selectedMeals.clear();
		this.mealPoints = [];
		this.meals = Tools.shuffle(data.meals);
		const mealNames: string[] = [];
		this.numberOfMeals = Math.min(Math.ceil(this.playerCount / 3) + 1, this.meals.length);
		for (let i = 0; i < this.numberOfMeals; i++) {
			this.mealPoints.push((this.random(99) + 1) + (this.random(99) + 1));
			mealNames.push(this.getQuietPmButton("select " + this.meals[i], "<b>" + this.meals[i] + "</b>: " + this.mealPoints[i]));
		}

		const roundHtml = this.getRoundHtml(players => this.getPlayerPoints(players));
		const roundUhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(roundUhtmlName, roundHtml, () => {
			this.setTimeout(() => {
				const mealsHtml = "<center>" + this.getCustomBoxDiv("<h3>Current meals</h3>" + mealNames.join("&nbsp;|&nbsp;")) +
					"</center>";
				const mealsUhtmlName = this.uhtmlBaseName + '-round-meals';
				this.onUhtml(mealsUhtmlName, mealsHtml, () => {
					this.canSelect = true;
					this.setTimeout(() => this.nextRound(), 30 * 1000);
				});
				this.sayUhtml(mealsUhtmlName, mealsHtml);
			}, 5000);
		});
		this.onCommands(['select'], {max: this.getRemainingPlayerCount(), remainingPlayersMax: true}, () => this.nextRound());
		this.sayUhtml(roundUhtmlName, roundHtml);
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.selectedMeals.clear();
	}

	onEnd(): void {
		this.winners.forEach((points, player) => {
			this.addBits(player, 500);
		});
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<BounsweetsBountifulBuffet> = {
	select: {
		command(target, room, user) {
			if (this.selectedMeals.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			target = Tools.toId(target);
			if (target in data.aliases) target = data.aliases[target];
			let index = -1;
			for (let i = 0; i < this.numberOfMeals; i++) {
				if (target === Tools.toId(this.meals[i])) {
					index = i;
					break;
				}
			}
			if (index === -1) {
				user.say("You must specify a valid meal!");
				return false;
			}

			this.selectedMeals.set(player, index);
			player.say("You have chosen **" + this.meals[index] + "**!");
			return true;
		},
		pmOnly: true,
	},
};

const tests: GameFileTests<BounsweetsBountifulBuffet> = {
	'should give the same points for shared meals': {
		test(game): void {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			assertStrictEqual(game.numberOfMeals, 2);
			const expectedPoints = Math.floor(game.mealPoints[0] / 2);
			runCommand('select', game.meals[0], Users.get(players[0].name)!, players[0].name);
			runCommand('select', game.meals[0], Users.get(players[1].name)!, players[1].name);
			assertStrictEqual(game.points.get(players[0]), expectedPoints);
			assertStrictEqual(game.points.get(players[1]), expectedPoints);
		},
	},
	'should give different points for separate meals': {
		test(game): void {
			const players = addPlayers(game, 2);
			game.minPlayers = 2;
			game.start();
			const expectedPointsA = game.mealPoints[0];
			const expectedPointsB = game.mealPoints[1];
			runCommand('select', game.meals[0], Users.get(players[0].name)!, players[0].name);
			runCommand('select', game.meals[1], Users.get(players[1].name)!, players[1].name);
			assertStrictEqual(game.points.get(players[0]), expectedPointsA);
			assertStrictEqual(game.points.get(players[1]), expectedPointsB);
		},
	},
};

export const game: IGameFile<BounsweetsBountifulBuffet> = {
	aliases: ['bounsweets', 'bbb'],
	category: 'luck',
	class: BounsweetsBountifulBuffet,
	commandDescriptions: [Config.commandCharacter + "select [meal]"],
	commands,
	description: "Each round, players select meals and earn points based on how many others choose the same meals!",
	formerNames: ["Buneary's Bountiful Buffet"],
	name: "Bounsweet's Bountiful Buffet",
	mascot: "Bounsweet",
	tests,
};
