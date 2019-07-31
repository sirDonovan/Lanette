import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { IGameModeFile } from "../../types/games";
import { Guessing } from "../templates/guessing";

const name = 'Survival';
const description = 'Answer within the time limit to survive each round!';

type SurvivalThis = Guessing & Survival;

class Survival {
	currentPlayer: Player | null = null;
	readonly maxPlayers: number = 20;
	playerList: Player[] = [];
	readonly playerRounds = new Map<Player, number>();
	survivalRound: number = 0;

	readonly description: string;
	roundTime: number;

	constructor(game: Game) {
		if (game.id === 'abrasabilityswitch') {
			this.roundTime = 7 * 1000;
		} else {
			this.roundTime = 9 * 1000;
		}
		game.nameSuffixes.unshift(name);
		this.description = game.description + ' ' + description;

		if (game.defaultOptions) {
			const pointsIndex = game.defaultOptions.indexOf('points');
			if (pointsIndex !== -1) game.defaultOptions.splice(pointsIndex, 1);
			const freejoinIndex = game.defaultOptions.indexOf('freejoin');
			if (freejoinIndex !== -1) game.defaultOptions.splice(freejoinIndex, 1);
		}

		delete game.customizableOptions.points;
		delete game.customizableOptions.freejoin;
	}

	onStart(this: SurvivalThis) {
		this.nextRound();
	}

	onNextRound(this: SurvivalThis) {
		this.canGuess = false;
		if (this.currentPlayer) this.currentPlayer.eliminated = true;
		if (!this.playerList.length) {
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return;
			}
			this.survivalRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(this.getPlayerNames, null, "Round " + this.survivalRound));
			this.playerList = this.shufflePlayers();
			if (this.roundTime > 1000) this.roundTime -= 500;
		}
		let currentPlayer = this.playerList.shift();
		while (currentPlayer && currentPlayer.eliminated) {
			currentPlayer = this.playerList.shift();
		}
		if (!currentPlayer || currentPlayer.eliminated) {
			this.onNextRound();
			return;
		}
		this.setAnswers();
		const text = "**" + currentPlayer.name + "** you're up!";
		this.on(text, () => {
			this.currentPlayer = currentPlayer!;
			this.timeout = setTimeout(() => {
				this.on(this.hint, () => {
					this.canGuess = true;
					this.timeout = setTimeout(() => {
						if (this.currentPlayer) {
							this.say("Time's up! " + this.getAnswers());
							this.currentPlayer.eliminated = true;
							this.playerRounds.set(this.currentPlayer, this.survivalRound);
							this.currentPlayer = null;
						}
						this.nextRound();
					}, this.roundTime);
				});
				this.say(this.hint);
			}, 5 * 1000);
		});
		this.say(text);
	}

	onEnd(this: SurvivalThis) {
		const remainingPlayers = this.getRemainingPlayerCount();
		if (remainingPlayers) {
			this.say("**Winner" + (remainingPlayers > 1 ? "s" : "") + "**: " + this.getPlayerNames());
		} else {
			this.say("No winners this game!");
		}

		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) {
				const round = this.playerRounds.get(player);
				if (!round) continue;
				this.addBits(player, round * 10);
				continue;
			}
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}
	}
}

const commands: Dict<ICommandDefinition<Survival & Guessing>> = {
	guess: {
		command(target, room, user) {
			if (!this.canGuess || this.players[user.id] !== this.currentPlayer) return;
			if (this.checkAnswer && !this.checkAnswer(target)) return;
			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;
			if (this.getRemainingPlayerCount() === 1) return this.end();
			this.say('**' + user.name + '** advances to the next round! ' + this.getAnswers());
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
		},
	},
};
commands.g = {command: commands.guess.command};

const initialize = (game: Game) => {
	const mode = new Survival(game);
	const propertiesToOverride = Object.getOwnPropertyNames(mode).concat(Object.getOwnPropertyNames(Survival.prototype)) as (keyof Survival)[];
	for (let i = 0; i < propertiesToOverride.length; i++) {
		// @ts-ignore
		game[propertiesToOverride[i]] = mode[propertiesToOverride[i]];
	}

	for (const command in commands) {
		if (command in game.commands) {
			for (const i in game.commands) {
				if (game.commands[i].command === game.commands[command].command) {
					// @ts-ignore
					game.commands[i] = commands[command];
				}
			}
		} else {
			// @ts-ignore
			game.commands[command] = commands[command];
		}
	}
};

export const mode: IGameModeFile<Survival, Guessing> = {
	aliases: ['surv'],
	commands,
	description,
	initialize,
	name,
	naming: 'suffix',
};
