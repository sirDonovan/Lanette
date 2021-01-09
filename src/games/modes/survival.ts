import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameFormat, IGameModeFile
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const name = 'Survival';
const description = 'Answer within the time limit to survive each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type SurvivalThis = QuestionAndAnswer & Survival;

class Survival {
	currentPlayer: Player | null = null;
	readonly maxPlayers: number = 20;
	maxSurvivalRound: number = 10;
	playerList: Player[] = [];
	readonly playerRounds = new Map<Player, number>();
	survivalRound: number = 0;

	static setOptions<T extends ScriptedGame>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]): void {
		if (!format.name.includes(name)) nameSuffixes.unshift(name);
		format.description += ' ' + description;

		for (const option of removedOptions) {
			const index = format.defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[option];
		}

		if (format.id === 'parasparameters') {
			delete format.customizableOptions.params;
		} else if (format.id === 'magnetonsmashups') {
			delete format.customizableOptions.names;
		}
	}

	onStart(this: SurvivalThis): void {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	beforeNextRound(this: SurvivalThis): boolean | string {
		if (this.answers.length) return true;
		if (this.currentPlayer) {
			this.eliminatePlayer(this.currentPlayer, "You did not guess the answer in time!");
			this.playerRounds.set(this.currentPlayer, this.survivalRound);
			this.currentPlayer = null;
		}

		if (!this.playerList.length || !this.getRemainingPlayerCount(this.playerList)) {
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return false;
			}
			this.survivalRound++;
			if (this.survivalRound > this.maxSurvivalRound) {
				this.say("Time is up!");
				this.end();
				return false;
			}
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(players => this.getPlayerNames(players), null,
				"Round " + this.survivalRound));
			this.playerList = this.shufflePlayers();
			if (this.survivalRound > 1) this.increaseDifficulty();
		}

		const currentPlayer = this.playerList[0];
		this.playerList.shift();
		if (currentPlayer.eliminated) return this.beforeNextRound();

		this.currentPlayer = currentPlayer;
		return "**" + this.currentPlayer.name + "** you are up!";
	}

	onEnd(this: SurvivalThis): void {
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

	canGuessAnswer(this: SurvivalThis, player: Player): boolean {
		if (this.ended || !this.canGuess || !this.answers.length || player !== this.currentPlayer) return false;
		return true;
	}
}

const commandDefinitions: GameCommandDefinitions<SurvivalThis> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user, cmd): GameCommandReturnType {
			if (this.answerCommands && !this.answerCommands.includes(cmd)) return false;
			if (!this.canGuessAnswer(this.players[user.id])) return false;

			const player = this.players[user.id];
			const answer = this.guessAnswer(player, target);
			if (!answer || !this.canGuessAnswer(player)) return false;

			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;
			if (this.getRemainingPlayerCount() === 1) {
				this.end();
				return true;
			}

			this.say('**' + player.name + '** advances to the next round! ' + this.getAnswers(answer));
			this.answers = [];
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
		aliases: ['g'],
	},
};

const commands = CommandParser.loadCommandDefinitions(commandDefinitions);

const initialize = (game: QuestionAndAnswer): void => {
	const mode = new Survival();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(Survival.prototype)) as (keyof Survival)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

const tests: GameFileTests<SurvivalThis> = {
	'it should have the necessary methods': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			addPlayers(game);
			game.start();
			await game.onNextRound();
			assert(game.answers.length);
			game.increaseDifficulty();
			await game.onNextRound();
		},
	},
	'it should advance players who answer correctly': {
		config: {
			commands: [['guess'], ['g']],
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			addPlayers(game);
			game.start();
			await game.onNextRound();
			assert(game.answers.length);
			const currentPlayer = game.currentPlayer;
			assert(currentPlayer);
			game.canGuess = true;
			runCommand(game.answerCommands ? game.answerCommands[0] : attributes.commands![0], game.answers[0], game.room,
				currentPlayer.name);
			assert(!currentPlayer.eliminated);
			await game.onNextRound();
			assert(game.currentPlayer !== currentPlayer);
		},
	},
	'it should eliminate players who do not answer correctly': {
		config: {
			commands: [['guess'], ['g']],
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			addPlayers(game);
			game.start();
			await game.onNextRound();
			assert(game.answers.length);
			const currentPlayer = game.currentPlayer;
			assert(currentPlayer);
			game.canGuess = true;
			runCommand(game.answerCommands ? game.answerCommands[0] : attributes.commands![0], 'mocha', game.room, currentPlayer.name);
			// answers cleared when time runs out
			game.answers = [];
			await game.onNextRound();
			assert(currentPlayer.eliminated);
		},
	},
};

export const mode: IGameModeFile<Survival, QuestionAndAnswer, SurvivalThis> = {
	aliases: ['surv'],
	class: Survival,
	commands,
	description,
	initialize,
	name,
	naming: 'suffix',
	removedOptions,
	tests,
};
