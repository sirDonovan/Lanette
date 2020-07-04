import type { Player } from "../../room-activity";
import { Game } from "../../room-game";
import type { User } from "../../users";
import type { IGameFormat, IGameFile } from "../../types/games";
import type { Room } from "../../rooms";

export class OneVsOne extends Game {
	challengerPromotedName: string = '';
	challengedPromotedName: string = '';
	internalGame: boolean = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;
	challenged!: Player;
	challenger!: Player;

	room!: Room;

	acceptChallenge(user: User): boolean {
		if (this.started || !this.challenged || !this.challenger) return false;
		if (user.id !== this.challenged.id) {
			user.say("You are not the challenged user in the current one vs. one challenge.");
			return false;
		}

		const challenger = Users.get(this.challenger.name);
		if (!challenger) {
			this.say("The challenger must be in the room for the challenge to begin.");
			return false;
		}

		if (this.timeout) clearTimeout(this.timeout);

		this.originalModchat = this.room.modchat;
		this.say("/modchat +");
		if (!user.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + user.name);
			this.challengedPromotedName = user.id;
		}
		if (!challenger.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + challenger.name);
			this.challengerPromotedName = challenger.id;
		}

		this.start();
		return true;
	}

	rejectChallenge(user: User): boolean {
		if (this.started) return false;
		if (user.id !== this.challenged.id) {
			user.say("You are not the challenged user in the current one vs. one challenge.");
			return false;
		}
		this.say(user.name + " rejected the challenge!");
		this.forceEnd(user);
		return true;
	}

	cancelChallenge(user: User): boolean {
		if (this.started) return false;
		if (user.id !== this.challenger.id) {
			user.say("You are not the challenger in the current one vs. one challenge.");
			return false;
		}
		this.say(user.name + " cancelled their challenge!");
		this.forceEnd(user);
		return true;
	}

	onStart(): void {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		if (this.challenged.eliminated) {
			this.say(this.challenged.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		if (this.challenger.eliminated) {
			this.say(this.challenger.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}

		const game = Games.createChildGame(this.challengeFormat, this);
		game.internalGame = true;
		game.inheritPlayers(this.players);
		game.minPlayers = 2;

		const format = game.format as IGameFormat;
		if (format.challengePoints && format.challengePoints.onevsone) {
			format.options.points = format.challengePoints.onevsone;
		} else if (format.customizableOptions.points) {
			format.options.points = format.customizableOptions.points.max;
		} else if (format.defaultOptions && format.defaultOptions.includes('points')) {
			format.options.points = 10;
		}

		game.sayHtml(game.getDescriptionHtml());
		game.signups();

		if (!format.options.freejoin) {
			this.timeout = setTimeout(() => game.start(), 5 * 1000);
		}
	}

	onChildEnd(winners: Map<Player, number>): void {
		const challengedPoints = winners.get(this.challenged) || 0;
		const challengerPoints = winners.get(this.challenger) || 0;
		this.challenged.reset();
		this.challenger.reset();

		let winner;
		if (challengedPoints > challengerPoints) {
			winner = this.challenged;
		} else if (challengerPoints > challengedPoints) {
			winner = this.challenger;
		}

		if (winner) {
			this.winner = winner;
		} else {
			this.say("No one wins!");
		}

		this.timeout = setTimeout(() => this.end(), 5000);
	}

	resetModchatAndRanks(): void {
		this.say("/modchat " + this.originalModchat);
		if (this.challengerPromotedName) this.say("/roomdeauth " + this.challengerPromotedName);
		if (this.challengedPromotedName) this.say("/roomdeauth " + this.challengedPromotedName);
	}

	updateLastChallengeTime(): void {
		if (!(this.room.id in Games.lastOneVsOneChallengeTimes)) Games.lastOneVsOneChallengeTimes[this.room.id] = {};
		Games.lastOneVsOneChallengeTimes[this.room.id][this.challenger.id] = Date.now();
	}

	onEnd(): void {
		if (this.challenger.eliminated || this.challenged === this.winner) {
			this.say(this.challenged.name + " has won the challenge!");
		} else if (this.challenged.eliminated || this.challenger === this.winner) {
			this.say(this.challenger.name + " has won the challenge!");
		}

		this.resetModchatAndRanks();
		this.updateLastChallengeTime();
	}

	onForceEnd(user?: User): void {
		this.resetModchatAndRanks();
		if (user && user.id === this.challenger.id) {
			this.updateLastChallengeTime();
		}
	}
}

export const game: IGameFile<OneVsOne> = {
	class: OneVsOne,
	description: "Players compete one vs. one in a chosen format!",
	name: "One vs. One",
};
