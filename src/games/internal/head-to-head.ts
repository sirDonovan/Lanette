import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { IGameFile, IGameFormat } from "../../types/games";
import type { User } from "../../users";

export class HeadToHead extends ScriptedGame {
	leftPlayer: Player | null = null;
	leftPromotedName: string = '';
	rightPlayer: Player | null = null;
	rightPromotedName: string = '';
	internalGame: boolean = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;

	room!: Room;

	setupChallenge(leftUser: User, rightUser: User, challengeFormat: IGameFormat): void {
		if (challengeFormat.inputOptions.points) {
			if (!('points' in challengeFormat.customizableOptions)) {
				challengeFormat.customizableOptions.points = {
					min: 3,
					base: 0,
					max: 20,
				};
			} else {
				challengeFormat.customizableOptions.points.min = 3;
			}
		}

		challengeFormat.options = ScriptedGame.setOptions(challengeFormat, undefined, challengeFormat.variant);

		this.challengeFormat = challengeFormat;
		this.leftPlayer = this.createPlayer(leftUser)!;
		this.rightPlayer = this.createPlayer(rightUser)!;
		this.minPlayers = 2;
		this.name += " (" + challengeFormat.nameWithOptions + ")";

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
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("start() called without left and right players");

		const text = this.leftPlayer.name + " and " + this.rightPlayer.name + " are going head to head in a game of " +
			this.challengeFormat.nameWithOptions + "!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		});
		this.say(text);
	}

	onNextRound(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("nextRound() called without left and right players");

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

		if (!game.format.inputOptions.points) {
			if (game.format.challengePoints && game.format.challengePoints.onevsone) {
				game.format.options.points = game.format.challengePoints.onevsone;
			} else if ('points' in game.format.customizableOptions) {
				game.format.options.points = game.format.customizableOptions.points.max;
			} else if (game.format.defaultOptions.includes('points')) {
				game.format.options.points = 10;
			}
		}

		game.sayHtml(game.getDescriptionHtml());
		game.signups();

		if (!game.format.options.freejoin) {
			this.timeout = setTimeout(() => game.start(), 5 * 1000);
		}
	}

	onChildEnd(winners: Map<Player, number>): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("onChildEnd() called without left and right players");

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
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("end() called without left and right players");

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
