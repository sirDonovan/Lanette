import type { ScriptedGame } from "../../room-game-scripted";
import { assert } from "../../test/test-tools";
import type { GameFileTests, IGameFormat, IModeInputProperties, IGameModeFile } from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const name = 'Abridged';
const description = 'You must provide the shortest possible answer each round!';

type AbridgedThis = QuestionAndAnswer & Abridged;

class Abridged {
	minimumAnswersPerHint: number = 2;
	shortestAnswersOnly: boolean = true;

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
	const mode = new Abridged();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(Abridged.prototype)) as (keyof Abridged)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

};

const tests: GameFileTests<AbridgedThis> = {
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

export const mode: IGameModeFile<Abridged, QuestionAndAnswer, AbridgedThis> = {
	aliases: ['abr', 'abridge'],
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
	class: Abridged,
	description,
	initialize,
	name,
	naming: 'prefix',
	tests,
};
