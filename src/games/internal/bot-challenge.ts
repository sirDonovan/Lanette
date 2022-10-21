import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { IGameFile, IGameFormat } from "../../types/games";
import type { User } from "../../users";

export class BotChallenge extends ScriptedGame {
	challengeOptions: Dict<string> = {};
	challenger: Player | null = null;
	challengerPromotedName: string = '';
	childGame: ScriptedGame | null = null;
	defender: Player | null = null;
	internalGame: boolean = true;
	managedPlayers = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;
	declare readonly room: Room;

	setupChallenge(challenger: User, defender: User, challengeFormat: IGameFormat, options?: Dict<string>): void {
		this.challengeFormat = challengeFormat;
		this.defender = this.createPlayer(defender);
		this.challenger = this.createPlayer(challenger);
		this.minPlayers = 2;
		this.name += " (" + challengeFormat.nameWithOptions + ")";

		if (options) this.challengeOptions = options;

		const text = this.challenger!.name + " challenges " + this.defender!.name + " to a one vs. one game of " +
			challengeFormat.nameWithOptions + "!";
		this.on(text, () => this.acceptChallenge(Users.self));
		this.say(text);
	}

	acceptChallenge(user: User): boolean {
		if (this.started || !this.defender || !this.challenger) return false;
		if (user.id !== this.defender.id) {
			user.say("You are not the defender in the current one vs. one challenge.");
			return false;
		}

		const challenger = Users.get(this.challenger.name);
		if (!challenger) {
			this.say("The challenger must be in the room for the challenge to begin.");
			return false;
		}

		if (this.timeout) clearTimeout(this.timeout);

		this.originalModchat = this.room.modchat;
		this.room.setRoomModchat("+");
		if (!challenger.hasRank(this.room, 'voice')) {
			this.room.roomVoice(challenger.name);
			this.challengerPromotedName = challenger.id;
		}

		this.start();
		return true;
	}

	cancelChallenge(user: User): boolean {
		if (this.started || !this.challenger) return false;
		if (user.id !== this.challenger.id) {
			user.say("You are not the challenger in the current one vs. one challenge.");
			return false;
		}
		this.say(user.name + " cancelled their challenge!");
		this.forceEnd(user);
		return true;
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		if (!this.challenger || !this.defender) throw new Error("nextRound() called without challenger and defender");

		if (this.defender.eliminated) {
			this.say(this.defender.name + " has left the game!");
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		if (this.challenger.eliminated) {
			this.say(this.challenger.name + " has left the game!");
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		}

		const game = Games.createChildGame(this.challengeFormat, this);
		if (!game) {
			this.say("An error occurred while starting the challenge.");
			this.deallocate(true);
			return;
		}

		if (!game.botChallengeTurn) throw new Error(this.challengeFormat.name + " does not implement botChallengeTurn()");

		this.childGame = game;
		game.internalGame = true;
		game.inheritPlayers(this.players);
		game.minPlayers = 2;

		if (game.format.challengeSettings && game.format.challengeSettings.onevsone && game.format.challengeSettings.onevsone.points) {
			game.options.points = game.format.challengeSettings.onevsone.points;
		} else if ('points' in game.format.customizableNumberOptions) {
			game.options.points = game.format.customizableNumberOptions.points.max;
		} else if (game.format.defaultOptions.includes('points')) {
			game.options.points = 10;
		}

		game.sayUhtml(this.uhtmlBaseName + "-description", game.getDescriptionHtml());
		game.signups();
		game.loadChallengeOptions('botchallenge', this.challengeOptions);
		this.say('glhf');

		if (!game.options.freejoin) {
			if (game.gameActionType) {
				game.sendJoinNotice(this.challenger);
			}

			this.setTimeout(() => game.start(), game.gameActionType ? 10 * 1000 : 5 * 1000);
		}
	}

	runBotChallengeTurn(newAnswer: boolean): void {
		this.childGame!.botChallengeTurn!(this.defender!, newAnswer);
	}

	onChildHint(hint: string, answers: readonly string[], newAnswer: boolean): void {
		this.runBotChallengeTurn(newAnswer);
	}

	onChildPlayerTurn(player: Player): void {
		if (player === this.defender) this.runBotChallengeTurn(true);
	}

	onChildEnd(winners: Map<Player, number>): void {
		if (!this.challenger || !this.defender) throw new Error("onChildEnd() called without challenger and defender");

		const defenderPoints = winners.get(this.defender) || 0;
		const challengerPoints = winners.get(this.challenger) || 0;
		this.defender.reset();
		this.challenger.reset();

		let winner;
		if (defenderPoints > challengerPoints) {
			winner = this.defender;
		} else if (challengerPoints > defenderPoints) {
			winner = this.challenger;
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
		if (this.challengerPromotedName) this.room.roomDeAuth(this.challengerPromotedName);
	}

	updateLastChallengeTime(): void {
		if (this.challenger) Games.setLastChallengeTime('botchallenge', this.room, this.challenger.id, Date.now());
	}

	onEnd(): void {
		if (!this.challenger || !this.defender) throw new Error("onEnd() called without challenger and defender");

		if (this.challenger.eliminated || this.defender === this.winner) {
			this.say("**" + this.defender.name + "** wins the challenge!");
		} else if (this.defender.eliminated || this.challenger === this.winner) {
			this.say("**" + this.challenger.name + "** wins the challenge!");
		}

		this.resetModchatAndRanks();
		this.updateLastChallengeTime();

		this.say("gg");
	}

	onForceEnd(user?: User): void {
		this.resetModchatAndRanks();
		if (user && this.challenger && user.id === this.challenger.id) {
			this.updateLastChallengeTime();
		}
	}
}

export const game: IGameFile<BotChallenge> = {
	class: BotChallenge,
	description: "Players compete one vs. one in a chosen format!",
	freejoin: true,
	name: "Bot Challenge",
};
