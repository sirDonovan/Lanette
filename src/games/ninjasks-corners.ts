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
		if (this.format.options.freejoin) {
			this.maxRound = 0;
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canTravel = false;
		if (this.round > 1 && !this.format.options.freejoin) {
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

		let color = this.sampleOne(colors);
		while (color === this.lastColor) {
			color = this.sampleOne(colors);
		}
		this.color = Tools.toId(color);
		this.lastColor = color;
		this.roundTravels.clear();
		if (!this.format.options.freejoin && this.roundTime > this.minRoundTime) this.roundTime -= 250;
		const html = this.getRoundHtml(players => this.format.options.freejoin ? this.getPlayerPoints(players) :
			this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const text = "The corner is **" + color + "**!";
				this.on(text, () => {
					this.canTravel = true;
					this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
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
			this.winners.set(player, 1);
			this.addBits(player, 250);
		}

		if (this.format.options.freejoin) this.convertPointsToBits(0);

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<NinjasksCorners> = {
	travel: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canTravel) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			const color = Tools.toId(target);
			if (!color) return false;
			if (this.format.options.freejoin) {
				if (color !== this.color) return false;
				let points = this.points.get(player) || 0;
				points++;
				this.points.set(player, points);
				if (points === this.format.options.points) {
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
				if (this.getRemainingPlayerCount() === 2 && color === this.color) this.nextRound();
			}
			return true;
		},
	},
};

export const game: IGameFile<NinjasksCorners> = {
	aliases: ["ninjasks", "nc"],
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "travel [color]"],
	commands,
	class: NinjasksCorners,
	customizableOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	defaultOptions: ['freejoin'],
	description: "Players try to travel to specified corners before time runs out!",
	formerNames: ["Corners"],
	name: "Ninjask's Corners",
	mascot: "Ninjask",
};
