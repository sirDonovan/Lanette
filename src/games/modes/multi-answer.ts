import type { Player } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption,
	GameFileTests, IGameFormat, IGameModeFile
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const BASE_POINTS = 20;
const MAX_CORRECT_ANSWERS = 3;

const name = 'Multi-Answer';
const description = 'Up to ' + MAX_CORRECT_ANSWERS + ' players can provide a unique answer each round!';
const removedOptions: string[] = ['points'];

type MultiAnswerThis = QuestionAndAnswer & MultiAnswer;

class MultiAnswer {
	cooldownBetweenRounds: number = 5 * 1000;
	checkScoreCapBeforeRound: boolean = true;
	readonly loserPointsToBits: number = 5;
	maxCorrectPlayersPerRound: number = MAX_CORRECT_ANSWERS;
	minimumAnswersPerHint: number = 2;
	readonly winnerPointsToBits: number = 25;

	static setOptions<T extends ScriptedGame>(format: IGameFormat<T>, namePrefixes: string[]): void {
		if (!format.name.includes(name)) namePrefixes.unshift(name);
		format.description += ' ' + description;

		for (const option of removedOptions) {
			const index = format.defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[option];
		}

		format.customizableOptions.points = {
			min: BASE_POINTS,
			base: BASE_POINTS,
			max: BASE_POINTS,
		};
	}

	beforeNextRound(this: MultiAnswerThis): boolean | string {
		if (!this.answers.length) {
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(() => this.getPlayerPoints()));
		}
		return true;
	}

	onIncorrectGuess(this: MultiAnswerThis, player: Player, guess: string): string {
		if (this.roundGuesses && this.checkAnswer(guess, this.guessedAnswers)) this.roundGuesses.delete(player);
		return "";
	}

	getPointsForAnswer(this: MultiAnswerThis): number {
		let answers = this.roundAnswersCount;
		if (answers > MAX_CORRECT_ANSWERS) answers = MAX_CORRECT_ANSWERS;
		return answers - this.correctPlayers.length;
	}
}

const initialize = (game: QuestionAndAnswer): void => {
	if (game.getPointsForAnswer) throw new Error("Multi-Answer does not support games that require getPointsForAnswer()");

	const mode = new MultiAnswer();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(MultiAnswer.prototype)) as (keyof MultiAnswer)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

};

const tests: GameFileTests<MultiAnswerThis> = {
	'it should have the necessary methods': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			await game.onNextRound();
			assert(game.answers.length);
			assert(game.roundTime);
		},
	},
	'it should not end the round when the answer is guessed': {
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
			game.canGuess = true;
			runCommand(attributes.commands![0], game.answers[0], game.room, "Player 1");
			const player = game.players['player1'];
			assert(player);
			assert(game.answers.length);
			assertStrictEqual(game.correctPlayers.length, 1);
			assert(game.correctPlayers.includes(player));
			runCommand(attributes.commands![0], game.answers[0], game.room, "Player 1");
			assertStrictEqual(game.correctPlayers.length, 1);
		},
	},
};

export const mode: IGameModeFile<MultiAnswer, QuestionAndAnswer, MultiAnswerThis> = {
	aliases: ['ma', 'multi'],
	class: MultiAnswer,
	description,
	initialize,
	name,
	naming: 'prefix',
	tests,
};
