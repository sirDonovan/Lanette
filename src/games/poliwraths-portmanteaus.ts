import { PRNG, PRNGSeed } from "../prng";
import { Room } from "../rooms";
import { assert, assertStrictEqual } from '../test/test-tools';
import { GameFileTests, IGameFile, IGameFormat } from "../types/games";
import * as PortmanteausWorker from './../workers/portmanteaus';
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_NUMBER_OF_PORTS = 2;
const name = "Poliwrath's Portmanteaus";
let loadedData = false;

export class PoliwrathsPortmanteaus extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		PortmanteausWorker.init();

		loadedData = true;
	}

	answerParts: Dict<string[]> = {};
	customPortCategories: string[] | null = null;
	customPortDetails: string[] | null = null;
	customPortTypes: PortmanteausWorker.PoolType[] | null = null;
	minLetters: number = 2;
	maxLetters: number = 4;
	ports: string[] = [];
	roundTime: number = 5 * 60 * 1000;

	async setAnswers() {
		let numberOfPorts: number;
		if (this.customPortTypes) {
			numberOfPorts = this.customPortTypes.length;
		} else if (this.format.inputOptions.ports) {
			numberOfPorts = this.format.options.ports;
		} else {
			numberOfPorts = BASE_NUMBER_OF_PORTS;
			if ((this.format as IGameFormat).customizableOptions.ports) numberOfPorts += this.random((this.format as IGameFormat).customizableOptions.ports.max - BASE_NUMBER_OF_PORTS + 1);
		}
		const result = await PortmanteausWorker.search({
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
		return "A possible portmanteau was __" + givenAnswer.charAt(0).toUpperCase() + givenAnswer.substr(1) + "__ (" + this.answerParts[givenAnswer].join(" + ") + ").";
	}

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
				for (let i = 0; i < guessParts.length; i++) {
					const current = Tools.toId(guessParts[i]);
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
		for (let i = 0; i < this.answers.length; i++) {
			if (sanitizedGuess === this.answers[i]) {
				match = this.answers[i];
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
		async test(game, format) {
			this.timeout(15000);
			const tiers = Object.keys(PortmanteausWorker.data.pool['Pokemon']['tier']);
			assert(tiers.length);
			for (let i = 0; i < tiers.length; i++) {
				assert(tiers[i].charAt(0) !== '(');
			}
			for (let i = format.customizableOptions.ports.min; i <= format.customizableOptions.ports.max; i++) {
				game.format.options.ports = i;
				await game.onNextRound();
				assert(game.answers.length);
				assert(game.ports.length);
				for (let i = 0; i < game.answers.length; i++) {
					assert(game.answers[i] in game.answerParts);
				}
			}

			game.customPortTypes = ['Pokemon', 'Move'];
			game.customPortCategories = ['egggroup', 'type'];
			game.customPortDetails = ['Flying', 'Fire'];
			await game.onNextRound();
			assert(game.answers.length);
			assert(game.ports.length);
			assertStrictEqual(game.answers.join(','), 'pelipperuption,swablueflare,pidoverheat,fletchinderuption');
			for (let i = 0; i < game.answers.length; i++) {
				assert(game.answers[i] in game.answerParts);
			}
		},
	},
};

export const game: IGameFile<PoliwrathsPortmanteaus> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['poliwraths', 'ports'],
	category: '',
	class: PoliwrathsPortmanteaus,
	customizableOptions: {
		ports: {min: 2, base: BASE_NUMBER_OF_PORTS, max: 4},
		points: {min: 5, base: 5, max: 10},
	},
	description: "Players think of portmanteaus that share 2-4 letters and fit the given parameters!",
	formerNames: ["Portmanteaus"],
	freejoin: true,
	name,
	mascot: "Poliwrath",
	minigameCommand: 'portmanteau',
	minigameCommandAliases: ['port'],
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a portmanteau (sharing 2-4 letters) that fits the given parameters!",
	modes: ['team'],
	tests: Object.assign({}, guessingGame.tests, tests),
	workers: [PortmanteausWorker],
});
