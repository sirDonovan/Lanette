import type { PRNGSeed } from "../lib/prng";
import { PRNG } from "../lib/prng";
import { assert, assertStrictEqual } from '../test/test-tools';
import type { GameFileTests, IGameFile } from "../types/games";
import type { PoolType } from './../workers/portmanteaus';
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BASE_NUMBER_OF_PORTS = 2;

export class PoliwrathsPortmanteaus extends QuestionAndAnswer {
	answerParts: Dict<string[]> = {};
	customPortCategories: string[] | null = null;
	customPortDetails: string[] | null = null;
	customPortTypes: PoolType[] | null = null;
	minLetters: number = 2;
	maxLetters: number = 4;
	ports: string[] = [];
	roundTime: number = 5 * 60 * 1000;
	usesWorkers: boolean = true;

	static loadData(): void {
		Games.getWorkers().portmanteaus.init();
	}

	async customGenerateHint(): Promise<void> {
		let numberOfPorts: number;
		if (this.customPortTypes) {
			numberOfPorts = this.customPortTypes.length;
		} else if (this.format.inputOptions.ports) {
			numberOfPorts = this.options.ports!;
		} else {
			numberOfPorts = BASE_NUMBER_OF_PORTS;
			if ('ports' in this.format.customizableNumberOptions) {
				numberOfPorts += this.random(this.format.customizableNumberOptions.ports.max - BASE_NUMBER_OF_PORTS + 1);
			}
		}
		const result = await Games.getWorkers().portmanteaus.search({
			customPortCategories: this.customPortCategories,
			customPortDetails: this.customPortDetails,
			customPortTypes: this.customPortTypes,
			numberOfPorts,
			minLetters: this.minLetters,
			maxLetters: this.maxLetters,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
		});

		if (this.ended) return;

		if (result === null) {
			this.say("An error occurred while generating a portmanteau.");
			this.deallocate(true);
			return;
		}

		if (!result.answers.length) {
			this.say("Invalid ports specified.");
			this.deallocate(true);
		} else {
			this.answers = result.answers;
			this.answerParts = result.answerParts;
			this.ports = result.ports;
			this.hint = "<b>" + result.ports.join(" ") + "</b>";
			this.prng.destroy();
			this.prng = new PRNG(result.prngSeed);
		}
	}

	getAnswers(givenAnswer?: string): readonly string[] {
		if (!givenAnswer) {
			if (!this.answers.length) return [];
			givenAnswer = this.answers[0];
		}

		return [givenAnswer.charAt(0).toUpperCase() + givenAnswer.substr(1) + " (" + this.answerParts[givenAnswer].join(" + ") + ")"];
	}

	checkAnswer(guess: string): string {
		let sanitizedGuess;
		let guessParts;
		if (guess.includes(',')) {
			guessParts = guess.split(',');
		} else if (guess.includes('+')) {
			guessParts = guess.split('+');
		}
		if (guessParts) {
			if (guessParts.length === this.ports.length) {
				let base = Tools.toId(guessParts[0]);
				guessParts.shift();
				for (const part of guessParts) {
					const current = Tools.toId(part);
					for (let l = this.maxLetters; l >= this.minLetters; l--) {
						if (l > base.length || l > current.length) continue;
						if (base.substr(-l) === current.substr(0, l)) {
							base += current.substr(l);
							break;
						}
					}
				}
				sanitizedGuess = base;
			}
		}
		if (!sanitizedGuess) sanitizedGuess = Tools.toId(guess);
		let match = '';
		for (const answer of this.answers) {
			if (sanitizedGuess === answer) {
				match = answer;
				break;
			}
		}
		return match;
	}
}

const tests: GameFileTests<PoliwrathsPortmanteaus> = {
	'should return proper values from Portmanteaus worker': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			this.timeout(15000);

			for (let i = format.customizableNumberOptions.ports.min; i <= format.customizableNumberOptions.ports.max; i++) {
				game.options.ports = i;
				game.answers = [];
				await game.onNextRound();
				assert(game.answers.length);
				assert(game.ports.length);
				for (const answer of game.answers) {
					assert(answer in game.answerParts);
				}
			}

			game.customPortTypes = ['Pokemon', 'Move'];
			game.customPortCategories = ['egggroup', 'type'];
			game.customPortDetails = ['Flying', 'Fire'];
			game.answers = [];
			await game.onNextRound();
			assert(game.answers.length);
			assert(game.ports.length);
			assertStrictEqual(game.answers.join(','), 'pelipperuption,swablueflare,pidoverheat,fletchinderuption,oricoriosensunnyday');
			for (const answer of game.answers) {
				assert(answer in game.answerParts);
			}
		},
	},
};

export const game: IGameFile<PoliwrathsPortmanteaus> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['poliwraths', 'ports'],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		onevsone: {
			enabled: true,
			points: 5,
		},
	}),
	canGetRandomAnswer: false,
	category: 'puzzle',
	class: PoliwrathsPortmanteaus,
	customizableNumberOptions: {
		ports: {min: 2, base: BASE_NUMBER_OF_PORTS, max: 4},
		points: {min: 5, base: 5, max: 10},
		teamPoints: {min: 10, base: 10, max: 10},
	},
	description: "Players think of portmanteaus that share 2-4 letters and fit the given parameters!",
	formerNames: ["Portmanteaus"],
	freejoin: true,
	name: "Poliwrath's Portmanteaus",
	mascot: "Poliwrath",
	minigameCommand: 'portmanteau',
	minigameCommandAliases: ['port'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a portmanteau (sharing 2-4 letters) that fits the " +
		"given parameters!",
	modes: ['collectiveteam', 'spotlightteam'],
	modeProperties: {
		'collectiveteam': {
			roundTime: 60 * 1000,
		},
		'spotlightteam': {
			roundTime: 60 * 1000,
		},
	},
	tests: Object.assign({}, questionAndAnswerGame.tests, tests),
});
