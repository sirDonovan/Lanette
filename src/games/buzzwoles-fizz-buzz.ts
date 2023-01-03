import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

type ExpectedMultiple = 'firstMultiple' | 'secondMultiple' | 'both' | number;

const data: {"categories": string[]; "categoryPools": Dict<string[]>} = {
	"categories": ['Plate', 'Mega Stone', 'Berry', 'contact move', 'sound move'],
	"categoryPools": {},
};

class BuzzwolesFizzBuzz extends ScriptedGame {
	maxPlayers: number = 20;
	playerOrder: Player[] = [];
	playerList: Player[] = [];
	timeLimit: number = 20 * 60 * 1000;
	quizRound: number = 0;
	currentNumber: number = 0;
	firstMultiple: number = 0;
	maxNumber: number = 100;
	secondMultiple: number = 0;
	expectedMultiple: ExpectedMultiple = 0;
	roundCategories: {'firstMultiple': string; 'secondMultiple': string} = {firstMultiple: '', secondMultiple: ''};
	expectedMultiples: {'firstMultiple': string[]; 'secondMultiple': string[]} = {firstMultiple: [], secondMultiple: []};

	static loadData(): void {
		for (const key of Dex.getData().typeKeys) {
			data.categories.push(Dex.getExistingType(key).name + " type Pokemon");
		}

		for (const category of data.categories) {
			data.categoryPools[Tools.toId(category)] = [];
		}

		const pokedex = Games.getPokemonList();
		for (const pokemon of pokedex) {
			data.categoryPools[Tools.toId(pokemon.types[0] + 'typepokemon')].push(pokemon.id);
			if (pokemon.types.length > 1) data.categoryPools[Tools.toId(pokemon.types[1] + 'typepokemon')].push(pokemon.id);
		}

		const items = Games.getItemsList();
		for (const item of items) {
			if (item.onPlate) {
				data.categoryPools.plate.push(item.id);
				data.categoryPools.plate.push(item.id.substr(0, item.id.length - 5));
			} else if (item.megaStone) {
				data.categoryPools.megastone.push(item.id);
			} else if (item.isBerry) {
				data.categoryPools.berry.push(item.id);
				data.categoryPools.berry.push(item.id.substr(0, item.id.length - 5));
			}
		}

		const moves = Games.getMovesList(x => !!x.flags);
		for (const move of moves) {
			if (move.flags.contact) data.categoryPools.contactmove.push(move.id);
			if (move.flags.sound) data.categoryPools.soundmove.push(move.id);
		}
	}

	onStart(): void {
		this.playerOrder = this.shufflePlayers();
		this.resetCount();
	}

	getDisplayedRoundNumber(): number {
		return this.quizRound;
	}

	resetCount(): void {
		this.currentNumber = 0;
		let firstMultiple = 2;
		let secondMultiple = 2;
		const finalTwo = this.getRemainingPlayerCount() === 2;
		while (firstMultiple % secondMultiple === 0 || secondMultiple % firstMultiple === 0 || (finalTwo &&
			(firstMultiple % 2 === 0 || secondMultiple % 2 === 0))) {
			firstMultiple = this.random(3) + 2;
			secondMultiple = this.random(8) + 2;
		}

		const multiples = [firstMultiple, secondMultiple].sort((a, b) => a - b);
		this.firstMultiple = multiples[0];
		this.secondMultiple = multiples[1];

		const categories = this.sampleMany(data.categories, 2);
		this.roundCategories['firstMultiple'] = categories[0];
		categories.shift();
		this.roundCategories['secondMultiple'] = categories[0];
		categories.shift();

		const firstCategory = this.roundCategories['firstMultiple'];
		const secondCategory = this.roundCategories['secondMultiple'];
		this.expectedMultiples['firstMultiple'] = data.categoryPools[Tools.toId(firstCategory)].slice();
		this.expectedMultiples['secondMultiple'] = data.categoryPools[Tools.toId(secondCategory)].slice();
		this.quizRound++;

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.setTimeout(() => {
				const text = "Replace every multiple of **" + this.firstMultiple + "** with a " + firstCategory + " and replace every " +
					"multiple of **" + this.secondMultiple + "** with a " + secondCategory + "!";
				this.on(text, () => this.setTimeout(() => this.nextRound(), 10 * 1000));
				this.say(text);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			this.currentPlayer.eliminated = true;
			this.currentPlayer = null;
			this.say("Time is up!");
		}

		if (this.getRemainingPlayerCount() < 2) {
			this.end();
			return;
		}

		if (!this.playerList.length) this.playerList = this.playerOrder.slice();
		let player = this.playerList[0];
		this.playerList.shift();
		while (player.eliminated) {
			if (!this.playerList.length) {
				this.playerList = this.playerOrder.slice();
			}
			player = this.playerList[0];
			this.playerList.shift();
		}

		const nextNumber = this.currentNumber + 1;
		let expectedMultiple: ExpectedMultiple = 0;
		if (nextNumber % this.firstMultiple === 0) {
			expectedMultiple = 'firstMultiple';
		}
		if (nextNumber % this.secondMultiple === 0) {
			if (expectedMultiple === 'firstMultiple') {
				expectedMultiple = 'both';
			} else {
				expectedMultiple = 'secondMultiple';
			}
		}
		if (!expectedMultiple) expectedMultiple = nextNumber;
		this.expectedMultiple = expectedMultiple;

		const text = player.name + " you are up! | Current number: " + this.currentNumber;
		this.on(text, () => {
			this.currentPlayer = player;
			this.setTimeout(() => this.nextRound(), 10 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (!this.players[i].eliminated) this.winners.set(this.players[i], 1);
		}

		this.winners.forEach((value, player) => {
			this.addBits(player, 500);
		});

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<BuzzwolesFizzBuzz> = {
	fizz: {
		command(target, room, user) {
			if (!this.currentPlayer || this.players[user.id] !== this.currentPlayer) return false;

			if (this.timeout) clearTimeout(this.timeout);
			const guess = Tools.toId(target);
			let match = false;
			if (typeof this.expectedMultiple === 'number') {
				match = parseInt(guess) === this.expectedMultiple;
			} else {
				if (this.expectedMultiple === 'both') {
					for (let i = 0; i < this.expectedMultiples['firstMultiple'].length; i++) {
						if (guess === this.expectedMultiples['firstMultiple'][i]) {
							match = true;
							this.expectedMultiples['firstMultiple'].splice(i, 1);
							if (this.roundCategories['firstMultiple'] === 'Plate') {
								if (guess.endsWith('plate')) {
									this.expectedMultiples['firstMultiple'].splice(this.expectedMultiples['firstMultiple']
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples['firstMultiple'].splice(this.expectedMultiples['firstMultiple']
										.indexOf(guess + 'plate'), 1);
								}
							} else if (this.roundCategories['firstMultiple'] === 'Berry') {
								if (guess.endsWith('berry')) {
									this.expectedMultiples['firstMultiple'].splice(this.expectedMultiples['firstMultiple']
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples['firstMultiple'].splice(this.expectedMultiples['firstMultiple']
										.indexOf(guess + 'berry'), 1);
								}
							}
							if (!this.expectedMultiples['firstMultiple'].length) {
								this.say("Resetting the " + this.roundCategories['firstMultiple'] + " list!");
								this.expectedMultiples['firstMultiple'] =
									data.categoryPools[Tools.toId(this.roundCategories['firstMultiple'])].slice();
							}
							break;
						}
					}
					for (let i = 0; i < this.expectedMultiples['secondMultiple'].length; i++) {
						if (guess === this.expectedMultiples['secondMultiple'][i]) {
							match = true;
							this.expectedMultiples['secondMultiple'].splice(i, 1);
							if (this.roundCategories['secondMultiple'] === 'Plate') {
								if (guess.endsWith('plate')) {
									this.expectedMultiples['secondMultiple'].splice(this.expectedMultiples['secondMultiple']
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples['secondMultiple'].splice(this.expectedMultiples['secondMultiple']
										.indexOf(guess + 'plate'), 1);
								}
							} else if (this.roundCategories['secondMultiple'] === 'Berry') {
								if (guess.endsWith('berry')) {
									this.expectedMultiples['secondMultiple'].splice(this.expectedMultiples['secondMultiple']
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples['secondMultiple'].splice(this.expectedMultiples['secondMultiple']
										.indexOf(guess + 'berry'), 1);
								}
							}
							if (!this.expectedMultiples['secondMultiple'].length) {
								this.say("Resetting the " + this.roundCategories['secondMultiple'] + " list!");
								this.expectedMultiples['secondMultiple'] =
									data.categoryPools[Tools.toId(this.roundCategories['secondMultiple'])].slice();
							}
							break;
						}
					}
				} else {
					let otherMultiple: 'firstMultiple' | 'secondMultiple';
					if (this.expectedMultiple === 'firstMultiple') {
						otherMultiple = 'secondMultiple';
					} else {
						otherMultiple = 'firstMultiple';
					}
					for (let i = 0, len = this.expectedMultiples[this.expectedMultiple].length; i < len; i++) {
						if (guess === this.expectedMultiples[this.expectedMultiple][i]) {
							match = true;
							this.expectedMultiples[this.expectedMultiple].splice(i, 1);
							if (this.roundCategories[this.expectedMultiple] === 'Plate') {
								if (guess.endsWith('plate')) {
									this.expectedMultiples[this.expectedMultiple].splice(this.expectedMultiples[this.expectedMultiple]
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples[this.expectedMultiple].splice(this.expectedMultiples[this.expectedMultiple]
										.indexOf(guess + 'plate'), 1);
								}
							} else if (this.roundCategories[this.expectedMultiple] === 'Berry') {
								if (guess.endsWith('berry')) {
									this.expectedMultiples[this.expectedMultiple].splice(this.expectedMultiples[this.expectedMultiple]
										.indexOf(guess.substr(0, guess.length - 5)), 1);
								} else {
									this.expectedMultiples[this.expectedMultiple].splice(this.expectedMultiples[this.expectedMultiple]
										.indexOf(guess + 'berry'), 1);
								}
							}
							if (!this.expectedMultiples[this.expectedMultiple].length) {
								this.say("Resetting the " + this.roundCategories[this.expectedMultiple] + " list!");
								this.expectedMultiples[this.expectedMultiple] =
									data.categoryPools[Tools.toId(this.roundCategories[this.expectedMultiple])].slice();
							}
							break;
						}
					}

					// remove from other list if found
					for (let i = 0, len = this.expectedMultiples[otherMultiple].length; i < len; i++) {
						if (guess === this.expectedMultiples[otherMultiple][i]) {
							if (match) {
								this.expectedMultiples[otherMultiple].splice(i, 1);
								if (!this.expectedMultiples[otherMultiple].length) {
									this.say("Resetting the " + this.roundCategories[otherMultiple] + " list!");
									this.expectedMultiples[otherMultiple] =
										data.categoryPools[Tools.toId(this.roundCategories[otherMultiple])].slice();
								}
							}
							break;
						}
					}
				}
			}

			if (match) {
				this.currentPlayer = null;
				this.currentNumber++;
				if (this.currentNumber === this.maxNumber) {
					this.resetCount();
				} else {
					this.nextRound();
				}
			} else {
				this.say(user.name + " was eliminated from the game!");
				this.eliminatePlayer(this.currentPlayer);
				this.currentPlayer = null;
				if (this.getRemainingPlayerCount() < 2) {
					this.end();
					return true;
				}
				this.resetCount();
			}

			return true;
		},
	},
};

export const game: IGameFile<BuzzwolesFizzBuzz> = {
	aliases: ['buzzwoles', 'qb'],
	category: 'knowledge-3',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	class: BuzzwolesFizzBuzz,
	commandDescriptions: [Config.commandCharacter + "fizz [number or item]"],
	commands,
	description: "Players take turns counting and replace certain multiples with items in the chosen categories " +
		"(no repeats in a round). <a href='https://www.tapatalk.com/groups/ps_game_corner/quiz-buzz-t110.html'>More info</a>",
	formerNames: ["Quiz Buzz", "Quiz Buzzwole"],
	name: "Buzzwole's Fizz Buzz",
	mascot: "Buzzwole",
	scriptedOnly: true,
};
