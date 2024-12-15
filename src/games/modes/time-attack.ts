import type { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameFileTests, IGameFormat, IGameModeFile, IGameNumberOptionValues, IModeInputProperties
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const BASE_POINTS = 100;

const name = 'Time Attack';
const description = 'Earn points based on how fast you answer correctly!';
const removedOptions: string[] = ['points'];

type TimeAttackThis = QuestionAndAnswer & TimeAttack;

export class TimeAttack {
	allowRepeatCorrectAnswers: boolean = true;
	readonly loserPointsToBits: number = 1;
	maxCorrectPlayersPerRound: number = 0;
	timeLimit: number = 20 * 60 * 1000;
	readonly winnerPointsToBits: number = 5;

	static resolveInputProperties<T extends ScriptedGame>(format: IGameFormat<T>,
		customizableNumberOptions: Dict<IGameNumberOptionValues>): IModeInputProperties {
		const namePrefixes: string[] = [];
		if (!format.name.includes(name)) namePrefixes.unshift(name);

		const defaultOptions = format.defaultOptions.slice();
		for (const option of removedOptions) {
			const index = defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) defaultOptions.splice(index, 1);

			delete customizableNumberOptions[option];
		}

		customizableNumberOptions.points = {
			min: BASE_POINTS,
			base: BASE_POINTS,
			max: BASE_POINTS,
		};

		return {
			customizableNumberOptions,
			defaultOptions,
			description: format.description + ' ' + description,
			namePrefixes,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async beforeNextRound(this: TimeAttackThis, newAnswer: boolean): Promise<boolean | string> {
		if (newAnswer) {
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(() => this.getPlayerPoints()));
		}
		return true;
	}

	getPointsForAnswer(this: TimeAttackThis, answer: string, timestamp: number): number {
		if (!this.hintTimestamp) return 0;

		const elapsedTime = timestamp - this.hintTimestamp;
		const points = (this.roundTime - elapsedTime) / 1000;
		if (points < 0) return 0;
		return points;
	}
}

export const initialize = (game: QuestionAndAnswer): void => {
	if (game.getPointsForAnswer) throw new Error("Time Attack does not support games that require getPointsForAnswer()");

	const mode = new TimeAttack();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(TimeAttack.prototype)) as (keyof TimeAttack)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

};

const tests: GameFileTests<TimeAttackThis> = {
	'it should have the necessary methods': {
		config: {
			async: true,
		},
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
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			await addPlayers(game);
			await game.start();
			await game.onNextRound();
			assert(game.answers.length);
			game.canGuess = true;
			runCommand(attributes.commands![0], game.answers[0], game.room, "Player 1");
			const player = game.players.player1;
			assert(player);
			assert(game.answers.length);
			assertStrictEqual(game.correctPlayers.length, 1);
			assert(game.correctPlayers.includes(player));
			runCommand(attributes.commands![0], game.answers[0], game.room, "Player 1");
			assertStrictEqual(game.correctPlayers.length, 1);
		},
	},
};

export const mode: IGameModeFile<TimeAttack, QuestionAndAnswer, TimeAttackThis> = {
	aliases: ['ta'],
	challengeSettings: {
		botchallenge: {
			enabled: true,
		},
		onevsone: {
			enabled: true,
		},
	},
	class: TimeAttack,
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
	tests,
};
