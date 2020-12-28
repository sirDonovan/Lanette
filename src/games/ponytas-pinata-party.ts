import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

class PonytasPinataParty extends ScriptedGame {
	canHit: boolean = false;
	inactiveRoundLimit: number = 5;
	maxRound: number = 10;
	pinataHits: number = 0;
	points = new Map<Player, number>();
	roundHits = new Map<Player, number>();
	roundTimes: number[] = [4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000];

	onSignups(): void {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onMaxRound(): void {
		this.say("All Piñatas have been broken!");
	}

	onNextRound(): void {
		if (this.round > 1) {
			if (!this.pinataHits) {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			} else {
				if (this.inactiveRounds) this.inactiveRounds = 0;
			}
		}

		this.roundHits.clear();
		this.pinataHits = 0;
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const text = "A Piñata appeared!";
				this.on(text, () => {
					this.canHit = true;
					this.timeout = setTimeout(() => this.breakPinata(), this.sampleOne(this.roundTimes));
				});
				this.say(text);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	breakPinata(): void {
		this.say("The Piñata broke!");
		this.canHit = false;
		if (this.pinataHits === 0) {
			this.say("No one hit the Piñata this round!");
		} else {
			for (const id in this.players) {
				const player = this.players[id];
				const roundHits = this.roundHits.get(player);
				if (!roundHits) continue;
				let points = this.points.get(player) || 0;
				const earnedPoints = Math.floor(50 * roundHits / this.pinataHits);
				points += earnedPoints;
				this.points.set(player, points);
				player.say("You earned " + earnedPoints + " points! Your total is now " + points + ".");
			}
		}

		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onEnd(): void {
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

		this.winners.forEach((value, player) => {
			this.addBits(player, 500);
		});

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<PonytasPinataParty> = {
	hit: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canHit) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundHits.has(player)) return false;
			this.roundHits.set(player, this.pinataHits + 1);
			this.pinataHits++;
			return true;
		},
	},
};

export const game: IGameFile<PonytasPinataParty> = {
	aliases: ['ponytas', 'pinataparty', 'ppp'],
	class: PonytasPinataParty,
	commandDescriptions: [Config.commandCharacter + "hit"],
	commands,
	description: "Players try to hit the pinata before it explodes, but hitting later on gives more points!",
	freejoin: true,
	name: "Ponyta's Pinata Party",
	mascot: "Ponyta",
	scriptedOnly: true,
};
