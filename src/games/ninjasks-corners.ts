import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile, AchievementsDict, GameCommandReturnType } from "../types/games";

const colors: string[] = ['Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple', 'Pink', 'Gray', 'Teal', 'Silver', 'Gold', 'Lavender',
	'Crimson', 'Scarlet', 'Magenta', 'Apricot', 'Cerulean', 'Amber', 'Cyan', 'Peach', 'Lime'];

const achievements: AchievementsDict = {
	"speedbooster": {name: "Speed Booster", type: 'first', bits: 1000, description: 'travel first every round'},
};

class NinjasksCorners extends Game {
	canTravel: boolean = false;
	color: string = '';
	firstTravel: Player | false | undefined;
	lastColor: string = '';
	minRoundTime: number = 1.8 * 1000;
	points = new Map<Player, number>();
	roundLimit: number = 15;
	roundTime: number = 4 * 1000;
	roundTravels = new Map<Player, string>();

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
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

			if (this.getRemainingPlayerCount() < 2 || this.round > this.roundLimit) return this.end();
		}

		let color = this.sampleOne(colors);
		while (color === this.lastColor) {
			color = this.sampleOne(colors);
		}
		this.color = Tools.toId(color);
		this.lastColor = color;
		this.roundTravels.clear();
		if (!this.format.options.freejoin && this.roundTime > this.minRoundTime) this.roundTime -= 250;
		const html = this.getRoundHtml(this.format.options.freejoin ? this.getPlayerPoints : this.getPlayerNames);
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
			if (player === this.firstTravel) this.unlockAchievement(player, achievements.speedbooster!);
			this.winners.set(player, 1);
			this.addBits(player, 250);
		}

		if (this.format.options.freejoin) this.convertPointsToBits(0);

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<NinjasksCorners>> = {
	travel: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canTravel) return false;
			if (this.format.options.freejoin) {
				if (user.id in this.players) {
					if (this.players[user.id].eliminated) return false;
				} else {
					this.createPlayer(user);
				}
			} else {
				if (!(user.id in this.players) || this.players[user.id].eliminated) return false;
			}
			const player = this.players[user.id];
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
				this.roundTravels.set(player, color);
				if (this.getRemainingPlayerCount() === 2 && color === this.color) this.nextRound();
			}
			return true;
		},
	},
};

export const game: IGameFile<NinjasksCorners> = {
	achievements,
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
