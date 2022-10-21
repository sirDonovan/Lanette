import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { IGameFile, IGameFormat } from "../../types/games";
import type { User } from "../../users";

export class HeadToHead extends ScriptedGame {
	challengeOptions: Dict<string> = {};
	leftPlayer: Player | null = null;
	leftPromotedName: string = '';
	rightPlayer: Player | null = null;
	rightPromotedName: string = '';
	internalGame: boolean = true;
	managedPlayers = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;

	declare readonly room: Room;

	setupChallenge(leftUser: User, rightUser: User, challengeFormat: IGameFormat, options?: Dict<string>): void {
		if (challengeFormat.inputOptions.points) {
			if (!('points' in challengeFormat.customizableNumberOptions)) {
				challengeFormat.customizableNumberOptions.points = {
					min: 3,
					base: 0,
					max: 20,
				};
			} else {
				challengeFormat.customizableNumberOptions.points.min = 3;
			}
		}

		challengeFormat.resolvedInputProperties = ScriptedGame.resolveInputProperties(challengeFormat, undefined, challengeFormat.variant);

		this.challengeFormat = challengeFormat;
		this.leftPlayer = this.createPlayer(leftUser);
		this.rightPlayer = this.createPlayer(rightUser);
		this.minPlayers = 2;
		this.name += " (" + challengeFormat.nameWithOptions + ")";

		if (options) this.challengeOptions = options;

		this.originalModchat = this.room.modchat;
		this.room.setRoomModchat("+");
		if (!leftUser.hasRank(this.room, 'voice')) {
			this.room.roomVoice(leftUser.name);
			this.leftPromotedName = leftUser.id;
		}
		if (!rightUser.hasRank(this.room, 'voice')) {
			this.room.roomVoice(rightUser.name);
			this.rightPromotedName = rightUser.id;
		}

		this.start();
	}

	onStart(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("start() called without left and right players");

		const text = this.leftPlayer.name + " and " + this.rightPlayer.name + " are going head to head in a game of " +
			this.challengeFormat.nameWithOptions + "!";
		this.on(text, () => {
			this.setTimeout(() => this.nextRound(), 5 * 1000);
		});
		this.say(text);
	}

	onNextRound(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("nextRound() called without left and right players");

		if (this.leftPlayer.eliminated) {
			this.say(this.leftPlayer.name + " has left the game!");
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		if (this.rightPlayer.eliminated) {
			this.say(this.rightPlayer.name + " has left the game!");
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		}

		const game = Games.createChildGame(this.challengeFormat, this);
		if (!game) {
			this.say("An error occurred while starting the challenge.");
			this.deallocate(true);
			return;
		}

		game.internalGame = true;
		game.inheritPlayers(this.players);
		game.minPlayers = 2;

		if (!game.format.inputOptions.points) {
			if (game.format.challengeSettings && game.format.challengeSettings.onevsone && game.format.challengeSettings.onevsone.points) {
				game.options.points = game.format.challengeSettings.onevsone.points;
			} else if ('points' in game.format.customizableNumberOptions) {
				game.options.points = game.format.customizableNumberOptions.points.max;
			} else if (game.format.defaultOptions.includes('points')) {
				game.options.points = 10;
			}
		}

		game.sayUhtml(this.uhtmlBaseName + "-description", game.getDescriptionHtml());
		game.signups();
		game.loadChallengeOptions('onevsone', this.challengeOptions);

		if (!game.options.freejoin) {
			if (game.gameActionType) {
				game.sendJoinNotice(this.leftPlayer);
				game.sendJoinNotice(this.rightPlayer);
			}

			this.setTimeout(() => game.start(), game.gameActionType ? 10 * 1000 : 5 * 1000);
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
		if (this.originalModchat) this.room.setRoomModchat(this.originalModchat);
		if (this.leftPromotedName) this.room.roomDeAuth(this.leftPromotedName);
		if (this.rightPromotedName) this.room.roomDeAuth(this.rightPromotedName);
	}

	onEnd(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("end() called without left and right players");

		if (this.rightPlayer.eliminated || this.leftPlayer === this.winner) {
			this.say("**" + this.leftPlayer.name + "** wins the matchup!");
		} else if (this.leftPlayer.eliminated || this.rightPlayer === this.winner) {
			this.say("**" + this.rightPlayer.name + "** wins the matchup!");
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
