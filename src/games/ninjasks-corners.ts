import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { DefaultGameOption, Game, IGameOptionValues  } from "../room-game";
import { IGameFile } from "../types/games";

const colors: string[] = ['Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple', 'Pink', 'Gray', 'Teal', 'Silver', 'Gold', 'Lavender', 'Crimson', 'Scarlet', 'Magenta', 'Apricot', 'Cerulean', 'Amber',
	'Cyan', 'Peach', 'Lime'];

class NinjasksCorners extends Game {
	canTravel: boolean = false;
	color: string = '';
	customizableOptions: Dict<IGameOptionValues> = {
		points: {min: 5, base: 5, max: 10},
	};
	defaultOptions: DefaultGameOption[] = ['freejoin'];
	// firstTravel: Player | null;
	lastColor: string = '';
	minRoundTime: number = 1.8 * 1000;
	points = new Map<Player, number>();
	roundLimit: number = 15;
	roundTime: number = 4 * 1000;
	roundTravels = new Map<Player, string>();

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	onStart() {
		this.nextRound();
	}

	onNextRound() {
		this.canTravel = false;
		if (this.round > 1 && !this.options.freejoin) {
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				if (this.roundTravels.get(player) !== this.color) player.eliminated = true;
			}
			/*
			let firstTravel = true;
			this.roundTravels.forEach((color, user) => {
				if (!(user.id in this.players)) return;
				if (firstTravel && !this.players[user.id].eliminated) {
					this.markFirstAction(this.players[user.id], 'firstTravel');
					firstTravel = false;
				}
			});
			*/
			if (this.getRemainingPlayerCount() < 2 || this.round > this.roundLimit) return this.end();
		}

		let color = this.sampleOne(colors);
		while (color === this.lastColor) {
			color = this.sampleOne(colors);
		}
		this.color = Tools.toId(color);
		this.lastColor = color;
		this.roundTravels.clear();
		if (!this.options.freejoin && this.roundTime > this.minRoundTime) this.roundTime -= 250;
		const html = this.getRoundHtml(this.options.freejoin ? this.getPlayerPoints : this.getPlayerNames);
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

	onEnd() {
		const len = this.getRemainingPlayerCount();
		if (len > 1) {
			this.say("We've reached the end of the game! **Winners**: " + this.getPlayerNames());
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				// if (player === this.firstTravel) Games.unlockAchievement(this.room, player, "Superspeed", this);
				this.winners.set(player, 1);
				this.addBits(player, 250);
			}
		} else if (len === 1) {
			const winner = this.getFinalPlayer();
			// if (winner === this.firstTravel) Games.unlockAchievement(this.room, winner, "Superspeed", this);
			this.winners.set(winner, 1);
			this.say("**Winner**: " + winner.name);
			this.addBits(winner, 250);
		} else {
			this.say("No one made it to the corner! No winners this game.");
		}
	}
}

const commands: Dict<ICommandDefinition<NinjasksCorners>> = {
	travel: {
		command(target, room, user) {
			if (!this.canTravel) return false;
			if (this.options.freejoin) {
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
			if (this.options.freejoin) {
				if (color !== this.color) return false;
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
				this.roundTravels.set(player, color);
				if (this.getRemainingPlayerCount() === 2 && color === this.color) this.nextRound();
			}
			return true;
		},
	},
};

export const game: IGameFile<NinjasksCorners> = {
	aliases: ["ninjasks", "nc"],
	commandDescriptions: [Config.commandCharacter + "travel [color]"],
	commands,
	class: NinjasksCorners,
	description: "Players try to travel to specified corners before time runs out!",
	formerNames: ["Corners"],
	name: "Ninjask's Corners",
	mascot: "Ninjask",
};
