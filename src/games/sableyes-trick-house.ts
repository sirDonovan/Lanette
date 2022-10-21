import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assertStrictEqual, runCommand } from '../test/test-tools';
import type { GameCommandDefinitions, GameFileTests, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "escapeartist";

const doors: string[][] = [["Red", "Green", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"],
	["Diamond", "Pearl", "Platinum"], ["Land", "Sea", "Sky"], ["Time", "Space", "Distortion"], ["Creation", "Destruction", "Harmony"],
	["Sun", "Earth", "Moon"]];

class SableyesTrickHouse extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"escapeartist": {name: "Escape Artist", type: 'first', bits: 1000, description: "select a door first every round and win"},
	};

	canLateJoin: boolean = true;
	canSelect: boolean = false;
	firstSelection: Player | false | undefined;
	points = new Map<Player, number>();
	previousDoors: string[] | null = null;
	roundSelections = new Map<Player, string>();
	roundDoors: string[] = [];
	trapChosen: boolean = false;

	onAddPlayer(player: Player): boolean {
		if (this.trapChosen) {
			player.sayPrivateHtml("You must late-join before the trap door is chosen!");
			return false;
		}
		return true;
	}

	onStart(): void {
		this.nextRound();
	}

	revealTrap(): void {
		this.offCommands(['select']);
		if (this.canLateJoin) this.canLateJoin = false;

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
			this.setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	onNextRound(): void {
		this.canSelect = false;
		if (this.round > 1) {
			if (this.canLateJoin) this.canLateJoin = false;

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
			this.setTimeout(() => this.revealTrap(), 5 * 1000);
		});

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "You enter room #" + this.round + " and see the following doors: **" + Tools.joinList(this.roundDoors) + "**";
			this.on(text, () => {
				this.canSelect = true;
				this.setTimeout(() => this.revealTrap(), 30 * 1000);
			});
			this.setTimeout(() => this.say(text), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			if (this.firstSelection === winner) this.unlockAchievement(winner, SableyesTrickHouse.achievements.escapeartist);
			this.addBits(winner, 500);
		}
		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundSelections.clear();
	}
}

const commands: GameCommandDefinitions<SableyesTrickHouse> = {
	select: {
		command(target, room, user) {
			if (!this.canSelect || this.roundSelections.has(this.players[user.id])) return false;
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
		test(game): void {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();
			game.canSelect = true;
			runCommand('select', game.roundDoors[0], game.room, players[0].name);
			runCommand('select', game.roundDoors[1], game.room, players[0].name);
			assertStrictEqual(Tools.toId(game.roundSelections.get(players[0])), Tools.toId(game.roundDoors[0]));
		},
	},
	'should eliminate users who pick the trap': {
		test(game): void {
			const players = addPlayers(game, 4);
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
		test(game): void {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();
			game.canSelect = true;
			runCommand('select', 'mocha', game.room, players[0].name);
			assertStrictEqual(game.roundSelections.has(players[0]), false);
			runCommand('select', game.roundDoors[0], game.room, players[1].name);
			assertStrictEqual(game.roundSelections.has(players[1]), true);
		},
	},
};

export const game: IGameFile<SableyesTrickHouse> = {
	aliases: ["sableyes", "th"],
	category: 'luck',
	commandDescriptions: [Config.commandCharacter + "select [door]"],
	commands,
	class: SableyesTrickHouse,
	description: "Players make their way through various rooms while avoiding the trap doors!",
	formerNames: ["Trick House"],
	name: "Sableye's Trick House",
	mascot: "Sableye",
	tests,
};
