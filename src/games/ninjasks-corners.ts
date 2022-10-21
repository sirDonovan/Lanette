import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "speedbooster";

const colors: string[] = ['Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple', 'Pink', 'Gray', 'Teal', 'Silver', 'Gold', 'Lavender',
	'Crimson', 'Scarlet', 'Magenta', 'Apricot', 'Cerulean', 'Amber', 'Cyan', 'Peach', 'Lime'];

class NinjasksCorners extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"speedbooster": {name: "Speed Booster", type: 'first', bits: 1000, description: 'travel first every round'},
	};

	canTravel: boolean = false;
	color: string = '';
	firstTravel: Player | false | undefined;
	lastColor: string = '';
	maxRound: number = 15;
	minRoundTime: number = 1.8 * 1000;
	points = new Map<Player, number>();
	roundTime: number = 4 * 1000;
	roundTravels = new Map<Player, string>();

	onSignups(): void {
		if (this.options.freejoin) {
			this.maxRound = 0;
			this.setTimeout(() => this.nextRound(), 5000);
		}
	}

	onStart(): void {
		this.nextRound();
	}

	checkRoundTravels(): void {
		if (!this.options.freejoin) {
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				if (this.roundTravels.get(player) !== this.color) this.eliminatePlayer(player, "You did not travel to the corner!");
			}

			let firstTravel = true;
			this.roundTravels.forEach((color, player) => {
				if (firstTravel) {
					if (this.firstTravel === undefined) {
						this.firstTravel = player;
					} else {
						if (this.firstTravel && this.firstTravel !== player) this.firstTravel = false;
					}
					firstTravel = false;
				}
			});

			if (this.getRemainingPlayerCount() < 2) return this.end();
		}

		this.nextRound();
	}

	onNextRound(): void {
		this.canTravel = false;

		let color = this.sampleOne(colors);
		while (color === this.lastColor) {
			color = this.sampleOne(colors);
		}
		this.color = Tools.toId(color);
		this.lastColor = color;

		this.roundTravels.clear();
		if (!this.options.freejoin && this.roundTime > this.minRoundTime) this.roundTime -= 250;

		const html = this.getRoundHtml(players => this.options.freejoin ? this.getPlayerPoints(players) :
			this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.setTimeout(() => {
				const text = "The corner is **" + color + "**!";
				this.on(text, () => {
					this.canTravel = true;
					if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint(color, [], true);
					this.setTimeout(() => this.checkRoundTravels(), this.getRoundTime());
				});
				this.say(text);
			}, this.sampleOne([4000, 5000, 6000]));
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			if (player === this.firstTravel) this.unlockAchievement(player, NinjasksCorners.achievements.speedbooster);
			this.winners.set(player, this.options.freejoin ? this.points.get(player)! : 1);
			this.addBits(player, 250);
		}

		if (this.options.freejoin) this.convertPointsToBits(0);

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundTravels.clear();
	}

	botChallengeTurn(botPlayer: Player, newAnswer: boolean): void {
		if (!newAnswer) return;

		this.setBotTurnTimeout(() => {
			const command = "travel";
			const answer = this.color.toLowerCase();
			const text = Config.commandCharacter + command + " " + answer;
			this.on(text, () => {
				botPlayer.useCommand(command, answer);
			});
			this.say(text);
		}, this.sampleOne(this.botChallengeSpeeds!));
	}
}

const commands: GameCommandDefinitions<NinjasksCorners> = {
	travel: {
		command(target, room, user) {
			if (!this.canTravel) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			const color = Tools.toId(target);
			if (!color) return false;
			if (this.options.freejoin) {
				if (color !== this.color) return false;

				if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);

				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);
				if (points === this.options.points) {
					for (const i in this.players) {
						if (this.players[i] !== player) this.players[i].eliminated = true;
					}
					this.end();
					return true;
				}
				this.nextRound();
			} else {
				// don't activate achievement if the player typos first
				this.roundTravels.delete(player);
				this.roundTravels.set(player, color);
				if (this.getRemainingPlayerCount() === 2 && color === this.color) this.checkRoundTravels();
			}
			return true;
		},
	},
};

export const game: IGameFile<NinjasksCorners> = {
	aliases: ["ninjasks", "nc"],
	challengeSettings: {
		botchallenge: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
		onevsone: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
	},
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "travel [color]"],
	commands,
	class: NinjasksCorners,
	customizableNumberOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	defaultOptions: ['freejoin'],
	description: "Players try to travel to specified corners before time runs out!",
	formerNames: ["Corners"],
	name: "Ninjask's Corners",
	mascot: "Ninjask",
};
