import type { ScriptedGame } from "../../room-game-scripted";
import { assert } from "../../test/test-tools";
import type { GameFileTests, IGameFormat, IGameModeFile, IModeInputProperties } from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const name = 'Prolix';
const description = 'You must provide the longest possible answer each round!';

type ProlixThis = QuestionAndAnswer & Prolix;

class Prolix {
	longestAnswersOnly: boolean = true;
	minimumAnswersPerHint: number = 2;

	static resolveInputProperties<T extends ScriptedGame>(format: IGameFormat<T>): IModeInputProperties {
		const namePrefixes: string[] = [];
		if (!format.name.includes(name)) namePrefixes.unshift(name);

		return {
			description: format.description + ' ' + description,
			namePrefixes,
		};
	}
}

const initialize = (game: QuestionAndAnswer): void => {
	const mode = new Prolix();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(Prolix.prototype)) as (keyof Prolix)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

};

const tests: GameFileTests<ProlixThis> = {
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
};

export const mode: IGameModeFile<Prolix, QuestionAndAnswer, ProlixThis> = {
	aliases: ['pro'],
	challengeSettings: {
		botchallenge: {
			enabled: true,
			options: ['speed'],
		},
		onevsone: {
			enabled: true,
			options: ['speed'],
		},
	},
	class: Prolix,
	description,
	initialize,
	name,
	naming: 'prefix',
	tests,
};
