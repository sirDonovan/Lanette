import type { Player } from "../../room-activity";
import { Game } from "../../room-game";
import type { User } from "../../users";
import type { IGameFormat, IGameFile } from "../../types/games";
import type { Room } from "../../rooms";

export class HeadToHead extends Game {
	leftPromotedName: string = '';
	rightPromotedName: string = '';
	internalGame: boolean = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;
	leftPlayer!: Player;
	rightPlayer!: Player;

	room!: Room;

	setupChallenge(leftUser: User, rightUser: User, challengeFormat: IGameFormat): void {
		if (challengeFormat.inputOptions.points) {
			if (!challengeFormat.customizableOptions.points) {
				challengeFormat.customizableOptions.points = {
					min: 3,
					base: 0,
					max: 20
				};
			} else {
				challengeFormat.customizableOptions.points.min = 3;
			}
		}

		challengeFormat.options = Game.setOptions(challengeFormat, undefined, undefined);

		this.challengeFormat = challengeFormat;
		this.leftPlayer = this.createPlayer(leftUser)!;
		this.rightPlayer = this.createPlayer(rightUser)!;
		this.minPlayers = 2;
		this.name += " (" + challengeFormat.name + ")";

		this.originalModchat = this.room.modchat;
		this.say("/modchat +");
		if (!leftUser.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + leftUser.name);
			this.leftPromotedName = leftUser.id;
		}
		if (!rightUser.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + rightUser.name);
			this.rightPromotedName = rightUser.id;
		}

		this.start();
	}

	onStart(): void {
		const text = this.leftPlayer.name + " and " + this.rightPlayer.name + " are going head to head in a game of " +
			this.challengeFormat.nameWithOptions + "!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		});
		this.say(text);
	}

	onNextRound(): void {
		if (this.leftPlayer.eliminated) {
			this.say(this.leftPlayer.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		if (this.rightPlayer.eliminated) {
			this.say(this.rightPlayer.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}

		const game = Games.createChildGame(this.challengeFormat, this);
		game.internalGame = true;
		game.inheritPlayers(this.players);
		game.minPlayers = 2;

		const format = game.format as IGameFormat;
		if (!format.inputOptions.points) {
			if (format.challengePoints && format.challengePoints.onevsone) {
				format.options.points = format.challengePoints.onevsone;
			} else if (format.customizableOptions.points) {
				format.options.points = format.customizableOptions.points.max;
			} else if (format.defaultOptions && format.defaultOptions.includes('points')) {
				format.options.points = 10;
			}
		}

		game.sayHtml(game.getDescriptionHtml());
		game.signups();

		if (!format.options.freejoin) {
			this.timeout = setTimeout(() => game.start(), 5 * 1000);
		}
	}

	onChildEnd(winners: Map<Player, number>): void {
		const leftPlayerPoints = winners.get(this.leftPlayer) || 0;
		const rightPlayerPoints = winners.get(this.rightPlayer) || 0;
		this.leftPlayer.reset();
		this.rightPlayer.reset();

		let winner;
		if (leftPlayerPoints > rightPlayerPoints) {
			winner = this.leftPlayer;
		} else if (rightPlayerPoints > leftPlayerPoints) {
			winner = this.rightPlayer;
		}

		if (winner) {
			this.winner = winner;
		} else {
			this.say("No one wins!");
		}

		this.end();
	}

	resetModchatAndRanks(): void {
		this.say("/modchat " + this.originalModchat);
		if (this.leftPromotedName) this.say("/roomdeauth " + this.leftPromotedName);
		if (this.rightPromotedName) this.say("/roomdeauth " + this.rightPromotedName);
	}

	onEnd(): void {
		if (this.rightPlayer.eliminated || this.leftPlayer === this.winner) {
			this.say(this.leftPlayer.name + " has won the matchup!");
		} else if (this.leftPlayer.eliminated || this.rightPlayer === this.winner) {
			this.say(this.rightPlayer.name + " has won the matchup!");
		}

		this.resetModchatAndRanks();
	}

	onForceEnd(): void {
		this.resetModchatAndRanks();
	}
}

export const game: IGameFile<HeadToHead> = {
	class: HeadToHead,
	description: "Players compete head to head in a chosen format!",
	freejoin: true,
	name: "Head to Head",
};
