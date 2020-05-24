import { PRNG } from "../prng";
import type { PRNGSeed } from "../prng";
import type { Room } from "../rooms";
import { assert, assertStrictEqual } from '../test/test-tools';
import type { GameFileTests, IGameFile, IGameFormat } from "../types/games";
import type { User } from "../users";
import type { PoolType } from './../workers/portmanteaus';
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_NUMBER_OF_PORTS = 2;

export class PoliwrathsPortmanteaus extends Guessing {
	answerParts: Dict<string[]> = {};
	customPortCategories: string[] | null = null;
	customPortDetails: string[] | null = null;
	customPortTypes: PoolType[] | null = null;
	minLetters: number = 2;
	maxLetters: number = 4;
	ports: string[] = [];
	roundTime: number = 5 * 60 * 1000;
	usesWorkers: boolean = true;

	static loadData(room: Room | User): void {
		Games.workers.portmanteaus.loadData();
	}

	onInitialize(): void {
		super.onInitialize();

		const format = this.format as IGameFormat;
		if (format.mode) {
			if (format.mode.id === 'team') this.roundTime = 60 * 1000;
		}
	}

	async setAnswers(): Promise<void> {
		let numberOfPorts: number;
		if (this.customPortTypes) {
			numberOfPorts = this.customPortTypes.length;
		} else if (this.format.inputOptions.ports) {
			numberOfPorts = this.format.options.ports;
		} else {
			numberOfPorts = BASE_NUMBER_OF_PORTS;
			if ((this.format as IGameFormat).customizableOptions.ports) {
				numberOfPorts += this.random((this.format as IGameFormat).customizableOptions.ports.max - BASE_NUMBER_OF_PORTS + 1);
			}
		}
		const result = await Games.workers.portmanteaus.search({
			customPortCategories: this.customPortCategories,
			customPortDetails: this.customPortDetails,
			customPortTypes: this.customPortTypes,
			numberOfPorts,
			minLetters: this.minLetters,
			maxLetters: this.maxLetters,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
		});

		if (this.ended) return;

		if (!result.answers.length) {
			this.say("Invalid ports specified.");
			this.deallocate(true);
		} else {
			this.answers = result.answers;
			this.answerParts = result.answerParts;
			this.ports = result.ports;
			this.hint = "<b>" + result.ports.join(" ") + "</b>";
			this.prng = new PRNG(result.prngSeed);
		}
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		if (!givenAnswer) givenAnswer = this.answers[0];
		return "A possible portmanteau was __" + givenAnswer.charAt(0).toUpperCase() + givenAnswer.substr(1) + "__ (" +
			this.answerParts[givenAnswer].join(" + ") + ").";
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async checkAnswer(guess: string): Promise<string> {
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
			const portmanteausData = Games.workers.portmanteaus.loadData();

			const tiers = Object.keys(portmanteausData.pool['Pokemon']['tier']);
			assert(tiers.length);
			for (const tier of tiers) {
				assert(!tier.startsWith('('));
			}
			for (let i = format.customizableOptions.ports.min; i <= format.customizableOptions.ports.max; i++) {
				game.format.options.ports = i;
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
			assertStrictEqual(game.answers.join(','), 'pelipperuption,swablueflare,pidoverheat,fletchinderuption');
			for (const answer of game.answers) {
				assert(answer in game.answerParts);
			}
		},
	},
};

export const game: IGameFile<PoliwrathsPortmanteaus> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['poliwraths', 'ports'],
	category: 'puzzle',
	class: PoliwrathsPortmanteaus,
	customizableOptions: {
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
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a portmanteau (sharing 2-4 letters) that fits the given " +
		"parameters!",
	modes: ['team'],
	tests: Object.assign({}, guessingGame.tests, tests),
});
