import { strictEqual as assertStrictEqual } from 'assert';
import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { addPlayers, runCommand } from '../test/test-tools';
import { GameFileTests, IGameFile } from "../types/games";

const doors: string[][] = [["Red", "Green", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"], ["Diamond", "Pearl", "Platinum"],
["Land", "Sea", "Sky"], ["Time", "Space", "Distortion"], ["Creation", "Destruction", "Harmony"], ["Sun", "Earth", "Moon"]];

class SableyesTrickHouse extends Game {
	canLateJoin: boolean = true;
	canSelect: boolean = false;
	// firstChoice: Player | null;
	points = new Map<Player, number>();
	previousDoors: string[] | null = null;
	roundChoices = new Map<Player, string>();
	roundDoors: string[] = [];
	trapChosen: boolean = false;

	onAddPlayer(player: Player, lateJoin?: boolean) {
		if (this.trapChosen || this.round > 1) {
			player.say("Sorry, the late-join period has ended.");
			return false;
		}
		return true;
	}

	onStart() {
		this.nextRound();
	}

	revealTrap() {
		const trap = this.sampleOne(this.roundDoors);
		const id = Tools.toId(trap);
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const choice = this.roundChoices.get(player);
			if (!choice) {
				this.eliminatePlayer(player, "You did not choose a door!");
			} else if (choice === id) {
				this.eliminatePlayer(player, "You chose the trap door!");
			}
		}

		const text = "The trap was the **" + trap + " door**!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound() {
		this.canSelect = false;
		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return this.end();
		let roundDoors = this.sampleOne(doors);
		while (this.previousDoors && Tools.compareArrays(this.previousDoors, doors)) {
			roundDoors = this.sampleOne(doors);
		}
		this.previousDoors = roundDoors;
		this.roundDoors = roundDoors.slice();
		if (remainingPlayerCount === 2) this.roundDoors.pop();
		this.roundChoices.clear();
		this.onCommands(['select'], {max: remainingPlayerCount, remainingPlayersMax: true}, () => {
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.revealTrap(), 5 * 1000);
		});

		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "You enter room #" + this.round + " and see the following doors: **" + Tools.joinList(this.roundDoors) + "**";
			this.on(text, () => {
				this.canSelect = true;
				this.timeout = setTimeout(() => this.revealTrap(), 30 * 1000);
			});
			this.timeout = setTimeout(() => this.say(text), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			// if (this.firstChoice === winner) Games.unlockAchievement(this.room, winner, "Escape Artist", this);
			this.addBits(winner, 500);
		}
		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<SableyesTrickHouse>> = {
	select: {
		command(target, room, user) {
			if (!this.canSelect || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			if (this.roundChoices.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			const choice = Tools.toId(target);
			let match = -1;
			for (let i = 0; i < this.roundDoors.length; i++) {
				const door = Tools.toId(this.roundDoors[i]);
				if (door === choice) {
					match = i;
					break;
				}
			}
			if (match === -1) {
				player.say("'" + target.trim() + "' is not one of the doors this round.");
				return false;
			}
			if (this.getRemainingPlayerCount() === 2 && this.roundChoices.size) {
				if (choice === this.roundChoices.values().next().value) {
					player.say("You cannot choose the same door as your opponent!");
					return false;
				}
			}

			// if (!this.roundChoices.size) this.markFirstAction(player, 'firstChoice');
			this.roundChoices.set(player, choice);
			player.say("You have chosen the " + this.roundDoors[match] + " door!");
			return true;
		},
	},
};

const tests: GameFileTests<SableyesTrickHouse> = {
	'should only allow one choice per round': {
		test(game) {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.canSelect = true;
			runCommand('select', game.roundDoors[0], game.room, players[0].name);
			runCommand('select', game.roundDoors[1], game.room, players[0].name);
			assertStrictEqual(Tools.toId(game.roundChoices.get(players[0])), Tools.toId(game.roundDoors[0]));
		},
	},
	'should eliminate users who pick the trap': {
		test(game) {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.offCommands(['select']);
			game.canSelect = true;
			runCommand('select', game.roundDoors[0], game.room, players[0].name);
			runCommand('select', game.roundDoors[1], game.room, players[1].name);
			runCommand('select', game.roundDoors[2], game.room, players[2].name);
			game.revealTrap();
			assertStrictEqual(game.getRemainingPlayerCount(), 2);
		},
	},
	'should limit choices to given doors': {
		test(game) {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.canSelect = true;
			runCommand('select', 'mocha', game.room, players[0].name);
			assertStrictEqual(game.roundChoices.has(players[0]), false);
			runCommand('select', game.roundDoors[0], game.room, players[1].name);
			assertStrictEqual(game.roundChoices.has(players[1]), true);
		},
	},
};

export const game: IGameFile<SableyesTrickHouse> = {
	aliases: ["sableyes", "th"],
	commandDescriptions: [Config.commandCharacter + "select [door]"],
	commands,
	class: SableyesTrickHouse,
	description: "Players make their way through various rooms while avoiding the trap doors!",
	formerNames: ["Trick House"],
	name: "Sableye's Trick House",
	mascot: "Sableye",
	tests,
};
