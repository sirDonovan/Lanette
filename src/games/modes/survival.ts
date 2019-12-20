import { CommandsDict } from "../../command-parser";
import { Player } from "../../room-activity";
import { DefaultGameOption, Game } from "../../room-game";
import { GameCommandReturnType, IGameFormat, IGameModeFile } from "../../types/games";
import { Guessing } from "../templates/guessing";

const name = 'Survival';
const description = 'Answer within the time limit to survive each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type SurvivalThis = Guessing & Survival;

class Survival {
	static setOptions<T extends Game>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]) {
		if (!format.name.includes(name)) nameSuffixes.unshift(name);
		format.description += ' ' + description;

		for (let i = 0; i < removedOptions.length; i++) {
			const index = format.defaultOptions.indexOf(removedOptions[i] as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[removedOptions[i]];
		}

		if (format.id === 'parasparameters') delete format.customizableOptions.params;
	}

	currentPlayer: Player | null = null;
	readonly maxPlayers: number = 20;
	playerList: Player[] = [];
	readonly playerRounds = new Map<Player, number>();
	survivalRound: number = 0;

	roundTime: number;

	constructor(game: Game) {
		if (game.id === 'abrasabilityswitch') {
			this.roundTime = 7 * 1000;
		} else if (game.id === 'parasparameters') {
			this.roundTime = 15 * 1000;
		} else {
			this.roundTime = 9 * 1000;
		}
	}

	onStart(this: SurvivalThis) {
		this.nextRound();
	}

	async onNextRound(this: SurvivalThis) {
		this.canGuess = false;
		if (!this.playerList.length) {
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return;
			}
			this.survivalRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(this.getPlayerNames, null, "Round " + this.survivalRound));
			this.playerList = this.shufflePlayers();
			if (this.survivalRound > 1 && this.roundTime > 1000) this.roundTime -= 500;
		}
		let currentPlayer = this.playerList.shift();
		while (currentPlayer && currentPlayer.eliminated) {
			currentPlayer = this.playerList.shift();
		}
		if (!currentPlayer || currentPlayer.eliminated) {
			this.onNextRound();
			return;
		}
		await this.setAnswers();
		const text = "**" + currentPlayer.name + "** you are up!";
		this.on(text, () => {
			this.currentPlayer = currentPlayer!;
			this.timeout = setTimeout(() => {
				const onHint = () => {
					this.canGuess = true;
					this.timeout = setTimeout(() => {
						if (this.currentPlayer) {
							this.say("Time is up! " + this.getAnswers(''));
							this.eliminatePlayer(this.currentPlayer, "You did not guess the answer in time!");
							this.playerRounds.set(this.currentPlayer, this.survivalRound);
							this.currentPlayer = null;
						}
						this.nextRound();
					}, this.roundTime);
				};
				if (this.htmlHint) {
					const uhtmlName = this.uhtmlBaseName + '-hint';
					this.onUhtml(uhtmlName, this.hint, onHint);
					this.sayUhtml(uhtmlName, this.hint);
				} else {
					this.on(this.hint, onHint);
					this.say(this.hint);
				}
			}, 5 * 1000);
		});
		this.say(text);
	}

	onEnd(this: SurvivalThis) {
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

		this.announceWinners();
	}
}

const commands: CommandsDict<Survival & Guessing, GameCommandReturnType> = {
	guess: {
		async asyncCommand(target, room, user) {
			if (!this.canGuess || this.players[user.id] !== this.currentPlayer) return false;
			const answer = await this.guessAnswer(this.players[user.id], target);
			if (!answer) return false;
			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;
			if (this.getRemainingPlayerCount() === 1) {
				this.end();
				return true;
			}
			this.say('**' + user.name + '** advances to the next round! ' + this.getAnswers(answer));
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
	},
};
commands.g = {
	asyncCommand: commands.guess.asyncCommand,
};

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
				if ((game.commands[command].asyncCommand && game.commands[i].asyncCommand === game.commands[command].asyncCommand) ||
					(game.commands[command].command && game.commands[i].command === game.commands[command].command)) {
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
	class: Survival,
	commands,
	description,
	initialize,
	name,
	naming: 'suffix',
	removedOptions,
};
