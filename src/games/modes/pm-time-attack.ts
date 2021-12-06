import type { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameFileTests, IGameFormat, IGameModeFile, IGameNumberOptionValues, IModeInputProperties
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";
import { TimeAttack, initialize as baseInitialize } from "./time-attack";

const BASE_POINTS = 100;

const name = 'PM Time Attack';
const description = 'Earn points based on how fast you answer correctly in PMs!';
const removedOptions: string[] = ['points'];

type PMTimeAttackThis = QuestionAndAnswer & PMTimeAttack;

class PMTimeAttack extends TimeAttack {
	pmGuessing: boolean = true;

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
}

const initialize = (game: QuestionAndAnswer): void => {
	if (game.getPointsForAnswer) throw new Error("Time Attack does not support games that require getPointsForAnswer()");

	baseInitialize(game);

	const mode = new PMTimeAttack();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(PMTimeAttack.prototype)) as (keyof PMTimeAttack)[];

	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

};

const tests: GameFileTests<PMTimeAttackThis> = {
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

export const mode: IGameModeFile<PMTimeAttack, QuestionAndAnswer, PMTimeAttackThis> = {
	aliases: ['pta', 'pmta', 'pmsta', 'tapm', 'tapms'],
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	class: PMTimeAttack,
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
	tests,
};
