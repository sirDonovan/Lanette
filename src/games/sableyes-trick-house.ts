import type { ICommandDefinition } from "../command-parser";
import type { Player } from "../room-activity";
import { Game } from "../room-game";
import { addPlayers, runCommand, assertStrictEqual } from '../test/test-tools';
import type { AchievementsDict, GameCommandReturnType, GameFileTests, IGameFile } from "../types/games";

const doors: string[][] = [["Red", "Green", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"],
	["Diamond", "Pearl", "Platinum"], ["Land", "Sea", "Sky"], ["Time", "Space", "Distortion"], ["Creation", "Destruction", "Harmony"],
	["Sun", "Earth", "Moon"]];

const achievements: AchievementsDict = {
	"escapeartist": {name: "Escape Artist", type: 'first', bits: 1000, description: "select a door first every round and win"},
};

class SableyesTrickHouse extends Game {
	canLateJoin: boolean = true;
	canSelect: boolean = false;
	firstSelection: Player | false | undefined;
	points = new Map<Player, number>();
	previousDoors: string[] | null = null;
	roundSelections = new Map<Player, string>();
	roundDoors: string[] = [];
	trapChosen: boolean = false;

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (this.trapChosen || this.round > 1) {
			player.say("Sorry, the late-join period has ended.");
			return false;
		}
		return true;
	}

	onStart(): void {
		this.nextRound();
	}

	revealTrap(): void {
		const trap = this.sampleOne(this.roundDoors);
		const id = Tools.toId(trap);
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const choice = this.roundSelections.get(player);
			if (!choice) {
				this.eliminatePlayer(player, "You did not select a door!");
			} else if (choice === id) {
				this.eliminatePlayer(player, "You selected the trap door!");
			}
		}

		const text = "The trap was the **" + trap + " door**!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound(): void {
		this.canSelect = false;
		if (this.round > 1) {
			let firstSelection = true;
			this.roundSelections.forEach((door, player) => {
				if (firstSelection) {
					if (this.firstSelection === undefined) {
						this.firstSelection = player;
					} else {
						if (this.firstSelection && this.firstSelection !== player) this.firstSelection = false;
					}
					firstSelection = false;
				}
			});
		}

		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount < 2) return this.end();
		let roundDoors = this.sampleOne(doors);
		while (this.previousDoors && Tools.compareArrays(this.previousDoors, roundDoors)) {
			roundDoors = this.sampleOne(doors);
		}
		this.previousDoors = roundDoors;
		this.roundDoors = roundDoors.slice();
		if (remainingPlayerCount === 2) this.roundDoors.pop();
		this.roundSelections.clear();
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

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			if (this.firstSelection === winner) this.unlockAchievement(winner, achievements.escapeartist!);
			this.addBits(winner, 500);
		}
		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<SableyesTrickHouse>> = {
	select: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canSelect || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			if (this.roundSelections.has(this.players[user.id])) return false;
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
			if (this.getRemainingPlayerCount() === 2 && this.roundSelections.size) {
				if (choice === this.roundSelections.values().next().value) {
					player.say("You cannot select the same door as your final opponent!");
					return false;
				}
			}

			// if (!this.roundChoices.size) this.markFirstAction(player, 'firstChoice');
			this.roundSelections.set(player, choice);
			player.say("You have selected the " + this.roundDoors[match] + " door!");
			return true;
		},
	},
};

const tests: GameFileTests<SableyesTrickHouse> = {
	'should only allow one choice per round': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.canSelect = true;
			await runCommand('select', game.roundDoors[0], game.room, players[0].name);
			await runCommand('select', game.roundDoors[1], game.room, players[0].name);
			assertStrictEqual(Tools.toId(game.roundSelections.get(players[0])), Tools.toId(game.roundDoors[0]));
		},
	},
	'should eliminate users who pick the trap': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.offCommands(['select']);
			game.canSelect = true;
			await runCommand('select', game.roundDoors[0], game.room, players[0].name);
			await runCommand('select', game.roundDoors[1], game.room, players[1].name);
			await runCommand('select', game.roundDoors[2], game.room, players[2].name);
			game.revealTrap();
			assertStrictEqual(game.getRemainingPlayerCount(), 2);
		},
	},
	'should limit choices to given doors': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = addPlayers(game, 3);
			game.start();
			game.nextRound();
			game.canSelect = true;
			await runCommand('select', 'mocha', game.room, players[0].name);
			assertStrictEqual(game.roundSelections.has(players[0]), false);
			await runCommand('select', game.roundDoors[0], game.room, players[1].name);
			assertStrictEqual(game.roundSelections.has(players[1]), true);
		},
	},
};

export const game: IGameFile<SableyesTrickHouse> = {
	achievements,
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
